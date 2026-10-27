/**
 * Sesi ST yang dikerjakan di mode latihan (0.14.1, docs/STRENGTH-HIDUP.md §3 "0.14.1"). Murni.
 *
 * - Session-RPE (Foster dkk. 2001): beban sesi = RPE sesi (0–10, skala CR-10) × durasi menit, satuan AU.
 *   Tidak dijumlahkan dengan `trainingLoad` intervals.icu karena skalanya berbeda.
 * - Kelengkapan = set dicentang / set rencana; ≥ 80% selesai, di bawahnya sebagian (sama dengan kepatuhan lari).
 * - Hapus = tombstone, gabungan per `id` dengan urutan total yang sama dengan log & PR (komutatif, idempoten).
 * - Dedupe dengan intervals.icu: sesi lokal dan aktivitas `strength` di tanggal WIB yang sama dianggap satu sesi bila
 *   jam mulainya selisih ≤ 2 jam (atau salah satunya tanpa jam). Satu sesi lokal satu aktivitas (selisih terkecil);
 *   pasangan dihitung sekali memakai sesi lokal. Aktivitas tanpa pasangan tetap dihitung, tanpa beban AU.
 */
import { WIB_OFFSET_MS } from "./date";
import { DIFFICULTIES, STRENGTH_TYPES, type Difficulty, type StrengthType } from "./generator/types";
import type { Activity } from "./intervals/types";

export interface StSession {
  id: string;
  /** YYYY-MM-DD (WIB), tanggal mulai. */
  date: string;
  /** ISO, saat sesi dimulai. */
  startedAt: string;
  type: StrengthType;
  title: string;
  difficulty: Difficulty;
  /** Sesi program yang dipenuhi (bila dimulai dari program). */
  planSessionId?: string;
  durationMin: number;
  /** RPE sesi 0–10 (CR-10). */
  rpe: number;
  setsDone: number;
  setsPlanned: number;
  /** Gerakan inti sesi (untuk ringkasan otot). */
  movements: string[];
  /** ISO. */
  updatedAt: string;
  /** ISO. Ada = dihapus (tombstone sinkron). */
  deletedAt?: string;
}

export const MAX_ST_SESSIONS = 2000;
export const ST_SESSION_TOMBSTONE_TTL_DAYS = 90;
export const ST_COMPLETE_RATIO = 0.8;
/** Selisih jam mulai maksimal agar sesi lokal dan aktivitas intervals.icu dianggap sesi yang sama. */
export const ST_MATCH_WINDOW_MIN = 120;
export const MAX_DURATION_MIN = 300;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const intIn = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

export const isLiveSession = (s: StSession) => !s.deletedAt;

export function normalizeSession(x: unknown): StSession | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const r = x as Record<string, unknown>;
  if (!str(r.id, 80) || !str(r.title, 120)) return null;
  if (typeof r.date !== "string" || !DATE_RE.test(r.date) || Number.isNaN(Date.parse(r.date))) return null;
  if (!isIso(r.startedAt)) return null;
  if (!(STRENGTH_TYPES as readonly unknown[]).includes(r.type) || !(DIFFICULTIES as readonly unknown[]).includes(r.difficulty)) return null;
  if (!intIn(r.durationMin, 1, MAX_DURATION_MIN) || !intIn(r.rpe, 0, 10)) return null;
  if (!intIn(r.setsPlanned, 0, 200) || !intIn(r.setsDone, 0, 200)) return null;
  const movements = Array.isArray(r.movements) ? r.movements.filter((m): m is string => str(m, 120)).slice(0, 40) : [];
  return {
    id: r.id,
    date: r.date,
    startedAt: r.startedAt,
    type: r.type as StrengthType,
    title: r.title,
    difficulty: r.difficulty as Difficulty,
    ...(str(r.planSessionId, 120) ? { planSessionId: r.planSessionId } : {}),
    durationMin: r.durationMin,
    rpe: r.rpe,
    setsDone: Math.min(r.setsDone, r.setsPlanned || r.setsDone),
    setsPlanned: r.setsPlanned,
    movements,
    updatedAt: isIso(r.updatedAt) ? r.updatedAt : r.startedAt,
    ...(isIso(r.deletedAt) ? { deletedAt: r.deletedAt } : {}),
  };
}

const rank = (s: StSession): [number, string, string] => [s.deletedAt ? 1 : 0, s.updatedAt, JSON.stringify(s)];

function pick(a: StSession, b: StSession): StSession {
  const [ra, rb] = [rank(a), rank(b)];
  for (let i = 0; i < 3; i++) if (ra[i] !== rb[i]) return ra[i] > rb[i] ? a : b;
  return a;
}

/** Gabungkan beberapa daftar per `id`; urutan stabil (jam mulai, lalu id). */
export function mergeSessions(...lists: StSession[][]): StSession[] {
  const by = new Map<string, StSession>();
  for (const list of lists) for (const s of list) by.set(s.id, by.has(s.id) ? pick(by.get(s.id)!, s) : s);
  return [...by.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id)).slice(-MAX_ST_SESSIONS);
}

export function normalizeSessions(raw: unknown): StSession[] {
  const list = Array.isArray(raw) ? raw : [];
  return mergeSessions(list.map(normalizeSession).filter((s): s is StSession => s !== null));
}

export const tombstoneSession = (s: StSession, now: string): StSession => (s.deletedAt ? s : { ...s, deletedAt: now, updatedAt: now });

export function compactSessionTombstones(list: StSession[], nowMs: number): StSession[] {
  const cutoff = nowMs - ST_SESSION_TOMBSTONE_TTL_DAYS * 86_400_000;
  return list.filter((s) => !s.deletedAt || Date.parse(s.deletedAt) >= cutoff);
}

/** Beban session-RPE (AU) = RPE × menit. */
export const sessionLoad = (s: Pick<StSession, "rpe" | "durationMin">) => Math.round(s.rpe * s.durationMin);

/** Set dicentang / set rencana (sesi tanpa rencana set = 1). */
export const completion = (s: Pick<StSession, "setsDone" | "setsPlanned">) => (s.setsPlanned > 0 ? s.setsDone / s.setsPlanned : 1);

export const isComplete = (s: Pick<StSession, "setsDone" | "setsPlanned">) => completion(s) >= ST_COMPLETE_RATIO - 1e-9;

/** Sesi kaki (Lower/Full Body), untuk aturan concurrent setelah ST kaki. */
export const isLegSession = (s: Pick<StSession, "type">) => s.type === "lower" || s.type === "fullBody";

/** Menit sejak tengah malam: ISO (UTC) → jam WIB, atau "YYYY-MM-DDTHH:MM" lokal intervals.icu apa adanya. */
const minuteOfDayWib = (iso: string) => {
  const d = new Date(Date.parse(iso) + WIB_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const minuteOfDayLocal = (local: string | undefined) => {
  const m = local?.match(/T(\d{2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
};

/** Satu baris ST setelah dedupe: sesi lokal (dengan RPE) atau aktivitas intervals.icu tanpa pasangan. */
export type StItem =
  | { source: "local"; date: string; minutes: number; load: number; leg: boolean; session: StSession; activityId?: string }
  | { source: "intervals"; date: string; minutes?: number; load?: undefined; leg?: undefined; activity: Activity };

/**
 * Gabungkan sesi lokal dan aktivitas `strength` intervals.icu tanpa hitung dobel (aturan di kepala file).
 * Hasil diurutkan menurut tanggal.
 */
export function dedupeStSessions(sessions: StSession[], activities: Activity[]): StItem[] {
  const live = sessions.filter(isLiveSession);
  const acts = activities.filter((a) => a.category === "strength" && a.date);
  const pairs: { s: number; a: number; d: number }[] = [];
  live.forEach((s, i) =>
    acts.forEach((a, j) => {
      if (a.date !== s.date) return;
      const am = minuteOfDayLocal(a.startLocal);
      const d = am === undefined ? ST_MATCH_WINDOW_MIN : Math.abs(am - minuteOfDayWib(s.startedAt));
      if (d <= ST_MATCH_WINDOW_MIN) pairs.push({ s: i, a: j, d });
    }),
  );
  pairs.sort((x, y) => x.d - y.d || x.s - y.s || x.a - y.a);
  const bySession = new Map<number, number>();
  const usedAct = new Set<number>();
  for (const p of pairs) {
    if (bySession.has(p.s) || usedAct.has(p.a)) continue;
    bySession.set(p.s, p.a);
    usedAct.add(p.a);
  }
  const out: StItem[] = [
    ...live.map((s, i): StItem => {
      const j = bySession.get(i);
      return { source: "local", date: s.date, minutes: s.durationMin, load: sessionLoad(s), leg: isLegSession(s), session: s, ...(j !== undefined ? { activityId: acts[j].id } : {}) };
    }),
    ...acts
      .filter((_, j) => !usedAct.has(j))
      .map((a): StItem => ({ source: "intervals", date: a.date!, ...(a.movingTimeSec ? { minutes: Math.round(a.movingTimeSec / 60) } : {}), activity: a })),
  ];
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Tanggal WIB dari ISO. */
export const wibDateOf = (iso: string) => new Date(Date.parse(iso) + WIB_OFFSET_MS).toISOString().slice(0, 10);
