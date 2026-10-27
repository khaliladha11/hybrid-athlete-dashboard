/**
 * Kepatuhan program (docs/PROGRAM-HIDUP.md §3, §4.1, keputusan D2). Murni: tanggal dari parameter, WIB.
 *
 * - Pencocokan: setiap sesi hanya melihat aktivitas di tanggalnya ±1 hari. Pasangan diurutkan menurut selisih hari,
 *   kecocokan jenis, tanggal sesi, lalu waktu mulai; satu aktivitas untuk satu sesi. Lari lain yang tersisa di hari
 *   yang sama dengan aktivitas utama sesi itu ikut dijumlah (mis. lari dipecah dua).
 * - Selesai: jenis cocok dan durasi atau jarak ≥ 80% rencana (long run & lomba: jarak). Di bawahnya sebagian.
 *   Quality yang dikerjakan ringan juga sebagian. Aktivitas tanpa durasi & jarak (mis. salinan Strava kosong) dianggap
 *   memenuhi karena tidak bisa diukur.
 * - Easy/recovery yang dikerjakan berat diberi catatan `lebih-berat` (memakai `isHardRun` yang sama dengan coach).
 * - ST: sesi mode latihan (0.14.1) di tanggal ±1 hari menentukan selesai (set ≥ 80%) atau sebagian; sesi yang dimulai
 *   dari sesi program itu diutamakan. Tanpa sesi: log ST lokal atau aktivitas strength = selesai. Aktivitas strength
 *   yang sudah berpasangan dengan sesi lokal (`dedupeStSessions`) dan log di tanggal sesi lokal tidak dihitung lagi.
 * - Tanpa aktivitas: kemarin masih bisa (tenggang ±1 hari), lewat dari itu terlewat.
 */
import { addDays } from "@/lib/date";
import { isHardRun } from "@/lib/coach";
import type { Activity } from "@/lib/intervals/types";
import { completion, dedupeStSessions, isComplete, type StSession } from "@/lib/st-session";
import { isRunKind, type PlannedSession } from "./sessions";

export type SessionStatus = "mendatang" | "hari-ini" | "selesai" | "sebagian" | "terlewat" | "digeser" | "dilewati";

export interface SessionResult {
  status: SessionStatus;
  /** Aktivitas intervals.icu yang dihitung untuk sesi ini. */
  activityIds: string[];
  /** Sesi ST yang dipenuhi log lokal di tanggal ini. */
  logDate?: string;
  /** Sesi mode latihan yang memenuhi sesi ST ini (0.14.1). */
  stSessionId?: string;
  note?: "lebih-berat";
  /** Tanggal kemarin tanpa aktivitas: masih bisa dikerjakan hari ini. */
  masihBisa?: boolean;
  /** Pencapaian terhadap rencana (0–1+), bila terukur. */
  ratio?: number;
}

export const COMPLETE_RATIO = 0.8;

const dayDiff = (a: string, b: string) => Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

function runFit(s: PlannedSession, a: Activity): number {
  if (s.kind === "quality") return s.intensity === "easy" || isHardRun(a) ? 2 : 1;
  if (s.kind === "long" || s.kind === "race") return (a.distanceKm ?? 0) >= COMPLETE_RATIO * (s.km ?? 0) ? 2 : 1;
  return isHardRun(a) ? 1 : 2;
}

interface Candidate {
  key: string;
  date: string;
  start: string;
  activity?: Activity;
  session?: StSession;
}

/** Pasangkan sesi dengan kandidat secara serakah dan deterministik. */
function assign(sessions: PlannedSession[], candidates: Candidate[], fit: (s: PlannedSession, c: Candidate) => number): Map<string, Candidate> {
  const pairs: { s: PlannedSession; c: Candidate; d: number; f: number }[] = [];
  for (const s of sessions) {
    for (const c of candidates) {
      const d = dayDiff(s.date, c.date);
      if (d <= 1) pairs.push({ s, c, d, f: fit(s, c) });
    }
  }
  pairs.sort((x, y) => x.d - y.d || y.f - x.f || x.s.date.localeCompare(y.s.date) || x.s.id.localeCompare(y.s.id) || x.c.start.localeCompare(y.c.start) || x.c.key.localeCompare(y.c.key));
  const bySession = new Map<string, Candidate>();
  const used = new Set<string>();
  for (const p of pairs) {
    if (bySession.has(p.s.id) || used.has(p.c.key)) continue;
    bySession.set(p.s.id, p.c);
    used.add(p.c.key);
  }
  return bySession;
}

function judgeRun(s: PlannedSession, acts: Activity[]): Pick<SessionResult, "status" | "note" | "ratio"> {
  const km = acts.reduce((t, a) => t + (a.distanceKm ?? 0), 0);
  const min = acts.reduce((t, a) => t + (a.movingTimeSec ?? 0), 0) / 60;
  const hard = acts.some((a) => isHardRun(a));
  const byKm = s.km ? km / s.km : undefined;
  const byMin = s.minutes ? min / s.minutes : undefined;
  const measurable = km > 0 || min > 0;
  const ratio = !measurable ? undefined : s.kind === "long" || s.kind === "race" ? byKm : Math.max(byKm ?? 0, byMin ?? 0);
  const enough = ratio === undefined || ratio >= COMPLETE_RATIO;
  const note = (s.kind === "easy" || s.kind === "recovery") && hard ? ("lebih-berat" as const) : undefined;
  const lighter = s.kind === "quality" && s.intensity !== "easy" && !hard;
  return { status: enough && !lighter ? "selesai" : "sebagian", ...(note ? { note } : {}), ...(ratio !== undefined ? { ratio: Math.round(ratio * 100) / 100 } : {}) };
}

/**
 * Status setiap sesi. `stLogDates` = tanggal (WIB) yang punya log ST hidup di perangkat; `stSessions` = sesi mode
 * latihan (0.14.1). Aktivitas tanpa tanggal atau setelah hari ini diabaikan.
 */
export function evaluateCompliance(
  sessions: PlannedSession[],
  activities: Activity[],
  stLogDates: string[],
  today: string,
  stSessions: StSession[] = [],
): Map<string, SessionResult> {
  const acts = activities.filter((a) => a.date && a.date <= today);
  const active = sessions.filter((s) => s.override?.action !== "skip");
  const runSessions = active.filter((s) => isRunKind(s.kind));
  const stPlanned = active.filter((s) => !isRunKind(s.kind));

  const runCands: Candidate[] = acts.filter((a) => a.category === "run").map((a) => ({ key: a.id, date: a.date!, start: a.startLocal ?? a.date!, activity: a }));
  const runMatch = assign(runSessions, runCands, (s, c) => runFit(s, c.activity!));

  const liveSt = stSessions.filter((s) => !s.deletedAt && s.date <= today);
  const paired = new Set(dedupeStSessions(liveSt, acts).flatMap((i) => (i.source === "local" && i.activityId ? [i.activityId] : [])));
  const stDates = new Set(liveSt.map((s) => s.date));
  const stCands: Candidate[] = [
    ...liveSt.map((s) => ({ key: `ses:${s.id}`, date: s.date, start: s.startedAt, session: s })),
    ...[...new Set(stLogDates)].filter((d) => d <= today && !stDates.has(d)).map((d) => ({ key: `log:${d}`, date: d, start: `${d}T00` })),
    ...acts.filter((a) => a.category === "strength" && !paired.has(a.id)).map((a) => ({ key: a.id, date: a.date!, start: a.startLocal ?? a.date!, activity: a })),
  ];
  const stFit = (s: PlannedSession, c: Candidate) => (c.session ? (c.session.planSessionId === s.id ? 4 : 3) : c.activity ? 1 : 2);
  const stMatch = assign(stPlanned, stCands, stFit);

  // Lari tambahan di hari yang sama dengan aktivitas utama sesi dijumlah.
  const usedRun = new Set([...runMatch.values()].map((c) => c.key));
  const extras = new Map<string, Activity[]>();
  for (const [sid, c] of runMatch) {
    const more = runCands.filter((x) => !usedRun.has(x.key) && x.date === c.date);
    for (const m of more) usedRun.add(m.key);
    extras.set(sid, more.map((m) => m.activity!));
  }

  const out = new Map<string, SessionResult>();
  const yesterday = addDays(today, -1);
  for (const s of sessions) {
    if (s.override?.action === "skip") {
      out.set(s.id, { status: "dilewati", activityIds: [] });
      continue;
    }
    const run = runMatch.get(s.id);
    if (run) {
      const list = [run.activity!, ...(extras.get(s.id) ?? [])];
      out.set(s.id, { ...judgeRun(s, list), activityIds: list.map((a) => a.id) });
      continue;
    }
    const st = stMatch.get(s.id);
    if (st) {
      if (st.session) {
        const ratio = Math.round(completion(st.session) * 100) / 100;
        out.set(s.id, { status: isComplete(st.session) ? "selesai" : "sebagian", activityIds: [], stSessionId: st.session.id, ratio });
      } else out.set(s.id, st.activity ? { status: "selesai", activityIds: [st.activity.id] } : { status: "selesai", activityIds: [], logDate: st.date });
      continue;
    }
    const moved = s.override?.action === "move";
    if (s.date > today) out.set(s.id, { status: moved ? "digeser" : "mendatang", activityIds: [] });
    else if (s.date === today) out.set(s.id, { status: moved ? "digeser" : "hari-ini", activityIds: [] });
    else if (s.date === yesterday) out.set(s.id, { status: "hari-ini", activityIds: [], masihBisa: true });
    else out.set(s.id, { status: "terlewat", activityIds: [] });
  }
  return out;
}

export interface WeekSummary {
  week: number;
  done: number;
  total: number;
  longRun?: { km?: number; status: SessionStatus };
}

/** Ringkasan satu minggu program: sesi selesai dari total (lari + ST) dan status long run / lomba. */
export function weekSummary(sessions: PlannedSession[], results: Map<string, SessionResult>, week: number): WeekSummary {
  const list = sessions.filter((s) => s.week === week);
  const done = list.filter((s) => results.get(s.id)?.status === "selesai").length;
  const long = list.find((s) => s.kind === "long" || s.kind === "race");
  return { week, done, total: list.length, ...(long ? { longRun: { km: long.km, status: results.get(long.id)?.status ?? "mendatang" } } : {}) };
}
