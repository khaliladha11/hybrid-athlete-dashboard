/**
 * #10 Tren kepatuhan mingguan (docs/INSIGHT.md §4, 0.15.1). Murni.
 *
 * - Model mingguan 0.14.3: status sesi dari `evaluateCompliance` (program aktif & arsip), dikelompokkan per minggu
 *   kalender Senin sampai Minggu, lari dan ST terpisah. Lomba dihitung lari.
 * - Dilewati tidak dihitung (keputusan atlet, bukan kegagalan). Tanpa "terlewat", tanpa streak.
 * - Minggu berjalan ditandai belum selesai dan tidak masuk ringkasan.
 */
import type { SessionResult } from "@/lib/program/compliance";
import { isRunKind, type PlannedSession } from "@/lib/program/sessions";
import { bucketIndex, weekBuckets, type WeekBucket } from "./weeks";
import type { Locale } from "@/lib/i18n/locale";
import { INSIGHT_LIB } from "@/lib/i18n/messages/insight-lib";


export interface ComplianceCount {
  terpenuhi: number;
  sebagian: number;
  belum: number;
  /** Tanpa sesi dilewati. */
  total: number;
}

export interface ComplianceWeek extends WeekBucket {
  run: ComplianceCount;
  st: ComplianceCount;
}

const zero = (): ComplianceCount => ({ terpenuhi: 0, sebagian: 0, belum: 0, total: 0 });

export function complianceWeeks(sessions: PlannedSession[], results: Map<string, SessionResult>, today: string, weeks: number): ComplianceWeek[] {
  const buckets = weekBuckets(today, weeks);
  const rows = buckets.map((b) => ({ ...b, run: zero(), st: zero() }));
  for (const s of sessions) {
    const i = bucketIndex(s.plannedDate, buckets);
    const status = results.get(s.id)?.status ?? "belum";
    if (i < 0 || status === "dilewati") continue;
    const c = isRunKind(s.kind) ? rows[i].run : rows[i].st;
    c[status] += 1;
    c.total += 1;
  }
  return rows;
}

export function complianceSummary(rows: ComplianceWeek[], locale: Locale = "id"): { drawable: boolean; text: string } {
  const L = INSIGHT_LIB[locale].compliance;
  const planned = rows.filter((r) => r.run.total + r.st.total > 0);
  if (!planned.length) return { drawable: false, text: L.noProgram };
  const done = planned.filter((r) => !r.current);
  if (!done.length) return { drawable: false, text: L.firstWeek };
  const sum = (k: "run" | "st", f: keyof ComplianceCount) => done.reduce((t, r) => t + r[k][f], 0);
  const part = (k: "run" | "st", label: string) => (sum(k, "total") ? L.part(label, sum(k, "terpenuhi"), sum(k, "total")) : null);
  const parts = [part("run", L.run), part("st", L.st)].filter(Boolean);
  const partial = sum("run", "sebagian") + sum("st", "sebagian");
  return {
    drawable: true,
    text: `${L.inWeeks(parts.join(", "), done.length)}${partial ? L.partial(partial) : ""}`,
  };
}
