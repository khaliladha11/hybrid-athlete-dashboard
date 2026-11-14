/**
 * Tren check-in di Insight bagian Tubuh (0.15.2). Murni. Seri harian nyeri shin dan kualitas tidur; hari tanpa
 * check-in (atau dilewati) tetap kosong, bukan nol.
 */
import { SHIN_EASY, hasValues, isLiveCheckin, type Checkin } from "@/lib/checkin";
import { num1 } from "./format";
import type { Locale } from "@/lib/i18n/locale";
import { INSIGHT_LIB } from "@/lib/i18n/messages/insight-lib";

import { daysBetween, weekBuckets } from "./weeks";

export interface CheckinDay {
  date: string;
  shin?: number;
  sleep?: number;
  soreness?: number;
  mood?: number;
}

export function checkinDays(list: Checkin[], today: string, weeks: number): CheckinDay[] {
  const by = new Map(list.filter((c) => isLiveCheckin(c) && hasValues(c)).map((c) => [c.date, c]));
  return daysBetween(weekBuckets(today, weeks)[0].start, today).map((date) => {
    const c = by.get(date);
    return { date, ...(c?.shin !== undefined ? { shin: c.shin } : {}), ...(c?.sleep !== undefined ? { sleep: c.sleep } : {}), ...(c?.soreness !== undefined ? { soreness: c.soreness } : {}), ...(c?.mood !== undefined ? { mood: c.mood } : {}) };
  });
}

export function checkinSummary(days: CheckinDay[], weeks: number, locale: Locale = "id"): { drawable: boolean; text: string } {
  const L = INSIGHT_LIB[locale].checkin;
  const filled = days.filter((d) => d.shin !== undefined || d.sleep !== undefined || d.soreness !== undefined || d.mood !== undefined);
  if (!filled.length) return { drawable: false, text: L.none(weeks) };
  const shin = filled.map((d) => d.shin).filter((v): v is number => v !== undefined);
  const sleep = filled.map((d) => d.sleep).filter((v): v is number => v !== undefined);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const parts = [L.count(filled.length, weeks)];
  if (shin.length) parts.push(L.shin(num1(avg(shin), locale), shin.filter((v) => v >= SHIN_EASY).length, SHIN_EASY));
  if (sleep.length) parts.push(L.sleep(num1(avg(sleep), locale)));
  return { drawable: filled.length >= 2, text: `${parts.join("; ")}.` };
}
