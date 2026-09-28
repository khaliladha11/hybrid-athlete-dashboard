import { addDays } from "@/lib/date";
import type { Activity, Wellness } from "@/lib/intervals/types";
import type { Difficulty } from "@/lib/generator/types";

export const HRV_DROP_RATIO = 0.85;
export const RHR_RISE_BPM = 5;
export const LONG_RUN_KM = 12;
export const LONG_RUN_SEC = 75 * 60;
export const HEAVY_LOAD_FACTOR = 1.5;
export const HEAVY_LOAD_MIN = 60;

export interface Readiness {
  /** true = ada sinyal kelelahan → sarankan turun satu level. */
  caution: boolean;
  reasons: string[];
  /** false jika data wellness/aktivitas tidak cukup untuk menilai. */
  hasData: boolean;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

export function assessReadiness(wellness: Wellness[], activities: Activity[], today: string): Readiness {
  const reasons: string[] = [];
  const todayW = wellness.find((w) => w.date === today);
  const baseline = wellness.filter((w) => w.date < today && w.date >= addDays(today, -7));

  const hrvAvg = avg(baseline.map((w) => w.hrv).filter((x): x is number => x !== undefined));
  if (todayW?.hrv && hrvAvg && todayW.hrv < hrvAvg * HRV_DROP_RATIO) {
    reasons.push(`HRV ${Math.round(todayW.hrv)} ms — ${Math.round((1 - todayW.hrv / hrvAvg) * 100)}% di bawah rata-rata 7 hari (${Math.round(hrvAvg)} ms).`);
  }

  const rhrAvg = avg(baseline.map((w) => w.restingHr).filter((x): x is number => x !== undefined));
  if (todayW?.restingHr && rhrAvg && todayW.restingHr >= rhrAvg + RHR_RISE_BPM) {
    reasons.push(`Resting HR ${Math.round(todayW.restingHr)} bpm — naik ${Math.round(todayW.restingHr - rhrAvg)} bpm dari rata-rata (${Math.round(rhrAvg)}).`);
  }

  const yesterday = addDays(today, -1);
  const recentLoads = activities
    .filter((a) => a.date && a.date >= addDays(today, -14) && a.date < yesterday)
    .map((a) => a.trainingLoad)
    .filter((x): x is number => x !== undefined);
  const loadAvg = avg(recentLoads);
  for (const a of activities.filter((x) => x.date === yesterday)) {
    const longRun = a.category === "run" && ((a.distanceKm ?? 0) >= LONG_RUN_KM || (a.movingTimeSec ?? 0) >= LONG_RUN_SEC);
    const heavy = !!a.trainingLoad && a.trainingLoad >= HEAVY_LOAD_MIN && (!loadAvg || a.trainingLoad >= loadAvg * HEAVY_LOAD_FACTOR);
    if (longRun) reasons.push(`Kemarin long run${a.distanceKm ? ` ${a.distanceKm.toFixed(1)} km` : ""} (${a.name}).`);
    else if (heavy) reasons.push(`Kemarin sesi berat: ${a.name} (load ${Math.round(a.trainingLoad!)}).`);
  }

  const hasData = !!todayW && (todayW.hrv !== undefined || todayW.restingHr !== undefined);
  return { caution: reasons.length > 0, reasons, hasData: hasData || activities.length > 0 };
}

export function lowerDifficulty(d: Difficulty): Difficulty {
  return d === "high" ? "moderate" : "easy";
}
