import { allMovementNames, findMovement, parseWeight, profile, type MovementLibrary } from "@/lib/profile";
import type { ActiveRules } from "@/lib/conditions";
import type { RunWorkout, StrengthWorkout } from "./types";
import { estimateStrengthMinutes, STABILITY_HIP } from "./meta";

export const DURATION_TOLERANCE_MIN = 2;
export const MAX_STRENGTH_RPE = 7;
/** Prehab shin splints (default profil). Aturan yang berlaku diambil dari kondisi aktif (`rules.requiredLower`). */
export const REQUIRED_PREHAB = ["Tibialis Wall Raise", "Eccentric Calf Raise"];

/** Aturan validasi lari bergantung kondisi aktif. */
type RunRules = Pick<ActiveRules, "cadenceCue" | "crossoverCue">;
type StrengthRules = Pick<ActiveRules, "spineFriendly" | "requiredLower" | "hipStability" | "exclude">;

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

export function validateRun(w: RunWorkout, rules: RunRules = profile.rules): string[] {
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
  if (rules.cadenceCue && !w.notes.some((n) => /175–180 SPM/.test(n))) issues.push("Pengingat cadence 175–180 SPM hilang");
  if (rules.crossoverCue && !w.notes.some((n) => /rel kereta/i.test(n))) issues.push('Cue "rel kereta" hilang');
  return issues;
}

export function assertValidRun(w: RunWorkout, rules?: RunRules): void {
  const issues = validateRun(w, rules);
  if (issues.length) throw new WorkoutValidationError(issues);
}

// ---------------- Strength ----------------

export function isBannedMovement(name: string): boolean {
  return BANNED_MOVEMENT_PATTERNS.some((re) => re.test(name));
}

/** Nilai terdekat dari daftar beban yang bisa dirakit. */
function nearest(loads: number[], v: number): number {
  return loads.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), loads[0]);
}

/**
 * Sanitizer: membuang gerakan yang tidak terdaftar/terlarang/non-aktif,
 * meng-clamp RPE ≤ 7 dan beban ke rentang library (dan ke beban yang bisa
 * dirakit dari alat). Tidak memutasi input.
 */
export function sanitizeStrength(
  w: StrengthWorkout,
  lib: MovementLibrary = profile.movementLibrary,
  rules: StrengthRules = profile.rules,
): StrengthWorkout {
  const whitelist = allMovementNames(lib);
  const items = w.items
    .filter((it) => whitelist.has(it.movement) && !(rules.spineFriendly && isBannedMovement(it.movement)))
    .filter((it) => !rules.exclude.includes(it.movement))
    .filter((it) => findMovement(it.movement, lib)?.available !== false)
    .map((it) => {
      const out = { ...it };
      if (out.rpe !== undefined) out.rpe = Math.min(MAX_STRENGTH_RPE, out.rpe);
      const m = findMovement(it.movement, lib);
      if (m && out.load.kind === "load") {
        const spec = parseWeight(m.weight);
        if (spec.kind === "load") {
          const clamp = (v: number) => Math.min(spec.max, Math.max(spec.min, v));
          const snap = (v: number) => (m.loads?.length ? nearest(m.loads, clamp(v)) : clamp(v));
          const min = snap(out.load.min);
          out.load = { ...out.load, min, max: Math.max(min, snap(out.load.max)) };
        } else {
          out.load = spec.kind === "band" ? { kind: "band", band: spec.options[0] } : { kind: "bodyweight" };
        }
      }
      return out;
    });
  return { ...w, items };
}

export function validateStrength(
  w: StrengthWorkout,
  lib: MovementLibrary = profile.movementLibrary,
  rules: StrengthRules = profile.rules,
): string[] {
  const issues: string[] = [];
  const whitelist = allMovementNames(lib);
  const mainNames = w.items.filter((i) => i.phase === "main").map((i) => i.movement);
  const usable = (name: string) => {
    const m = findMovement(name, lib);
    return !!m && m.available !== false;
  };

  for (const it of w.items) {
    if (!whitelist.has(it.movement)) issues.push(`Gerakan "${it.movement}" tidak ada di movement library`);
    if (rules.spineFriendly && isBannedMovement(it.movement)) issues.push(`Gerakan "${it.movement}" melanggar Spine-Friendly Protocol`);
    if (rules.exclude.includes(it.movement)) issues.push(`Gerakan "${it.movement}" dihindari karena kondisi aktif`);
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
      if (m.loads?.length && ![it.load.min, it.load.max].every((v) => m.loads!.includes(v))) {
        issues.push(`Beban "${it.movement}" tidak bisa dirakit dari alat yang dimiliki`);
      }
    }
  }

  // Aturan kondisi hanya bisa ditagih bila gerakannya tersedia (alat/pilihan pengguna).
  if (w.type === "lower" || w.type === "fullBody") {
    for (const req of rules.requiredLower) {
      if (usable(req) && !mainNames.includes(req)) issues.push(`Gerakan wajib "${req}" tidak ada`);
    }
    if (rules.hipStability && STABILITY_HIP.some(usable) && !mainNames.some((n) => STABILITY_HIP.includes(n))) {
      issues.push("Tidak ada gerakan stabilitas panggul");
    }
  }
  if (w.type === "upperPull" && usable("Dead Hang") && mainNames[0] !== "Dead Hang") {
    issues.push("Upper Pull harus diawali progresi pull-up (Dead Hang)");
  }
  if (new Set(mainNames).size !== mainNames.length) issues.push("Ada gerakan duplikat di latihan inti");

  const est = estimateStrengthMinutes(w);
  // Sesi "limited" (library dipersempit di Setting) boleh lebih pendek, tapi tidak boleh lebih panjang.
  if (est > w.duration + DURATION_TOLERANCE_MIN || (!w.limited && est < w.duration - DURATION_TOLERANCE_MIN)) {
    issues.push(`Estimasi durasi ${est.toFixed(1)}' tidak sesuai target ${w.duration}'`);
  }
  return issues;
}

export function assertValidStrength(w: StrengthWorkout, lib?: MovementLibrary, rules?: StrengthRules): void {
  const issues = validateStrength(w, lib, rules);
  if (issues.length) throw new WorkoutValidationError(issues);
}
