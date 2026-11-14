/**
 * Hari H & saran lama program (docs/PROGRAM-HIDUP.md §4.10, 0.13.3). Murni: tanggal dari parameter (WIB), tanpa I/O.
 *
 * - Tabel **rekomendasi umum** (bukan bukti klinis) per jarak: minimum, rekomendasi, maksimum.
 * - Minimum dari data: simulasi kenaikan long run dengan aturan program yang sama (`nextLongRun`, cutback tiap
 *   minggu ke-4) dari long run terjauh asli sampai puncak program standar, ditambah taper.
 * - Band tanggal: tidak bisa (di bawah batas teknis taper + 2), merah, kuning, hijau, abu-abu (pre-Base).
 *   Semua saran tidak memblokir; hanya batas teknis yang membuat program tidak bisa disusun.
 * - Kesiapan (HM/FM), jarak antar lomba (FM), dan selisih VDOT bersifat informasi.
 */
import type { RaceResult } from "@/lib/athlete-settings";
import { addDays, formatDateId, startOfWeekMonday } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import { MIN_RAMP_KM, RACES, longRunPlan, nextLongRun, phaseCounts, type RaceTarget } from "@/lib/program";
import { vdot } from "@/lib/run-zones";
import { longestRunKm } from "./prediction";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { TIMELINE_TEXT } from "@/lib/i18n/messages/program-lib";

export interface TimelineRule {
  /** Minimum rekomendasi umum (minggu). FM: 12 bila sudah pernah menyelesaikan FM. */
  min: number;
  minCompleted?: number;
  rec: [number, number];
  /** Lebih dari ini → minggu pre-Base sebelum program inti. */
  max: number;
}

export const TIMELINE: Record<RaceTarget, TimelineRule> = {
  "5k": { min: 6, rec: [8, 10], max: 12 },
  "10k": { min: 8, rec: [10, 12], max: 14 },
  hm: { min: 10, rec: [12, 16], max: 20 },
  fm: { min: 16, minCompleted: 12, rec: [16, 20], max: 24 },
};

export type Band = "blocked" | "red" | "yellow" | "green" | "grey";

const DAY_MS = 86_400_000;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);
const floorHalf = (km: number) => Math.floor(km * 2) / 2;
const km = (v: number, locale: Locale = "id") => formatNumber(locale, v);

/** Batas teknis: taper + 2 minggu latihan. Di bawahnya program tidak bisa disusun. */
export const hardFloor = (race: RaceTarget) => RACES[race].taperWeeks + 2;

/** Jumlah minggu (berbasis Senin) dari minggu mulai sampai minggu yang berisi Hari H, inklusif. */
export const weeksBetween = (startDate: string, raceDate: string) => dayDiff(startOfWeekMonday(raceDate), startOfWeekMonday(startDate)) / 7 + 1;

/** Long run puncak yang dicapai program panjang standar dari long run awal default. */
export const standardPeakKm = (race: RaceTarget) => Math.max(...longRunPlan(RACES[race]));

export interface DataMin {
  weeks: number;
  fromKm: number;
  targetKm: number;
  /** Tanpa long run 30 hari terakhir: dihitung dari long run awal default program. */
  noData: boolean;
}

/** Minggu yang dibutuhkan untuk menaikkan long run dari terjauh asli ke puncak program standar, ditambah taper. */
export function dataMinWeeks(race: RaceTarget, rawLongestKm: number | undefined): DataMin {
  const spec = RACES[race];
  const noData = !rawLongestKm || rawLongestKm <= 0;
  const fromKm = noData ? spec.startLongKm : floorHalf(Math.max(MIN_RAMP_KM, rawLongestKm));
  const targetKm = standardPeakKm(race);
  let level = fromKm;
  let w = 1;
  while (level < targetKm && w < 200) {
    w++;
    if (w % 4 !== 0) level = nextLongRun(level, targetKm);
  }
  return { weeks: w + spec.taperWeeks, fromKm, targetKm, noData };
}

export interface TimelineContext {
  race: RaceTarget;
  startDate: string;
  rawLongestKm?: number;
  /** Pernah menyelesaikan jarak ini (dari data atau pilihan atlet). */
  completedBefore: boolean;
  /** 1.2.0: bahasa alasan band. Bawaan Indonesia. */
  locale?: Locale;
}

export interface BandResult {
  band: Band;
  weeks: number;
  hardFloor: number;
  tableMin: number;
  dataMin: DataMin;
  effectiveMin: number;
  rec: [number, number];
  max: number;
  /** Senin minggu paling awal yang masih bisa disusun (batas teknis, bukan saran). */
  earliestDate: string;
  preBaseWeeks: number;
  /** Panjang program inti (tanpa pre-Base). */
  mainWeeks: number;
  reasons: string[];
}

/** Konteks yang tidak bergantung pada Hari H (dihitung sekali), lalu `bandOf(raceDate)` per tanggal. */
export function makeTimeline(ctx: TimelineContext) {
  const spec = RACES[ctx.race];
  const rule = TIMELINE[ctx.race];
  const floor = hardFloor(ctx.race);
  const tableMin = ctx.completedBefore && rule.minCompleted ? rule.minCompleted : rule.min;
  const dataMin = dataMinWeeks(ctx.race, ctx.rawLongestKm);
  const effectiveMin = Math.max(tableMin, dataMin.weeks);
  const earliestDate = addDays(startOfWeekMonday(ctx.startDate), (floor - 1) * 7);
  const range = `${rule.rec[0]}–${rule.rec[1]}`;
  const locale = ctx.locale ?? "id";
  const T = TIMELINE_TEXT[locale];

  const bandOf = (raceDate: string): BandResult => {
    const weeks = weeksBetween(ctx.startDate, raceDate);
    const base = { weeks, hardFloor: floor, tableMin, dataMin, effectiveMin, rec: rule.rec, max: rule.max, earliestDate };
    if (weeks < floor) {
      return {
        ...base,
        band: "blocked",
        preBaseWeeks: 0,
        mainWeeks: weeks,
        reasons: [T.blocked(spec.label, floor, spec.taperWeeks, formatDateId(earliestDate, locale))],
      };
    }
    const reasons: string[] = [];
    let band: Band;
    if (weeks > rule.max) {
      band = "grey";
      reasons.push(T.grey(rule.max, weeks - rule.max));
    } else if (weeks < effectiveMin) {
      band = "red";
      if (dataMin.weeks > tableMin) reasons.push(dataReason(ctx.race, dataMin, locale));
      else reasons.push(T.red(spec.label, tableMin, rule.minCompleted && !ctx.completedBefore ? rule.minCompleted : null, weeks));
    } else if (weeks < rule.rec[0]) {
      band = "yellow";
      reasons.push(T.yellow(range));
    } else {
      band = "green";
      reasons.push(weeks > rule.rec[1] ? T.longer(range) : T.matches(range));
    }
    if (dataMin.noData) reasons.push(T.noData(km(dataMin.fromKm, locale)));
    const preBaseWeeks = band === "grey" ? weeks - rule.max : 0;
    return { ...base, band, preBaseWeeks, mainWeeks: weeks - preBaseWeeks, reasons };
  };

  return { tableMin, dataMin, effectiveMin, earliestDate, rule, bandOf };
}

function dataReason(race: RaceTarget, d: DataMin, locale: Locale): string {
  const spec = RACES[race];
  const T = TIMELINE_TEXT[locale];
  const from = d.noData ? T.fromStart(km(d.fromKm, locale)) : T.fromLongest(km(d.fromKm, locale));
  return T.data(from, km(d.targetKm, locale), spec.taperWeeks, d.weeks);
}

/** "PRE-BASE 2 · BASE 4 · BUILD 5 · PEAK 4 · TAPER 3 MINGGU" (fase kosong tidak ditulis). */
export function phaseSummary(race: RaceTarget, mainWeeks: number, preBaseWeeks = 0, locale: Locale = "id"): string {
  const c = phaseCounts(RACES[race], mainWeeks);
  const parts: [string, number][] = [
    ["Pre-Base", preBaseWeeks],
    ["Base", c.base],
    ["Build", c.build],
    ["Peak", c.peak],
    ["Taper", c.taper],
  ];
  return `${parts.filter(([, n]) => n > 0).map(([l, n]) => `${l} ${n}`).join(" · ")} ${TIMELINE_TEXT[locale].weeks}`;
}

/** Rata-rata km lari per minggu dalam 4 minggu terakhir. */
export function weeklyAvgKm(activities: Activity[], today: string): number {
  const from = addDays(today, -27);
  const total = activities.filter((a) => a.category === "run" && a.date && a.date >= from && a.date <= today).reduce((s, a) => s + (a.distanceKm ?? 0), 0);
  return Math.round((total / 4) * 10) / 10;
}

/** Pernah menyelesaikan jarak ini: hasil lomba jarak itu, atau lari ≥ 90% jarak dalam data yang ada. */
export function completedDistance(race: RaceTarget, raceResults: RaceResult[], activities: Activity[]): boolean {
  const need = RACES[race].km * 0.9;
  return raceResults.some((r) => r.distance === race) || activities.some((a) => a.category === "run" && (a.distanceKm ?? 0) >= need);
}

export interface ReadinessCheck {
  label: string;
  met: boolean;
  value: string;
}

export interface Readiness {
  checks: ReadinessCheck[];
  notes: string[];
}

/** Syarat umum sebelum HM/FM (peringatan lunak). 5K/10K tanpa syarat. */
export function readiness(race: RaceTarget, activities: Activity[], raceResults: RaceResult[], today: string, locale: Locale = "id"): Readiness {
  const T = TIMELINE_TEXT[locale];
  if (race === "5k" || race === "10k") return { checks: [], notes: [] };
  const avg = weeklyAvgKm(activities, today);
  const longest = longestRunKm(activities, today) ?? 0;
  const minAvg = race === "hm" ? 25 : 24;
  const checks: ReadinessCheck[] = [
    { label: race === "hm" ? T.avgHm : T.avgFm, met: avg >= minAvg, value: `${km(avg, locale)} km` },
    { label: T.longest, met: longest >= 10, value: `${km(longest, locale)} km` },
  ];
  const notes: string[] = [];
  if (checks.some((c) => !c.met)) notes.push(T.further);
  if (race === "fm" && !completedDistance("hm", raceResults, activities) && !completedDistance("fm", raceResults, activities)) {
    notes.push(T.firstFm);
  }
  return { checks, notes };
}

/** Jarak antar lomba (hanya aturan FM yang punya sumber jelas). */
export function spacingWarnings(race: RaceTarget, raceResults: RaceResult[], startDate: string, raceDate: string, locale: Locale = "id"): string[] {
  const T = TIMELINE_TEXT[locale];
  const prev = raceResults.filter((r) => r.distance === "fm" && r.date < raceDate).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!prev) return [];
  const out: string[] = [];
  if (dayDiff(startDate, prev.date) < 14) {
    out.push(T.recover(formatDateId(prev.date, locale)));
  }
  if (race === "fm" && dayDiff(raceDate, prev.date) < 84) {
    out.push(T.spacing(formatDateId(prev.date, locale)));
  }
  return out;
}

/** VDOT yang dibutuhkan target waktu vs VDOT perkiraan sekarang (0.13.2). Informasi saja, tanpa penilaian. */
export function vdotGap(race: RaceTarget, goalSec: number, currentVdot: number | undefined): { required: number; current?: number } {
  const required = vdot(RACES[race].km * 1000, goalSec);
  return currentVdot === undefined ? { required } : { required, current: currentVdot };
}

/** Bentuk program dari mulai & Hari H: panjang inti + pre-Base (> Max). `null` bila di bawah batas teknis. */
export function programShape(race: RaceTarget, startDate: string, raceDate: string): { weeks: number; mainWeeks: number; preBaseWeeks: number } | null {
  const weeks = weeksBetween(startDate, raceDate);
  if (weeks < hardFloor(race)) return null;
  const preBaseWeeks = Math.max(0, weeks - TIMELINE[race].max);
  return { weeks, mainWeeks: weeks - preBaseWeeks, preBaseWeeks };
}
