/**
 * Ambang pribadi (0.15.2, docs/INSIGHT.md #7, I5; persetujuan pemilik 2026-10-28). Murni: tanggal dari parameter.
 *
 * - HR lari berat: 90% LTHR lari dari intervals.icu (batas bawah zona 3 Friel; di bawahnya intensitas rendah dalam
 *   model 3 zona Seiler). Tanpa LTHR: 155 bpm (ambang umum).
 * - HRV: rata-rata 7 hari ln rMSSD di bawah rata-rata 30 hari − 0,5 SD (smallest worthwhile change, Plews dkk.
 *   2012, 2013). Aktif bila ≥ 30 hari bernilai HRV dalam 60 hari terakhir dan HRV tersedia (aturan 0.14.3).
 *   Sebelumnya: HRV hari ini < 85% rata-rata 7 hari.
 * - Resting HR: hari ini ≥ rata-rata 30 hari + 1 SD (minimal +3 bpm). Aktif bila ≥ 30 hari bernilai resting HR.
 *   Sebelumnya: ≥ rata-rata 7 hari + 5 bpm.
 * - "Aktif sejak" = hari setelah nilai ke-30 dalam data yang diambil (60 hari).
 */
import { addDays } from "./date";
import type { Wellness } from "./intervals/types";

export const HARD_RUN_HR_DEFAULT = 155;
export const LTHR_HARD_RATIO = 0.9;
export const BASELINE_DAYS = 30;
export const BASELINE_LOOKBACK_DAYS = 60;
export const HRV_SWC_SD = 0.5;
export const RHR_SD = 1;
export const RHR_MIN_RISE = 3;
export const ROLLING_DAYS = 7;

export interface HardRunThreshold {
  bpm: number;
  personal: boolean;
  lthr?: number;
}

/** Ambang HR lari berat dari LTHR lari (bpm, dibulatkan). */
export function hardRunThreshold(lthr: number | undefined): HardRunThreshold {
  if (!lthr || !Number.isFinite(lthr) || lthr < 100 || lthr > 220) return { bpm: HARD_RUN_HR_DEFAULT, personal: false };
  return { bpm: Math.round(lthr * LTHR_HARD_RATIO), personal: true, lthr: Math.round(lthr) };
}

export interface Baseline {
  /** Jumlah hari bernilai dalam 60 hari sebelum hari ini. */
  days: number;
  active: boolean;
  /** Tanggal ambang pribadi mulai berlaku (dalam data yang diambil). */
  since?: string;
  mean?: number;
  sd?: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

/** Baseline 30 nilai terakhir sebelum hari ini (`map` mengubah nilai, mis. ln untuk HRV). */
function baseline(wellness: Wellness[], today: string, pick: (w: Wellness) => number | undefined, map: (v: number) => number): Baseline {
  const from = addDays(today, -BASELINE_LOOKBACK_DAYS);
  const series = wellness
    .filter((w) => w.date >= from && w.date < today && pick(w) !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
  const days = series.length;
  if (days < BASELINE_DAYS) return { days, active: false };
  const values = series.slice(-BASELINE_DAYS).map((w) => map(pick(w)!));
  return { days, active: true, since: addDays(series[BASELINE_DAYS - 1].date, 1), mean: mean(values), sd: sdOf(values) };
}

export const hrvBaseline = (wellness: Wellness[], today: string) => baseline(wellness, today, (w) => (w.hrv && w.hrv > 0 ? w.hrv : undefined), Math.log);
export const rhrBaseline = (wellness: Wellness[], today: string) => baseline(wellness, today, (w) => w.restingHr, (v) => v);

/** HRV pribadi: rata-rata 7 hari ln rMSSD (hari ini termasuk) di bawah rata-rata 30 hari − 0,5 SD. */
export function hrvPersonalDrop(wellness: Wellness[], today: string, b: Baseline): { rollingMs: number; floorMs: number } | null {
  if (!b.active || b.mean === undefined || b.sd === undefined) return null;
  const from = addDays(today, -(ROLLING_DAYS - 1));
  const recent = wellness.filter((w) => w.date >= from && w.date <= today && w.hrv && w.hrv > 0).map((w) => Math.log(w.hrv!));
  if (!recent.length || !wellness.some((w) => w.date === today && w.hrv)) return null;
  const rolling = mean(recent);
  const floor = b.mean - HRV_SWC_SD * b.sd;
  return rolling < floor ? { rollingMs: Math.round(Math.exp(rolling)), floorMs: Math.round(Math.exp(floor)) } : null;
}

/** Batas resting HR pribadi: rata-rata 30 hari + maks(1 SD, 3 bpm). */
export const rhrPersonalLimit = (b: Baseline) => (b.active && b.mean !== undefined && b.sd !== undefined ? b.mean + Math.max(RHR_SD * b.sd, RHR_MIN_RISE) : undefined);

const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const day = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`)).replace(".", "");

/** Satu baris status ambang untuk ditampilkan. */
export function baselineStatus(label: string, b: Baseline): string {
  return b.active
    ? `${label}: ambang pribadi aktif sejak ${day(b.since!)} (rata-rata 30 hari).`
    : `${label}: masih memakai ambang umum (${b.days} dari ${BASELINE_DAYS} hari data).`;
}

export function hardRunStatus(t: HardRunThreshold): string {
  return t.personal
    ? `Lari berat: ≥ ${t.bpm} bpm (90% LTHR ${t.lthr} di intervals.icu).`
    : `Lari berat: ≥ ${t.bpm} bpm (ambang umum; isi LTHR lari di intervals.icu untuk ambang pribadi).`;
}

/** Baris status ambang untuk sinyal yang dikirim jam (sinyal yang tidak dikirim disebut, aturannya tidak dipakai). */
export function thresholdLines(o: { hard: HardRunThreshold; hrv: Baseline; restingHr: Baseline; hrvAvailable: boolean; rhrAvailable: boolean }): string[] {
  return [
    hardRunStatus(o.hard),
    o.hrvAvailable ? baselineStatus("HRV", o.hrv) : "HRV: tidak dikirim jam, aturan HRV tidak dipakai.",
    o.rhrAvailable ? baselineStatus("Resting HR", o.restingHr) : "Resting HR: tidak dikirim jam, aturan resting HR tidak dipakai.",
  ];
}
