import type { PlanToday, Suggestion } from "@/lib/coach";
import { DIFFICULTY_LABEL, type Difficulty, type Duration } from "@/lib/generator/types";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { PROGRAM } from "@/lib/i18n/messages/program";

const km = (v: number, l: Locale) => formatNumber(l, v);

export const runLabel = (difficulty: Difficulty, duration: Duration) => `${DIFFICULTY_LABEL[difficulty]} ${duration}'`;

/** Label rencana: "Tempo 45'", "Long run 14 km", "Lomba 21,1 km". `exact`: judul sesi apa adanya ("Race pace 3×2 km"). */
export function planLabel(label: string, plan: PlanToday, exact = false, locale: Locale = "id"): string {
  const t = PROGRAM[locale].plan;
  if (plan.kind === "long") return t.long(km(plan.km ?? 0, locale));
  if (plan.kind === "race") return t.race(km(plan.km ?? 0, locale));
  return exact ? label : `${label} ${plan.duration ?? 45}'`;
}

/** Label saran, atau null bila saran sama dengan rencana. */
export function suggestionLabel(plan: PlanToday, s: Suggestion, locale: Locale = "id"): string | null {
  if (plan.kind === "long" || plan.kind === "race") {
    return s.longRunKm !== undefined ? PROGRAM[locale].plan.longEasy(km(s.longRunKm, locale), !!s.longRunEasy) : null;
  }
  if (!s.difficulty && !s.duration) return null;
  return runLabel(s.difficulty ?? plan.difficulty, s.duration ?? plan.duration ?? 45);
}

/** "Rencana: Tempo 45'. Saran: Easy 45'." atau "Rencana: Tempo 45'. Sesuai rencana." */
export function planLine(label: string, plan: PlanToday, s: Suggestion, exact = false, locale: Locale = "id"): string {
  return PROGRAM[locale].plan.line(planLabel(label, plan, exact, locale), suggestionLabel(plan, s, locale));
}
