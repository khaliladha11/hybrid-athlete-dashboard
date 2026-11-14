import { addDays } from "@/lib/date";
import type { Activity, Wellness } from "@/lib/intervals/types";
import { hrvBaseline, hrvPersonalDrop, rhrBaseline, rhrPersonalLimit, type Baseline } from "@/lib/thresholds";
import type { Difficulty } from "@/lib/generator/types";
import { availableSignals, joinId, signalLabel } from "@/lib/wellness-signals";
import type { Locale } from "@/lib/i18n/locale";
import { COACH } from "@/lib/i18n/messages/coach";

export const HRV_DROP_RATIO = 0.85;
export const RHR_RISE_BPM = 5;
export const LONG_RUN_KM = 12;
export const LONG_RUN_SEC = 75 * 60;
export const HEAVY_LOAD_FACTOR = 1.5;
export const HEAVY_LOAD_MIN = 60;

export type ReadinessReason = "hrv" | "rhr" | "longRun" | "heavy";

export interface Readiness {
  /** true = ada sinyal kelelahan → sarankan turun satu level. */
  caution: boolean;
  reasons: string[];
  /** 1.2.0: jenis tiap alasan (sejajar dengan `reasons`), untuk judul saran tanpa mencocokkan teks. */
  reasonIds?: ReadinessReason[];
  /** false jika data wellness/aktivitas tidak cukup untuk menilai. */
  hasData: boolean;
  /** 0.14.3: sinyal yang dipakai, mis. "Kesiapan dihitung dari resting HR dan sesi kemarin." */
  basis: string;
  /** 0.15.2: sinyal wellness yang dipakai (label), untuk menyusun basis bersama check-in di client. */
  used: string[];
  /** 0.15.2: baseline 30 hari; aktif = ambang pribadi dipakai. */
  baselines: { hrv: Baseline; restingHr: Baseline };
}

/** Kalimat dasar kesiapan dari sinyal yang dipakai (+ check-in hari ini bila ada). */
export function readinessBasis(used: string[], checkin = false, locale: Locale = "id"): string {
  const t = COACH[locale].readiness;
  const parts = [...used, ...(checkin ? [t.checkin] : [])];
  return parts.length ? t.basis(joinId([...parts, t.yesterday], locale)) : t.noBasis;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

export function assessReadiness(wellness: Wellness[], activities: Activity[], today: string, locale: Locale = "id"): Readiness {
  const t = COACH[locale].readiness;
  const reasons: string[] = [];
  const reasonIds: ReadinessReason[] = [];
  const add = (id: ReadinessReason, text: string) => {
    reasons.push(text);
    reasonIds.push(id);
  };
  // Sinyal yang tidak dikirim jam dalam 14 hari terakhir tidak dipakai (0.14.3).
  const signals = availableSignals(wellness, today);
  const todayW = wellness.find((w) => w.date === today);
  const baseline = wellness.filter((w) => w.date < today && w.date >= addDays(today, -7));

  // Ambang pribadi 30 hari (0.15.2) menggantikan ambang umum bila datanya cukup.
  const hrvB = hrvBaseline(wellness, today);
  const rhrB = rhrBaseline(wellness, today);

  const hrvAvg = avg(baseline.map((w) => w.hrv).filter((x): x is number => x !== undefined));
  if (signals.has("hrv") && hrvB.active) {
    const drop = hrvPersonalDrop(wellness, today, hrvB);
    if (drop) add("hrv", t.hrvPersonal(drop.rollingMs, drop.floorMs));
  } else if (signals.has("hrv") && todayW?.hrv && hrvAvg && todayW.hrv < hrvAvg * HRV_DROP_RATIO) {
    add("hrv", t.hrvDrop(Math.round(todayW.hrv), Math.round((1 - todayW.hrv / hrvAvg) * 100), Math.round(hrvAvg)));
  }

  const rhrAvg = avg(baseline.map((w) => w.restingHr).filter((x): x is number => x !== undefined));
  const rhrLimit = rhrPersonalLimit(rhrB);
  if (signals.has("restingHr") && rhrLimit !== undefined) {
    if (todayW?.restingHr && todayW.restingHr >= rhrLimit) {
      add("rhr", t.rhrPersonal(Math.round(todayW.restingHr), Math.round(rhrLimit), Math.round(rhrB.mean!)));
    }
  } else if (signals.has("restingHr") && todayW?.restingHr && rhrAvg && todayW.restingHr >= rhrAvg + RHR_RISE_BPM) {
    add("rhr", t.rhrRise(Math.round(todayW.restingHr), Math.round(todayW.restingHr - rhrAvg), Math.round(rhrAvg)));
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
    if (longRun) add("longRun", t.longRun(a.distanceKm ? a.distanceKm.toFixed(1) : null, a.name));
    else if (heavy) add("heavy", t.heavy(a.name, Math.round(a.trainingLoad!)));
  }

  const hasData = !!todayW && (todayW.hrv !== undefined || todayW.restingHr !== undefined);
  const used = (["hrv", "restingHr"] as const).filter((s) => signals.has(s)).map((s) => signalLabel(s, locale));
  return {
    caution: reasons.length > 0,
    reasons,
    reasonIds,
    hasData: hasData || activities.length > 0,
    basis: readinessBasis(used, false, locale),
    used,
    baselines: { hrv: hrvB, restingHr: rhrB },
  };
}

export function lowerDifficulty(d: Difficulty): Difficulty {
  return d === "high" ? "moderate" : "easy";
}
