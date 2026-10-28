/**
 * #11 Kalender heatmap aktivitas (docs/INSIGHT.md §4, 0.15.1). Murni.
 *
 * - Hari diklasifikasi dari `calendarItems` (0.14.3): aktivitas di tanggal aslinya, ST lokal (mode latihan & log ★)
 *   tanpa dobel dengan aktivitas strength intervals.icu.
 * - Lari = aktivitas kategori lari; ST = aktivitas strength atau ST lokal; keduanya = lari + ST di hari yang sama.
 *   Jalan, sepeda, dan lainnya tidak mengubah kelas (dihitung istirahat). Hari setelah hari ini = `future`.
 */
import { calendarItems } from "@/lib/calendar";
import type { Activity } from "@/lib/intervals/types";
import type { StSession } from "@/lib/st-session";
import { num1 } from "./format";
import { daysBetween, weekBuckets, type WeekBucket } from "./weeks";

export type DayClass = "run" | "st" | "both" | "rest" | "future";

export interface HeatWeek extends WeekBucket {
  days: { date: string; cls: DayClass }[];
}

export const DAY_CLASS_LABEL: Record<DayClass, string> = { run: "Lari", st: "ST", both: "Lari + ST", rest: "Istirahat", future: "Belum" };

export function heatmapWeeks(activities: Activity[], stSessions: StSession[], stLogDates: string[], today: string, weeks: number): HeatWeek[] {
  const items = calendarItems(activities, stSessions, stLogDates);
  const classOf = (date: string): DayClass => {
    if (date > today) return "future";
    const list = items.get(date) ?? [];
    const run = list.some((i) => i.kind === "activity" && i.activity.category === "run");
    const st = list.some((i) => i.kind === "local-st" || (i.kind === "activity" && i.activity.category === "strength"));
    return run && st ? "both" : run ? "run" : st ? "st" : "rest";
  };
  return weekBuckets(today, weeks).map((b) => ({ ...b, days: daysBetween(b.start, b.end).map((date) => ({ date, cls: classOf(date) })) }));
}

export function heatmapSummary(rows: HeatWeek[]): { drawable: boolean; text: string } {
  const days = rows.flatMap((r) => r.days).filter((d) => d.cls !== "future");
  const count = (c: DayClass) => days.filter((d) => d.cls === c).length;
  const active = days.length - count("rest");
  if (!active) return { drawable: false, text: `Belum ada lari atau ST tercatat dalam ${rows.length} minggu terakhir.` };
  const done = rows.filter((r) => !r.current);
  const perWeek = done.length ? done.flatMap((r) => r.days).filter((d) => d.cls !== "rest").length / done.length : active;
  return {
    drawable: true,
    text: `Rata-rata ${num1(perWeek)} hari aktif per minggu: ${count("run") + count("both")} hari lari, ${count("st") + count("both")} hari ST, ${count("both")} di antaranya lari + ST.`,
  };
}
