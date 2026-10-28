/**
 * Tren check-in di Insight bagian Tubuh (0.15.2). Murni. Seri harian nyeri shin dan kualitas tidur; hari tanpa
 * check-in (atau dilewati) tetap kosong, bukan nol.
 */
import { SHIN_EASY, hasValues, isLiveCheckin, type Checkin } from "@/lib/checkin";
import { num1 } from "./format";
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

export function checkinSummary(days: CheckinDay[], weeks: number): { drawable: boolean; text: string } {
  const filled = days.filter((d) => d.shin !== undefined || d.sleep !== undefined || d.soreness !== undefined || d.mood !== undefined);
  if (!filled.length) return { drawable: false, text: `Belum ada check-in dalam ${weeks} minggu terakhir. Isi check-in di Profil, di bawah 10 detik.` };
  const shin = filled.map((d) => d.shin).filter((v): v is number => v !== undefined);
  const sleep = filled.map((d) => d.sleep).filter((v): v is number => v !== undefined);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const parts = [`${filled.length} check-in dalam ${weeks} minggu`];
  if (shin.length) parts.push(`nyeri shin rata-rata ${num1(avg(shin))}/10, ${shin.filter((v) => v >= SHIN_EASY).length} hari ≥ ${SHIN_EASY}`);
  if (sleep.length) parts.push(`tidur rata-rata ${num1(avg(sleep))}/5`);
  return { drawable: filled.length >= 2, text: `${parts.join("; ")}.` };
}
