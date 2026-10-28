/**
 * #1 Tren kebugaran CTL/ATL/Form (docs/INSIGHT.md §4). Murni: tanggal dari parameter, WIB.
 *
 * - Seri harian dari wellness intervals.icu: CTL (kebugaran 42 hari), ATL (kelelahan 7 hari), Form = CTL − ATL.
 * - Hari tanpa nilai tetap kosong, bukan nol; garis diputus di situ.
 * - CTL/ATL yang tidak dikirim 14 hari terakhir (aturan 0.14.3) → tidak digambar, diganti kalimat.
 * - Pita Form −10 sampai +5 hanya konteks netral, tanpa label "bahaya" dan tanpa saran (I3).
 */
import type { Wellness } from "@/lib/intervals/types";
import { availableSignals } from "@/lib/wellness-signals";
import { num1 } from "./format";
import { daysBetween, weekBuckets } from "./weeks";

export const FORM_BAND: [number, number] = [-10, 5];
/** Minimal hari terisi supaya tren layak digambar (2 minggu). */
export const MIN_FITNESS_DAYS = 14;
/** Perubahan CTL di bawah ini disebut stabil. */
const STABLE = 0.5;

export interface FitnessDay {
  date: string;
  ctl?: number;
  atl?: number;
  form?: number;
}

export interface FitnessSeries {
  days: FitnessDay[];
  /** Kalimat di atas grafik, atau alasan grafik tidak digambar. */
  summary: string;
  /** false → tampilkan `summary` saja, tanpa grafik. */
  drawable: boolean;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export function fitnessSeries(wellness: Wellness[], today: string, weeks: number): FitnessSeries {
  const from = weekBuckets(today, weeks)[0].start;
  const byDate = new Map(wellness.map((w) => [w.date, w]));
  const days = daysBetween(from, today).map((date): FitnessDay => {
    const w = byDate.get(date);
    const ctl = w?.ctl;
    const atl = w?.atl;
    return {
      date,
      ...(ctl !== undefined ? { ctl: r1(ctl) } : {}),
      ...(atl !== undefined ? { atl: r1(atl) } : {}),
      ...(ctl !== undefined && atl !== undefined ? { form: r1(ctl - atl) } : {}),
    };
  });

  if (!availableSignals(wellness, today).has("load")) {
    return { days, drawable: false, summary: "CTL/ATL tidak dikirim intervals.icu dalam 14 hari terakhir, jadi tren kebugaran belum bisa digambar." };
  }
  const filled = days.filter((d) => d.ctl !== undefined);
  if (filled.length < MIN_FITNESS_DAYS) {
    return { days, drawable: false, summary: "Belum ada data cukup untuk tren ini (butuh 2 minggu CTL)." };
  }

  const first = filled[0].ctl!;
  const last = filled.at(-1)!.ctl!;
  const delta = last - first;
  const trend =
    Math.abs(delta) < STABLE
      ? `CTL stabil di ${num1(last)} dalam ${weeks} minggu.`
      : `CTL ${delta > 0 ? "naik" : "turun"} ${num1(Math.abs(delta))} dalam ${weeks} minggu.`;
  const lastForm = [...days].reverse().find((d) => d.form !== undefined)?.form;
  return { days, drawable: true, summary: lastForm === undefined ? trend : `${trend} Form terakhir ${num1(lastForm)}.` };
}
