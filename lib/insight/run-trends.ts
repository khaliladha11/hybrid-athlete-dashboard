/**
 * #2 Km mingguan 80/20 dan #3 easy run pace/HR/cadence (docs/INSIGHT.md §4). Murni: tanggal dari parameter, WIB.
 *
 * - Minggu Senin sampai Minggu (`weeks.ts`). Minggu berjalan ditandai dan tidak masuk rata-rata ringkasan.
 * - Easy/berat memakai `isHardRun` yang sama dengan coach. Kenaikan > 30% dari minggu sebelumnya (basis ≥ 5 km,
 *   konstanta coach) hanya penanda, bukan saran baru (I3).
 * - Minggu cutback program dan deload blok ditandai dari data perangkat (parameter).
 * - Easy run = lari tidak berat dan bukan long run (≥ 12 km). Median pace, HR, dan cadence dihitung hanya dari lari
 *   yang punya nilainya; minggu tanpa nilai tetap kosong.
 */
import { KM_INCREASE_LIMIT, MIN_BASE_KM, isHardRun, isLongRun } from "@/lib/coach";
import { blockContext } from "@/lib/generator/block";
import { cadenceTarget } from "@/lib/generator/run";
import { isEmptyActivity } from "@/lib/intervals/dedupe";
import { averageRunCadence } from "@/lib/intervals/summary";
import type { Activity } from "@/lib/intervals/types";
import type { Program } from "@/lib/program";
import { int, median, num1, paceTag } from "./format";
import { bucketIndex, weekBuckets, type WeekBucket } from "./weeks";

export interface EasyStats {
  runs: number;
  /** Median pace (detik/km) dari easy run yang punya jarak & waktu. */
  paceSec?: number;
  hr?: number;
  hrRuns: number;
  cadence?: number;
  cadenceRuns: number;
}

export interface RunWeek extends WeekBucket {
  km: number;
  easyKm: number;
  hardKm: number;
  runs: number;
  /** Perubahan km vs minggu sebelumnya (0,35 = +35%); kosong bila basis < 5 km. */
  change?: number;
  /** Kenaikan > 30%. */
  jump: boolean;
  cutback: boolean;
  deload: boolean;
  easy: EasyStats;
}

export interface Marks {
  /** Senin minggu cutback program. */
  cutback?: readonly string[];
  /** Senin minggu deload blok. */
  deload?: readonly string[];
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const isRun = (a: Activity) => a.category === "run" && !!a.date && !isEmptyActivity(a);

function paceOf(a: Activity): number | undefined {
  if (a.distanceKm && a.movingTimeSec) return a.movingTimeSec / a.distanceKm;
  return a.avgPaceSecPerKm || undefined;
}

function easyStats(runs: Activity[]): EasyStats {
  const easy = runs.filter((a) => !isHardRun(a) && !isLongRun(a));
  const paces = easy.map(paceOf).filter((p): p is number => !!p && p > 0);
  const hrs = easy.map((a) => a.avgHr).filter((v): v is number => !!v);
  const cads = easy.map((a) => a.cadenceSpm).filter((v): v is number => !!v);
  const pace = median(paces);
  const hr = median(hrs);
  const cad = median(cads);
  return {
    runs: easy.length,
    ...(pace !== undefined ? { paceSec: Math.round(pace) } : {}),
    ...(hr !== undefined ? { hr: Math.round(hr) } : {}),
    hrRuns: hrs.length,
    ...(cad !== undefined ? { cadence: Math.round(cad) } : {}),
    cadenceRuns: cads.length,
  };
}

/** Ringkasan lari per minggu untuk `weeks` minggu terakhir (lama → baru). */
export function runWeeks(activities: Activity[], today: string, weeks: number, marks: Marks = {}): RunWeek[] {
  // Satu minggu ekstra di depan sebagai pembanding kenaikan km minggu pertama.
  const buckets = weekBuckets(today, weeks + 1);
  const byWeek = buckets.map(() => [] as Activity[]);
  for (const a of activities) {
    if (!isRun(a) || a.date! > today) continue;
    const i = bucketIndex(a.date, buckets);
    if (i >= 0) byWeek[i].push(a);
  }
  const cut = new Set(marks.cutback ?? []);
  const del = new Set(marks.deload ?? []);
  const km = (xs: Activity[]) => xs.reduce((t, a) => t + (a.distanceKm ?? 0), 0);

  return buckets.slice(1).map((b, j) => {
    const runs = byWeek[j + 1];
    const total = km(runs);
    const hard = km(runs.filter(isHardRun));
    const prev = km(byWeek[j]);
    const change = prev >= MIN_BASE_KM ? Math.round((total / prev - 1) * 100) / 100 : undefined;
    return {
      ...b,
      km: r1(total),
      easyKm: r1(total - hard),
      hardKm: r1(hard),
      runs: runs.length,
      ...(change !== undefined ? { change } : {}),
      jump: change !== undefined && change > KM_INCREASE_LIMIT,
      cutback: cut.has(b.start),
      deload: del.has(b.start),
      easy: easyStats(runs),
    };
  });
}

/** Senin minggu cutback program (sudah termasuk pre-Base). */
export const cutbackStarts = (program: Pick<Program, "weeks"> | null | undefined): string[] =>
  (program?.weeks ?? []).filter((w) => w.cutback).map((w) => w.start);

/** Senin minggu deload blok periodisasi di rentang, bila program blok aktif. */
export function deloadStarts(buckets: WeekBucket[], blockStart: string | undefined, blockWeeks?: number): string[] {
  if (!blockStart) return [];
  return buckets.filter((b) => b.end >= blockStart && blockContext(b.end, blockStart, blockWeeks).deload).map((b) => b.start);
}

export interface Summary {
  drawable: boolean;
  text: string;
}

const NEED_TWO = "Belum ada data cukup untuk tren ini (butuh 2 minggu).";

/** Kalimat di atas grafik km mingguan. */
export function volumeSummary(rows: RunWeek[]): Summary {
  const withRuns = rows.filter((r) => r.runs > 0);
  if (!withRuns.length) return { drawable: false, text: `Belum ada lari tercatat dalam ${rows.length} minggu terakhir.` };
  if (withRuns.length < 2) return { drawable: false, text: NEED_TWO };
  const done = rows.filter((r) => !r.current);
  const total = done.reduce((t, r) => t + r.km, 0);
  const hard = done.reduce((t, r) => t + r.hardKm, 0);
  const avg = done.length ? total / done.length : 0;
  const parts = [`Rata-rata ${num1(avg)} km per minggu, ${int(total ? (hard / total) * 100 : 0)}% berat.`];
  const jumps = rows.filter((r) => r.jump).length;
  if (jumps) parts.push(`${jumps} minggu naik lebih dari 30%.`);
  return { drawable: true, text: parts.join(" ") };
}

export type EasyKey = "pace" | "hr" | "cadence";
export const easyValue = (r: RunWeek, k: EasyKey) => (k === "pace" ? r.easy.paceSec : k === "hr" ? r.easy.hr : r.easy.cadence);

/** Target cadence personal (aturan 0.8) dari rata-rata 14 hari terakhir. */
export const cadenceGoal = (activities: Activity[], today: string) => cadenceTarget(averageRunCadence(activities, today, 14)).target;

/** Kalimat di atas grafik easy run per seri. Minggu tanpa nilai tidak dihitung. */
export function easySummary(rows: RunWeek[], key: EasyKey, target?: number): Summary {
  const pts = rows.filter((r) => easyValue(r, key) !== undefined);
  if (!rows.some((r) => r.easy.runs > 0)) return { drawable: false, text: "Belum ada easy run dalam rentang ini." };
  if (!pts.length) {
    return { drawable: false, text: `Jam tidak mengirim ${key === "hr" ? "HR" : "cadence"} untuk easy run di rentang ini.` };
  }
  if (pts.length < 2) return { drawable: false, text: NEED_TWO };
  const a = easyValue(pts[0], key)!;
  const b = easyValue(pts.at(-1)!, key)!;
  if (key === "pace") {
    const d = Math.round(a - b);
    const how = Math.abs(d) < 3 ? "relatif sama" : `${Math.abs(d)} detik/km lebih ${d > 0 ? "cepat" : "lambat"}`;
    return { drawable: true, text: `Median pace easy ${paceTag(b)}/km, ${how} dibanding ${paceTag(a)}/km di awal rentang.` };
  }
  if (key === "hr") {
    return { drawable: true, text: a === b ? `Median HR easy tetap ${b} bpm.` : `Median HR easy dari ${a} menjadi ${b} bpm.` };
  }
  return { drawable: true, text: `Median cadence easy terakhir ${b} SPM${target ? `, target ${target} SPM` : ""}.` };
}
