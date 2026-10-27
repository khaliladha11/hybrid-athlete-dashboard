/**
 * Baris Week Ledger per hari (0.14.1). Murni.
 *
 * - Lari: jumlah km per hari (seperti sebelumnya).
 * - ST: satu baris per sesi setelah dedupe (`dedupeStSessions`): sesi mode latihan "ST Lower" dengan durasinya,
 *   aktivitas strength intervals.icu tanpa pasangan "ST" dengan waktu geraknya. Total minggu tetap km lari.
 */
import { STRENGTH_TYPE_LABEL } from "./generator/types";
import type { Activity } from "./intervals/types";
import { dedupeStSessions, type StSession } from "./st-session";

export interface LedgerSt {
  label: string;
  minutes?: number;
}

export interface LedgerDay {
  date: string;
  /** Ada lari di hari ini (km bisa 0 bila jarak tidak tercatat). */
  runKm?: number;
  st: LedgerSt[];
}

export function ledgerDays(activities: Activity[], sessions: StSession[], from: string, to: string): LedgerDay[] {
  const by = new Map<string, LedgerDay>();
  const day = (d: string) => by.get(d) ?? by.set(d, { date: d, st: [] }).get(d)!;
  for (const a of activities) {
    if (a.category !== "run" || !a.date || a.date < from || a.date > to) continue;
    const d = day(a.date);
    d.runKm = (d.runKm ?? 0) + (a.distanceKm ?? 0);
  }
  for (const i of dedupeStSessions(sessions, activities)) {
    if (i.date < from || i.date > to) continue;
    const label = i.source === "local" ? `ST ${STRENGTH_TYPE_LABEL[i.session.type]}` : "ST";
    day(i.date).st.push({ label, ...(i.minutes ? { minutes: i.minutes } : {}) });
  }
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date));
}
