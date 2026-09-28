import { PHASE_LABEL, type LoadPrescription, type RunStep, type RunWorkout, type StrengthItem, type StrengthWorkout, type Workout } from "./types";

export function formatMinutes(min: number): string {
  const totalSec = Math.round(min * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatLoad(load: LoadPrescription): string {
  if (load.kind === "bodyweight") return "Bodyweight";
  if (load.kind === "band") return `${load.band} Band`;
  const range = load.min === load.max ? `${load.min}` : `${load.min}–${load.max}`;
  return `${range} kg${load.perHand ? "/tangan" : ""}`;
}

export function formatVolume(it: StrengthItem): string {
  if (it.durationSec && it.phase !== "main") return `${formatSec(it.durationSec)}`;
  const per = it.durationSec ? formatSec(it.durationSec) : `${it.reps}`;
  return `${it.sets}×${per}`;
}

function formatSec(sec: number): string {
  return sec >= 60 && sec % 60 === 0 ? `${sec / 60} mnt` : sec >= 60 ? formatMinutes(sec / 60) : `${sec} dtk`;
}

function stepText(s: RunStep): string {
  const targets = [s.pace && s.pace !== "santai" ? `@ ${s.pace}` : "", s.hr ? `HR ${s.hr}` : "", s.rpe ? `RPE ${s.rpe}` : ""]
    .filter(Boolean)
    .join(", ");
  return `${s.durationMin}' ${s.label}${targets ? ` (${targets})` : ""}`;
}

/** Teks list ringkas (tanpa tabel) — siap tempel ke Strava/catatan HP. */
export function runToText(w: RunWorkout): string {
  const lines = [w.title];
  for (const phase of ["warmup", "main", "cooldown"] as const) {
    const blocks = w.blocks.filter((b) => b.phase === phase);
    if (!blocks.length) continue;
    lines.push("", PHASE_LABEL[phase]);
    for (const b of blocks) {
      if (b.repeat > 1) lines.push(`- ${b.repeat}× [${b.steps.map(stepText).join(" + ")}]`);
      else for (const s of b.steps) lines.push(`- ${stepText(s)}`);
    }
  }
  lines.push("", "Catatan", ...w.notes.map((n) => `- ${n}`));
  return lines.join("\n");
}

/** Struktur "Set" ala Huawei Health: Run [Time, Pace] & Rest [Time] × N. */
export function runToHuaweiSets(w: RunWorkout): string {
  const lines: string[] = [];
  let setNo = 0;
  for (const b of w.blocks) {
    const stepStr = (s: RunStep) => {
      const kind = s.kind === "run" ? "Run" : "Rest";
      const meta = s.kind === "run" && s.pace ? `, Pace ${s.pace.replace("/km", "")}` : "";
      return `${kind} [${formatMinutes(s.durationMin)}${meta}]`;
    };
    if (b.phase === "main") {
      lines.push(`Set ${++setNo}: ${b.steps.map(stepStr).join(" & ")} × ${b.repeat}`);
      continue;
    }
    const min = b.repeat * b.steps.reduce((sum, st) => sum + st.durationMin, 0);
    const pace = b.steps.find((st) => st.kind === "run")?.pace;
    const name = b.phase === "warmup" ? "Warm-up" : "Cool-down";
    lines.push(`${name} [${formatMinutes(min)}${pace ? `, Pace ${pace.replace("/km", "")}` : ""}]`);
  }
  return lines.join("\n");
}

export function strengthToText(w: StrengthWorkout): string {
  const lines = [w.title];
  for (const phase of ["warmup", "main", "cooldown"] as const) {
    const items = w.items.filter((i) => i.phase === phase);
    if (!items.length) continue;
    lines.push("", PHASE_LABEL[phase]);
    for (const it of items) {
      if (phase === "main") {
        const rest = it.sets > 1 ? `, rest ${formatSec(it.restSec)}` : "";
        lines.push(`- ${it.movement}: ${formatVolume(it)} @ ${formatLoad(it.load)}, RPE ${it.rpe}${rest}`);
      } else {
        lines.push(`- ${it.movement} ${formatVolume(it)}`);
      }
    }
  }
  lines.push("", "Catatan", ...w.notes.map((n) => `- ${n}`));
  return lines.join("\n");
}

export function workoutToText(w: Workout): string {
  return w.kind === "run" ? runToText(w) : strengthToText(w);
}
