import { CONDITIONS } from "@/lib/conditions";
import type { StrengthItem } from "@/lib/generator/types";
import { aboveLibrary } from "@/lib/load-bounds";
import type { Movement } from "@/lib/profile";
import { historyFor, type LogEntry } from "@/lib/progression";
import { latestPr, type PrEntry } from "@/lib/prs";

const kg = (v: number) => v.toLocaleString("id-ID");

/** Beban resep gerakan ini di atas rentang awal library (label `DI ATAS RENTANG AWAL`). */
export const isAboveLibrary = (m: Movement | undefined, it: StrengthItem) => !!m && it.load.kind === "load" && aboveLibrary(m.weight, it.load.max);

/** Penjelasan di detail gerakan: dari mana beban di atas rentang awal, dan batas mana yang berlaku. */
export function loadNote(m: Movement | undefined, it: StrengthItem, log: LogEntry[], prs: PrEntry[]): string | null {
  if (!m || it.load.kind !== "load" || !isAboveLibrary(m, it)) return null;
  const last = historyFor(log, m.name).find((e) => e.load !== undefined);
  const pr = latestPr(prs, m.name);
  const from = last ? `log terakhir ${kg(last.load!)} kg (${last.date})` : pr ? `PR ${kg(pr.loadKg)} kg (${pr.date})` : "riwayatmu";
  const cap = m.cap
    ? m.cap.source === "equipment"
      ? `batas alat ${kg(m.cap.kg)} kg`
      : m.cap.source === "safety"
        ? `batas keamanan ${kg(m.cap.kg)} kg karena ${m.cap.condition ? CONDITIONS[m.cap.condition].label : "kondisi aktif"}`
        : `batas library ${kg(m.cap.kg)} kg`
    : "rentang library";
  return `Beban ${kg(it.load.max)} kg di atas rentang awal library (${m.weight}) karena ${from}. Batas yang berlaku: ${cap}.`;
}
