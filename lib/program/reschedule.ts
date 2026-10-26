/**
 * Opsi geser/lewati untuk sesi terlewat (docs/PROGRAM-HIDUP.md §4.8, keputusan D5). Murni: tanggal dari parameter.
 *
 * - Hanya untuk sesi berstatus `terlewat` yang belum punya override. Keputusan selalu di tangan atlet.
 * - Geser selalu ke hari ≥ hari ini **di minggu program yang sama**, sehingga tidak pernah menambah volume
 *   minggu berikutnya; tidak ada sesi atau km baru (D5). Paling banyak satu tanggal ditawarkan (yang paling awal).
 * - Quality: hari tanpa lari (rencana atau tercatat), bukan sehari sebelum quality/long run/lomba, dan ≥ 48 jam
 *   dari quality sebelumnya. Tanpa kandidat → hanya lewati.
 * - Long run: +1 atau +2 hari dengan syarat yang sama (bukan hari quality atau sehari sebelumnya). Dengan jadwal
 *   program (long run Minggu), hari itu selalu jatuh di minggu berikutnya, jadi praktis hanya lewati.
 * - Easy/recovery: hanya lewati. ST: hari kosong (tanpa sesi apa pun), bukan sehari sebelum quality/long run.
 * - Lomba: tidak ada opsi.
 */
import { addDays, startOfWeekMonday } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import type { SessionResult } from "./compliance";
import { isRunKind, type PlannedSession } from "./sessions";

export type RescheduleOption = { action: "move"; toDate: string } | { action: "skip" };

const HARD = new Set<PlannedSession["kind"]>(["quality", "long", "race"]);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
const datesFrom = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

export function rescheduleOptions(
  session: PlannedSession,
  sessions: PlannedSession[],
  results: Map<string, SessionResult>,
  activities: Activity[],
  today: string,
): RescheduleOption[] {
  if (session.override || results.get(session.id)?.status !== "terlewat" || session.kind === "race") return [];
  const skip: RescheduleOption = { action: "skip" };
  if (session.kind === "easy" || session.kind === "recovery") return [skip];

  const others = sessions.filter((s) => s.id !== session.id && s.override?.action !== "skip");
  const runDates = new Set([
    ...others.filter((s) => isRunKind(s.kind)).map((s) => s.date),
    ...activities.filter((a) => a.category === "run" && a.date && a.date <= today).map((a) => a.date!),
  ]);
  const anyDates = new Set(others.map((s) => s.date));
  const hardDates = new Set(others.filter((s) => HARD.has(s.kind)).map((s) => s.date));
  const qualityDates = others.filter((s) => s.kind === "quality").map((s) => s.date);
  const dayBeforeHard = (d: string) => hardDates.has(addDays(d, 1));

  const weekEnd = addDays(startOfWeekMonday(session.plannedDate), 6);
  const first = addDays(session.plannedDate, 1) > today ? addDays(session.plannedDate, 1) : today;

  let candidates: string[] = [];
  if (session.kind === "quality") {
    candidates = datesFrom(first, weekEnd).filter((d) => {
      if (runDates.has(d) || dayBeforeHard(d)) return false;
      const prev = qualityDates.filter((q) => q < d).sort().at(-1);
      return !prev || dayDiff(d, prev) >= 2;
    });
  } else if (session.kind === "long") {
    candidates = [1, 2]
      .map((n) => addDays(session.plannedDate, n))
      .filter((d) => d >= today && d <= weekEnd && !runDates.has(d) && !hardDates.has(d) && !dayBeforeHard(d));
  } else {
    // ST: hari tanpa sesi apa pun.
    candidates = datesFrom(first, weekEnd).filter((d) => !anyDates.has(d) && !dayBeforeHard(d));
  }
  return candidates.length ? [{ action: "move", toDate: candidates[0] }, skip] : [skip];
}

/** Sesi terlewat yang masih perlu keputusan (tanggal dalam `days` hari terakhir), terlama dulu. */
export function missedSessions(sessions: PlannedSession[], results: Map<string, SessionResult>, today: string, days = 7): PlannedSession[] {
  const from = addDays(today, -days);
  return sessions.filter((s) => !s.override && s.kind !== "race" && s.date >= from && results.get(s.id)?.status === "terlewat");
}
