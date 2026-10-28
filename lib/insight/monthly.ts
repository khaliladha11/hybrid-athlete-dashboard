/**
 * #12 Ringkasan bulanan (docs/INSIGHT.md §4, 0.15.2). Murni: tanggal dari parameter, WIB.
 *
 * Untuk bulan yang baru selesai: km & jumlah lari, sesi ST (tanggal asli, tanpa dobel dengan intervals.icu), PR baru
 * (tanggal di bulan itu, terbaik per gerakan), VDOT di akhir bulan vs akhir bulan sebelumnya (sumber 0.13.2), dan
 * otot tanpa kerja utama 14 hari di akhir bulan (aturan 0.15.1). Kartu Profil tampil tanggal 1–7, sekali per bulan.
 */
import type { RaceResult } from "@/lib/athlete-settings";
import { calendarItems } from "@/lib/calendar";
import { addDays } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import { activitySource, raceSource, type Confidence } from "@/lib/program/prediction";
import type { LogEntry } from "@/lib/progression";
import { isLivePr, type PrEntry } from "@/lib/prs";
import type { StSession } from "@/lib/st-session";
import { num1 } from "./format";
import { rarelyTrained } from "./muscle-load";
import { stWork } from "./strength-trends";

export const MONTHLY_CARD_DAYS = 7;

const MONTH = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

/** Bulan sebelum bulan `today`: awal, akhir, kunci YYYY-MM, label "Oktober 2026". */
export function previousMonth(today: string) {
  const start1 = `${today.slice(0, 7)}-01`;
  const end = addDays(start1, -1);
  const start = `${end.slice(0, 7)}-01`;
  return { start, end, key: end.slice(0, 7), label: MONTH.format(new Date(`${start}T00:00:00Z`)) };
}

/** Kartu Profil: tanggal 1–7 dan belum ditutup untuk bulan itu. */
export const showMonthlyCard = (today: string, dismissed: string | null | undefined) =>
  Number(today.slice(8, 10)) <= MONTHLY_CARD_DAYS && dismissed !== previousMonth(today).key;

export interface MonthlySummary {
  key: string;
  label: string;
  runKm: number;
  runs: number;
  stDays: number;
  newPrs: { movement: string; loadKg: number; reps?: number }[];
  vdot?: { from?: number; to: number; confidence: Confidence };
  /** null = belum ada sesi ST 14 hari terakhir bulan itu. */
  rarely: string[] | null;
}

const vdotAt = (activities: Activity[], races: RaceResult[], date: string) => {
  const src = raceSource(races, date) ?? activitySource(activities, date);
  return src ? { vdot: Math.round(src.vdot * 10) / 10, confidence: (src.kind === "race" ? "tinggi" : "rendah") as Confidence } : undefined;
};

export function monthlySummary(o: {
  today: string;
  activities: Activity[];
  stSessions: StSession[];
  log: LogEntry[];
  prs: PrEntry[];
  raceResults: RaceResult[];
  available: readonly string[];
}): MonthlySummary {
  const m = previousMonth(o.today);
  const inMonth = (d: string | undefined) => !!d && d >= m.start && d <= m.end;
  const runs = o.activities.filter((a) => a.category === "run" && inMonth(a.date));
  const items = calendarItems(o.activities, o.stSessions, o.log.filter((e) => !e.deletedAt).map((e) => e.date));
  let stDays = 0;
  for (const [date, list] of items) {
    if (inMonth(date) && list.some((i) => i.kind === "local-st" || (i.kind === "activity" && i.activity.category === "strength"))) stDays++;
  }
  const best = new Map<string, { movement: string; loadKg: number; reps?: number }>();
  for (const p of o.prs.filter((p) => isLivePr(p) && inMonth(p.date))) {
    const cur = best.get(p.movement);
    if (!cur || p.loadKg > cur.loadKg || (p.loadKg === cur.loadKg && (p.reps ?? 0) > (cur.reps ?? 0))) best.set(p.movement, { movement: p.movement, loadKg: p.loadKg, ...(p.reps ? { reps: p.reps } : {}) });
  }
  const to = vdotAt(o.activities, o.raceResults, m.end);
  const from = vdotAt(o.activities, o.raceResults, addDays(m.start, -1));
  return {
    key: m.key,
    label: m.label,
    runKm: Math.round(runs.reduce((t, a) => t + (a.distanceKm ?? 0), 0) * 10) / 10,
    runs: runs.length,
    stDays,
    newPrs: [...best.values()].sort((a, b) => a.movement.localeCompare(b.movement)),
    ...(to ? { vdot: { ...(from ? { from: from.vdot } : {}), to: to.vdot, confidence: to.confidence } } : {}),
    rarely: rarelyTrained(stWork(o.stSessions, o.log), o.available, m.end),
  };
}

const kg = (v: number) => `${num1(v).replace(",0", "")} kg`;

/** Baris teks ringkasan (kartu Profil & Insight). */
export function monthlyLines(s: MonthlySummary): string[] {
  const lines = [s.runs ? `Lari ${num1(s.runKm)} km dalam ${s.runs} lari.` : "Belum ada lari tercatat bulan ini.", s.stDays ? `ST di ${s.stDays} hari.` : "Belum ada sesi ST tercatat."];
  lines.push(
    s.newPrs.length ? `PR baru: ${s.newPrs.map((p) => `${p.movement} ${kg(p.loadKg)}${p.reps ? ` × ${p.reps}` : ""}`).join(", ")}.` : "Belum ada PR baru bulan ini.",
  );
  if (s.vdot) {
    const d = s.vdot.from !== undefined ? s.vdot.to - s.vdot.from : undefined;
    const change = d === undefined ? "" : Math.abs(d) < 0.3 ? ", stabil" : `, ${d > 0 ? "naik" : "turun"} ${num1(Math.abs(d))} dari bulan sebelumnya`;
    lines.push(`VDOT akhir bulan ${num1(s.vdot.to)}${change} (keyakinan ${s.vdot.confidence}).`);
  } else lines.push("VDOT belum bisa dihitung (butuh hasil lomba atau lari ≥ 3 km dalam 90 hari).");
  if (s.rarely?.length) lines.push(`Otot tanpa kerja utama di 14 hari terakhir bulan itu: ${s.rarely.join(", ")}.`);
  return lines;
}
