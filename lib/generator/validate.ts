import { allMovementNames, findMovement, parseWeight, profile, type MovementLibrary } from "@/lib/profile";
import type { RunWorkout, StrengthWorkout } from "./types";
import { estimateStrengthMinutes, STABILITY_HIP } from "./meta";

export const DURATION_TOLERANCE_MIN = 2;
export const MAX_STRENGTH_RPE = 7;
export const REQUIRED_PREHAB = ["Tibialis Wall Raise", "Eccentric Calf Raise"];

/** Spine-Friendly Protocol: pola axial loading berat tanpa tumpuan yang dilarang. */
export const BANNED_MOVEMENT_PATTERNS: RegExp[] = [
  /conventional\s+deadlift/i,
  /back\s+squat/i,
  /front\s+squat/i,
  /overhead\s+squat/i,
  /good\s*morning/i,
  /jefferson/i,
  /standing\s+(barbell\s+)?overhead\s+press/i,
  /\bheavy\b/i,
];

export class WorkoutValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Workout tidak valid: ${issues.join("; ")}`);
    this.name = "WorkoutValidationError";
  }
}

// ---------------- Lari ----------------

export function runTotalMinutes(w: RunWorkout): number {
  return w.blocks.reduce((sum, b) => sum + b.repeat * b.steps.reduce((s, st) => s + st.durationMin, 0), 0);
}

export function validateRun(w: RunWorkout): string[] {
  const issues: string[] = [];
  const total = runTotalMinutes(w);
  if (Math.abs(total - w.duration) > DURATION_TOLERANCE_MIN) {
    issues.push(`Total durasi ${total}' tidak sesuai target ${w.duration}'`);
  }
  for (const phase of ["warmup", "main", "cooldown"] as const) {
    if (!w.blocks.some((b) => b.phase === phase)) issues.push(`Fase ${phase} tidak ada`);
  }
  for (const b of w.blocks) {
    if (!Number.isInteger(b.repeat) || b.repeat < 1) issues.push(`Repetisi blok "${b.title}" tidak valid`);
    for (const s of b.steps) {
      if (!(s.durationMin > 0)) issues.push(`Durasi langkah "${s.label}" harus > 0`);
    }
  }
  if (!w.notes.some((n) => /175–180 SPM/.test(n))) issues.push("Pengingat cadence 175–180 SPM hilang");
  if (!w.notes.some((n) => /rel kereta/i.test(n))) issues.push('Cue "rel kereta" hilang');
  return issues;
}

export function assertValidRun(w: RunWorkout): void {
  const issues = validateRun(w);
  if (issues.length) throw new WorkoutValidationError(issues);
}

// ---------------- Strength ----------------

export function isBannedMovement(name: string): boolean {
  return BANNED_MOVEMENT_PATTERNS.some((re) => re.test(name));
}

/**
 * Sanitizer: membuang gerakan yang tidak terdaftar/terlarang/non-aktif,
 * meng-clamp RPE ≤ 7 dan beban ke rentang library. Tidak memutasi input.
 */
export function sanitizeStrength(w: StrengthWorkout, lib: MovementLibrary = profile.movementLibrary): StrengthWorkout {
  const whitelist = allMovementNames(lib);
  const items = w.items
    .filter((it) => whitelist.has(it.movement) && !isBannedMovement(it.movement))
    .filter((it) => findMovement(it.movement, lib)?.available !== false)
    .map((it) => {
      const out = { ...it };
      if (out.rpe !== undefined) out.rpe = Math.min(MAX_STRENGTH_RPE, out.rpe);
      const m = findMovement(it.movement, lib);
      if (m && out.load.kind === "load") {
        const spec = parseWeight(m.weight);
        if (spec.kind === "load") {
          const clamp = (v: number) => Math.min(spec.max, Math.max(spec.min, v));
          out.load = { ...out.load, min: clamp(out.load.min), max: clamp(out.load.max) };
        } else {
          out.load = spec.kind === "band" ? { kind: "band", band: spec.options[0] } : { kind: "bodyweight" };
        }
      }
      return out;
    });
  return { ...w, items };
}

export function validateStrength(w: StrengthWorkout, lib: MovementLibrary = profile.movementLibrary): string[] {
  const issues: string[] = [];
  const whitelist = allMovementNames(lib);
  const mainNames = w.items.filter((i) => i.phase === "main").map((i) => i.movement);

  for (const it of w.items) {
    if (!whitelist.has(it.movement)) issues.push(`Gerakan "${it.movement}" tidak ada di movement library`);
    if (isBannedMovement(it.movement)) issues.push(`Gerakan "${it.movement}" melanggar Spine-Friendly Protocol`);
    if (findMovement(it.movement, lib)?.available === false) issues.push(`Gerakan "${it.movement}" belum diaktifkan`);
    if (it.rpe !== undefined && it.rpe > MAX_STRENGTH_RPE) issues.push(`RPE ${it.rpe} pada "${it.movement}" > ${MAX_STRENGTH_RPE}`);
    if (!(it.sets >= 1)) issues.push(`Set "${it.movement}" tidak valid`);
    if (!it.reps && !it.durationSec) issues.push(`"${it.movement}" tidak punya reps/durasi`);
    const m = findMovement(it.movement, lib);
    if (m && it.load.kind === "load") {
      const spec = parseWeight(m.weight);
      if (spec.kind !== "load" || it.load.max > spec.max || it.load.min > it.load.max) {
        issues.push(`Beban "${it.movement}" melebihi batas library (${m.weight})`);
      }
    }
  }

  if (w.type === "lower" || w.type === "fullBody") {
    for (const req of REQUIRED_PREHAB) {
      if (!mainNames.includes(req)) issues.push(`Prehab wajib "${req}" tidak ada`);
    }
    if (!mainNames.some((n) => STABILITY_HIP.includes(n))) issues.push("Tidak ada gerakan stabilitas panggul");
  }
  if (w.type === "upperPull" && mainNames[0] !== "Dead Hang") {
    issues.push("Upper Pull harus diawali progresi pull-up (Dead Hang)");
  }
  if (new Set(mainNames).size !== mainNames.length) issues.push("Ada gerakan duplikat di latihan inti");

  const est = estimateStrengthMinutes(w);
  if (Math.abs(est - w.duration) > DURATION_TOLERANCE_MIN) {
    issues.push(`Estimasi durasi ${est.toFixed(1)}' tidak sesuai target ${w.duration}'`);
  }
  return issues;
}

export function assertValidStrength(w: StrengthWorkout, lib?: MovementLibrary): void {
  const issues = validateStrength(w, lib);
  if (issues.length) throw new WorkoutValidationError(issues);
}
