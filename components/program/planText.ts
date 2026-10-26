import type { PlanToday, Suggestion } from "@/lib/coach";
import { DIFFICULTY_LABEL, type Difficulty, type Duration } from "@/lib/generator/types";

const km = (v: number) => v.toLocaleString("id-ID");

export const runLabel = (difficulty: Difficulty, duration: Duration) => `${DIFFICULTY_LABEL[difficulty]} ${duration}'`;

/** Label rencana: "Tempo 45'", "Long run 14 km", "Lomba 21,1 km". `exact`: judul sesi apa adanya ("Race pace 3×2 km"). */
export function planLabel(label: string, plan: PlanToday, exact = false): string {
  if (plan.kind === "long") return `Long run ${km(plan.km ?? 0)} km`;
  if (plan.kind === "race") return `Lomba ${km(plan.km ?? 0)} km`;
  return exact ? label : `${label} ${plan.duration ?? 45}'`;
}

/** Label saran, atau null bila saran sama dengan rencana. */
export function suggestionLabel(plan: PlanToday, s: Suggestion): string | null {
  if (plan.kind === "long" || plan.kind === "race") {
    return s.longRunKm !== undefined ? `Long run ${km(s.longRunKm)} km${s.longRunEasy ? ", pace easy" : ""}` : null;
  }
  if (!s.difficulty && !s.duration) return null;
  return runLabel(s.difficulty ?? plan.difficulty, s.duration ?? plan.duration ?? 45);
}

/** "Rencana: Tempo 45'. Saran: Easy 45'." atau "Rencana: Tempo 45'. Sesuai rencana." */
export function planLine(label: string, plan: PlanToday, s: Suggestion, exact = false): string {
  const sug = suggestionLabel(plan, s);
  return `Rencana: ${planLabel(label, plan, exact)}. ${sug ? `Saran: ${sug}.` : "Sesuai rencana."}`;
}
