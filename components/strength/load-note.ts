import { conditionLabel } from "@/lib/i18n/safety-text";
import type { StrengthItem } from "@/lib/generator/types";
import { aboveLibrary } from "@/lib/load-bounds";
import type { Movement } from "@/lib/profile";
import { historyFor, type LogEntry } from "@/lib/progression";
import { latestPr, type PrEntry } from "@/lib/prs";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { STRENGTH } from "@/lib/i18n/messages/strength";

/** Beban resep gerakan ini di atas rentang awal library (label `DI ATAS RENTANG AWAL`). */
export const isAboveLibrary = (m: Movement | undefined, it: StrengthItem) => !!m && it.load.kind === "load" && aboveLibrary(m.weight, it.load.max);

/** Penjelasan di detail gerakan: dari mana beban di atas rentang awal, dan batas mana yang berlaku. */
export function loadNote(m: Movement | undefined, it: StrengthItem, log: LogEntry[], prs: PrEntry[], locale: Locale = "id"): string | null {
  if (!m || it.load.kind !== "load" || !isAboveLibrary(m, it)) return null;
  const t = STRENGTH[locale].loadNote;
  const kg = (v: number) => formatNumber(locale, v);
  const last = historyFor(log, m.name).find((e) => e.load !== undefined);
  const pr = latestPr(prs, m.name);
  const from = last ? t.fromLog(kg(last.load!), last.date) : pr ? t.fromPr(kg(pr.loadKg), pr.date) : t.fromHistory;
  const cap = m.cap
    ? m.cap.source === "equipment"
      ? t.capEquipment(kg(m.cap.kg))
      : m.cap.source === "safety"
        ? t.capSafety(kg(m.cap.kg), m.cap.condition ? conditionLabel(m.cap.condition, locale) : t.activeCondition)
        : t.capLibrary(kg(m.cap.kg))
    : t.libraryRange;
  return t.note(kg(it.load.max), m.weight, from, cap);
}
