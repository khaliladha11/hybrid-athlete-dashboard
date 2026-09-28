import { addDays, startOfWeekMonday } from "@/lib/date";
import type { Activity, ActivityCategory } from "./types";

export interface WeeklySummary {
  from: string;
  to: string;
  runKm: number;
  sessions: Partial<Record<ActivityCategory, number>>;
  totalSessions: number;
  avgPaceSecPerKm?: number;
  avgRunHr?: number;
  longestRun?: { km: number; date?: string; name: string };
  totalLoad: number;
  /** km lari minggu kalender berjalan (Senin–Minggu). */
  calendarWeek: { from: string; to: string; runKm: number };
}

const inRange = (a: Activity, from: string, to: string) => !!a.date && a.date >= from && a.date <= to;

export function summarizeLast7Days(activities: Activity[], today: string): WeeklySummary {
  const from = addDays(today, -6);
  const list = activities.filter((a) => inRange(a, from, today));
  const runs = list.filter((a) => a.category === "run");

  const sessions: WeeklySummary["sessions"] = {};
  for (const a of list) sessions[a.category] = (sessions[a.category] ?? 0) + 1;

  const runKm = runs.reduce((s, a) => s + (a.distanceKm ?? 0), 0);
  const paced = runs.filter((a) => a.distanceKm && a.movingTimeSec);
  const pacedKm = paced.reduce((s, a) => s + a.distanceKm!, 0);
  const pacedSec = paced.reduce((s, a) => s + a.movingTimeSec!, 0);

  // HR rata-rata tertimbang durasi (hanya sesi yang punya data HR).
  const withHr = runs.filter((a) => a.avgHr && a.movingTimeSec);
  const hrSec = withHr.reduce((s, a) => s + a.movingTimeSec!, 0);
  const avgRunHr = hrSec ? withHr.reduce((s, a) => s + a.avgHr! * a.movingTimeSec!, 0) / hrSec : undefined;

  const longest = runs.reduce<Activity | undefined>((best, a) => ((a.distanceKm ?? 0) > (best?.distanceKm ?? 0) ? a : best), undefined);

  const weekFrom = startOfWeekMonday(today);
  const weekTo = addDays(weekFrom, 6);
  const weekKm = activities
    .filter((a) => a.category === "run" && inRange(a, weekFrom, weekTo))
    .reduce((s, a) => s + (a.distanceKm ?? 0), 0);

  return {
    from,
    to: today,
    runKm,
    sessions,
    totalSessions: list.length,
    avgPaceSecPerKm: pacedKm > 0 ? pacedSec / pacedKm : undefined,
    avgRunHr,
    longestRun: longest?.distanceKm ? { km: longest.distanceKm, date: longest.date, name: longest.name } : undefined,
    totalLoad: list.reduce((s, a) => s + (a.trainingLoad ?? 0), 0),
    calendarWeek: { from: weekFrom, to: weekTo, runKm: weekKm },
  };
}

export function formatPace(secPerKm: number | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return "—";
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}/km`;
}

export function formatDuration(sec: number | undefined): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h}j ${String(m).padStart(2, "0")}m` : `${m}:${String(s).padStart(2, "0")}`;
}

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  run: "Lari",
  walk: "Jalan",
  strength: "ST",
  ride: "Sepeda",
  other: "Lainnya",
};
