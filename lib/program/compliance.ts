/**
 * Kepatuhan program, model mingguan fleksibel (0.14.3, docs/PROGRAM-HIDUP.md D2 baru). Murni: tanggal dari parameter, WIB.
 *
 * - Satu minggu program (Senin sampai Minggu) = himpunan sesi. Hari di rencana hanya **hari disarankan**; sesi boleh
 *   dikerjakan di hari apa pun **dalam minggu kalender yang sama**. Aktivitas minggu lain tidak dihitung.
 * - Satu aktivitas memenuhi paling banyak satu sesi. Pasangan diurutkan menurut kecocokan jenis, lalu selisih hari ke
 *   hari disarankan (terdekat dulu), lalu tanggal. Lari lain di hari yang sama dengan aktivitas utama sesi ikut dijumlah.
 * - Jenis: quality ↔ lari berat; long run/lomba ↔ jarak ≥ 80% rencana; easy/recovery ↔ lari apa pun (berat → catatan
 *   `lebih-berat`, ikut hitungan 80/20). ST ↔ sesi mode latihan (yang dimulai dari sesi itu dulu, lalu tipe cocok),
 *   log ★ lokal, atau aktivitas strength intervals.icu. Aktivitas yang sudah berpasangan dengan sesi lokal
 *   (`dedupeStSessions`) dan log di tanggal sesi lokal tidak dihitung dua kali.
 * - Status sesi: terpenuhi (dengan tanggal aktual) / sebagian (< 80%, quality dikerjakan ringan, atau ST < 80% set) /
 *   belum / dilewati. Status minggu: terpenuhi / sebagian. Tanpa "terlewat", tanpa streak, tanpa sesi yang dibawa ke
 *   minggu berikutnya (D5).
 */
import { addDays, startOfWeekMonday } from "@/lib/date";
import { isHardRun, isLegStrength } from "@/lib/coach";
import type { Activity } from "@/lib/intervals/types";
import { completion, dedupeStSessions, isComplete, isLegSession, type StSession } from "@/lib/st-session";
import { isRunKind, type PlannedSession } from "./sessions";

export type SessionStatus = "terpenuhi" | "sebagian" | "belum" | "dilewati";
export type WeekStatus = "terpenuhi" | "sebagian";

export interface SessionResult {
  status: SessionStatus;
  /** Tanggal sesi benar-benar dikerjakan (WIB). */
  actualDate?: string;
  /** Aktivitas intervals.icu yang dihitung untuk sesi ini. */
  activityIds: string[];
  /** Sesi ST yang dipenuhi log ★ lokal di tanggal ini. */
  logDate?: string;
  /** Sesi mode latihan yang memenuhi sesi ST ini (0.14.1). */
  stSessionId?: string;
  note?: "lebih-berat";
  /** Pencapaian terhadap rencana (0–1+), bila terukur. */
  ratio?: number;
}

export const COMPLETE_RATIO = 0.8;

const dayDiff = (a: string, b: string) => Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
const weekOf = (date: string) => startOfWeekMonday(date);

interface Candidate {
  key: string;
  date: string;
  start: string;
  activity?: Activity;
  session?: StSession;
}

/** Kecocokan jenis lari (lebih besar = lebih cocok). */
function runFit(s: PlannedSession, a: Activity): number {
  if (s.kind === "quality") return s.intensity === "easy" ? 2 : isHardRun(a) ? 3 : 1;
  if (s.kind === "long" || s.kind === "race") return (a.distanceKm ?? 0) >= COMPLETE_RATIO * (s.km ?? 0) ? 3 : 1;
  return isHardRun(a) ? 1 : 2;
}

/** Kecocokan ST: sesi yang dimulai dari sesi program ini > tipe cocok > log/aktivitas > tipe lain. */
function stFit(s: PlannedSession, c: Candidate): number {
  const lower = s.kind === "st-lower";
  if (c.session) return c.session.planSessionId === s.id ? 5 : isLegSession(c.session) === lower ? 3 : 1;
  if (c.activity) return isLegStrength(c.activity) === lower ? 2 : 1;
  return 2;
}

/** Pasangkan sesi dengan kandidat di minggu kalender yang sama, serakah dan deterministik. */
function assign(sessions: PlannedSession[], candidates: Candidate[], fit: (s: PlannedSession, c: Candidate) => number): Map<string, Candidate> {
  const pairs: { s: PlannedSession; c: Candidate; d: number; f: number }[] = [];
  for (const s of sessions) {
    const week = weekOf(s.plannedDate);
    for (const c of candidates) if (weekOf(c.date) === week) pairs.push({ s, c, d: dayDiff(s.plannedDate, c.date), f: fit(s, c) });
  }
  pairs.sort((x, y) => y.f - x.f || x.d - y.d || x.s.plannedDate.localeCompare(y.s.plannedDate) || x.s.id.localeCompare(y.s.id) || x.c.start.localeCompare(y.c.start) || x.c.key.localeCompare(y.c.key));
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
  return { status: enough && !lighter ? "terpenuhi" : "sebagian", ...(note ? { note } : {}), ...(ratio !== undefined ? { ratio: Math.round(ratio * 100) / 100 } : {}) };
}

/**
 * Status setiap sesi. `stLogDates` = tanggal (WIB) yang punya log ★ hidup di perangkat; `stSessions` = sesi mode
 * latihan. Aktivitas tanpa tanggal atau setelah hari ini diabaikan.
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
  for (const s of sessions) {
    if (s.override?.action === "skip") {
      out.set(s.id, { status: "dilewati", activityIds: [] });
      continue;
    }
    const run = runMatch.get(s.id);
    if (run) {
      const list = [run.activity!, ...(extras.get(s.id) ?? [])];
      out.set(s.id, { ...judgeRun(s, list), actualDate: run.date, activityIds: list.map((a) => a.id) });
      continue;
    }
    const st = stMatch.get(s.id);
    if (st?.session) {
      const ratio = Math.round(completion(st.session) * 100) / 100;
      out.set(s.id, { status: isComplete(st.session) ? "terpenuhi" : "sebagian", actualDate: st.date, activityIds: [], stSessionId: st.session.id, ratio });
    } else if (st) {
      out.set(s.id, st.activity ? { status: "terpenuhi", actualDate: st.date, activityIds: [st.activity.id] } : { status: "terpenuhi", actualDate: st.date, activityIds: [], logDate: st.date });
    } else out.set(s.id, { status: "belum", activityIds: [] });
  }
  return out;
}

/** Sesi dianggap sudah dikerjakan (terpenuhi atau sebagian). */
export const isDone = (r: SessionResult | undefined) => r?.status === "terpenuhi" || r?.status === "sebagian";

export interface WeekSummary {
  week: number;
  done: number;
  total: number;
  status: WeekStatus;
  longRun?: { km?: number; status: SessionStatus };
}

/** Ringkasan satu minggu program: sesi terpenuhi dari total (lari + ST), status minggu, dan long run / lomba. */
export function weekSummary(sessions: PlannedSession[], results: Map<string, SessionResult>, week: number): WeekSummary {
  const list = sessions.filter((s) => s.week === week);
  const done = list.filter((s) => results.get(s.id)?.status === "terpenuhi").length;
  const open = list.filter((s) => results.get(s.id)?.status !== "dilewati");
  const status: WeekStatus = open.length > 0 && open.every((s) => results.get(s.id)?.status === "terpenuhi") ? "terpenuhi" : "sebagian";
  const long = list.find((s) => s.kind === "long" || s.kind === "race");
  return { week, done, total: list.length, status, ...(long ? { longRun: { km: long.km, status: results.get(long.id)?.status ?? "belum" } } : {}) };
}

/** Senin & Minggu minggu kalender dari sebuah tanggal. */
export const weekBounds = (date: string) => ({ start: weekOf(date), end: addDays(weekOf(date), 6) });
