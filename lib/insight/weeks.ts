import { DAY_MONTH, formatDay } from "../i18n/format";
import type { Locale } from "../i18n/locale";
/**
 * Minggu Insight (docs/INSIGHT.md §3): Senin sampai Minggu WIB, sama dengan Week Ledger dan program. Murni: tanggal
 * dari parameter sebagai string YYYY-MM-DD (dihitung di UTC, jadi bebas DST).
 */
import { addDays, startOfWeekMonday } from "@/lib/date";

export type RangeWeeks = 6 | 12;
export const RANGE_OPTIONS: readonly RangeWeeks[] = [6, 12];

export interface WeekBucket {
  /** Senin. */
  start: string;
  /** Minggu. */
  end: string;
  /** Minggu berjalan: belum selesai, tidak dibandingkan seolah lengkap. */
  current: boolean;
}

/** `weeks` minggu terakhir sampai minggu `today`, lama → baru. */
export function weekBuckets(today: string, weeks: number): WeekBucket[] {
  const thisWeek = startOfWeekMonday(today);
  return Array.from({ length: Math.max(0, weeks) }, (_, i) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - i));
    return { start, end: addDays(start, 6), current: start === thisWeek };
  });
}

/** Indeks minggu yang memuat `date`, atau -1. */
export function bucketIndex(date: string | undefined, buckets: WeekBucket[]): number {
  if (!date) return -1;
  const start = startOfWeekMonday(date);
  return buckets.findIndex((b) => b.start === start);
}

/** Label sumbu minggu: tanggal Senin, mis. "5 Okt" / "5 Oct". */
export const weekLabel = (start: string, locale: Locale = "id") => formatDay(locale, start, DAY_MONTH).replace(".", "");

/** Hari dalam rentang (inklusif), lama → baru. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
