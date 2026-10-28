/**
 * Sinyal wellness yang benar-benar dikirim jam (0.14.3). Murni.
 *
 * Tidak semua jam mengirim semua sinyal ke intervals.icu (mis. integrasi Huawei tanpa HRV). Sinyal yang tidak punya
 * nilai sama sekali dalam 14 hari terakhir dianggap **tidak tersedia**: barisnya tidak ditampilkan dan aturan
 * readiness-nya dilewati, alih-alih menampilkan "·" terus-menerus.
 */
import { addDays } from "./date";
import type { Wellness } from "./intervals/types";

export const SIGNAL_WINDOW_DAYS = 14;

export type WellnessSignal = "hrv" | "restingHr" | "sleep" | "load";
export const WELLNESS_SIGNALS: readonly WellnessSignal[] = ["hrv", "restingHr", "sleep", "load"];

export const SIGNAL_LABEL: Record<WellnessSignal, string> = { hrv: "HRV", restingHr: "resting HR", sleep: "tidur", load: "CTL/ATL" };

const has: Record<WellnessSignal, (w: Wellness) => boolean> = {
  hrv: (w) => w.hrv !== undefined,
  restingHr: (w) => w.restingHr !== undefined,
  sleep: (w) => w.sleepSecs !== undefined,
  load: (w) => w.ctl !== undefined || w.atl !== undefined,
};

/** Sinyal yang punya minimal satu nilai di 14 hari terakhir (hari ini termasuk). */
export function availableSignals(wellness: Wellness[], today: string): Set<WellnessSignal> {
  const from = addDays(today, -(SIGNAL_WINDOW_DAYS - 1));
  const recent = wellness.filter((w) => w.date >= from && w.date <= today);
  return new Set(WELLNESS_SIGNALS.filter((s) => recent.some(has[s])));
}

/** "a", "a dan b", "a, b, dan c". */
export function joinId(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items.at(-1)}`;
}
