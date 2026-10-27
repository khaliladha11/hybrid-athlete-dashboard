/**
 * Mode latihan (0.14.1): keadaan sesi yang sedang berjalan. Murni; waktu selalu dari parameter `nowMs`.
 *
 * - Satu gerakan per layar, urut pemanasan → inti → pendinginan. Setiap set dicentang dengan beban, rep/detik, RPE.
 * - Timer berbasis jam (`endsAt`), bukan hitungan detik di memori: sesi yang ditinggal lalu dibuka lagi tetap benar.
 * - Selesai: satu `StSession` (session-RPE) dan `LogEntry` untuk setiap ★ yang punya set tercatat (set terakhir),
 *   sama dengan isian LogForm.
 */
import type { StrengthItem, StrengthWorkout } from "./generator/types";
import { parseRepRange, type LogEntry } from "./progression";
import { wibDateOf, type StSession } from "./st-session";

export interface SetRecord {
  load?: number;
  band?: string;
  value: number;
  unit: "reps" | "sec";
  rpe: number;
  tempo?: boolean;
}

export interface WorkoutTimer {
  kind: "rest" | "hold";
  /** Epoch ms. */
  endsAt: number;
  /** Item yang memicu timer. */
  item: number;
}

export interface ActiveWorkout {
  v: 1;
  id: string;
  /** ISO. */
  startedAt: string;
  workout: StrengthWorkout;
  blockIndex: number;
  planSessionId?: string;
  /** Set tercatat per item (indeks sama dengan `workout.items`). */
  sets: SetRecord[][];
  current: number;
  timer?: WorkoutTimer;
}

/** Tambahan istirahat per ketukan "+15 detik". */
export const REST_EXTEND_SEC = 15;

export function startWorkout(o: { id: string; nowIso: string; workout: StrengthWorkout; blockIndex: number; planSessionId?: string }): ActiveWorkout {
  return {
    v: 1,
    id: o.id,
    startedAt: o.nowIso,
    workout: o.workout,
    blockIndex: o.blockIndex,
    ...(o.planSessionId ? { planSessionId: o.planSessionId } : {}),
    sets: o.workout.items.map(() => []),
    current: 0,
  };
}

export const setsPlanned = (s: ActiveWorkout) => s.workout.items.reduce((t, it) => t + it.sets, 0);
export const setsDone = (s: ActiveWorkout) => s.sets.reduce((t, l, i) => t + Math.min(l.length, s.workout.items[i]?.sets ?? 0), 0);
export const itemDone = (s: ActiveWorkout, i: number) => (s.sets[i]?.length ?? 0) >= (s.workout.items[i]?.sets ?? 0);
export const allDone = (s: ActiveWorkout) => s.workout.items.every((_, i) => itemDone(s, i));

/** Isian awal set berikutnya: set terakhir item ini, atau resep. */
export function defaultSet(s: ActiveWorkout, i: number): SetRecord {
  const it = s.workout.items[i];
  const last = s.sets[i]?.at(-1);
  if (last) return last;
  return {
    ...(it.load.kind === "load" ? { load: it.load.max } : {}),
    ...(it.load.kind === "band" ? { band: it.load.band } : {}),
    value: it.durationSec ?? parseRepRange(it.reps)?.hi ?? 1,
    unit: it.durationSec ? "sec" : "reps",
    rpe: it.rpe ?? 6,
    ...(it.tempo ? { tempo: true } : {}),
  };
}

const nextOpen = (s: ActiveWorkout, from: number) => {
  for (let i = from + 1; i < s.workout.items.length; i++) if (!itemDone(s, i)) return i;
  for (let i = 0; i < s.workout.items.length; i++) if (!itemDone(s, i)) return i;
  return from;
};

/** Centang satu set. Ada set/gerakan berikutnya → istirahat sesuai resep; item selesai → pindah ke gerakan berikutnya. */
export function completeSet(s: ActiveWorkout, i: number, rec: SetRecord, nowMs: number): ActiveWorkout {
  if (itemDone(s, i)) return s;
  const sets = s.sets.map((l, j) => (j === i ? [...l, rec] : l));
  const next: ActiveWorkout = { ...s, sets, timer: undefined };
  const finished = itemDone(next, i);
  const current = finished ? nextOpen(next, i) : i;
  const rest = s.workout.items[i].restSec;
  const more = !allDone(next);
  return { ...next, current, ...(more && rest > 0 ? { timer: { kind: "rest", endsAt: nowMs + rest * 1000, item: i } } : {}) };
}

/** Batalkan set terakhir item ini. */
export function undoSet(s: ActiveWorkout, i: number): ActiveWorkout {
  if (!s.sets[i]?.length) return s;
  return { ...s, sets: s.sets.map((l, j) => (j === i ? l.slice(0, -1) : l)), current: i, timer: undefined };
}

export function startHold(s: ActiveWorkout, i: number, nowMs: number): ActiveWorkout {
  const sec = s.workout.items[i]?.durationSec;
  return sec ? { ...s, current: i, timer: { kind: "hold", endsAt: nowMs + sec * 1000, item: i } } : s;
}

export const skipTimer = (s: ActiveWorkout): ActiveWorkout => ({ ...s, timer: undefined });

export const extendRest = (s: ActiveWorkout, nowMs: number): ActiveWorkout =>
  s.timer?.kind === "rest" ? { ...s, timer: { ...s.timer, endsAt: Math.max(s.timer.endsAt, nowMs) + REST_EXTEND_SEC * 1000 } } : s;

export const goTo = (s: ActiveWorkout, i: number): ActiveWorkout => (i >= 0 && i < s.workout.items.length ? { ...s, current: i } : s);

/** Sisa detik timer (0 = habis), atau undefined tanpa timer. */
export const timerLeft = (s: ActiveWorkout, nowMs: number) => (s.timer ? Math.max(0, Math.ceil((s.timer.endsAt - nowMs) / 1000)) : undefined);

/** Menit sejak mulai (minimal 1), untuk isian durasi session-RPE. */
export const elapsedMin = (s: ActiveWorkout, nowMs: number) => Math.max(1, Math.round((nowMs - Date.parse(s.startedAt)) / 60_000));

/** Entri log untuk satu item dari hasil set (dipakai mode latihan dan LogForm). */
export function logEntryFor(
  item: StrengthItem,
  rec: Pick<SetRecord, "load" | "band" | "value" | "rpe">,
  ctx: { id: string; date: string; deload: boolean; blockIndex: number },
): LogEntry {
  const target = item.durationSec ? { lo: item.durationSec, hi: item.durationSec } : (parseRepRange(item.reps) ?? { lo: rec.value, hi: rec.value });
  return {
    id: ctx.id,
    date: ctx.date,
    movement: item.movement,
    ...(item.load.kind === "load" && rec.load !== undefined ? { load: rec.load } : {}),
    ...(rec.band ? { band: rec.band } : {}),
    ...(item.tempo ? { tempo: true } : {}),
    ...(item.variantOf ? { variantOf: item.variantOf } : {}),
    value: rec.value,
    valueUnit: item.durationSec ? "sec" : "reps",
    target,
    rpe: rec.rpe,
    targetRpe: item.rpe ?? 6,
    deload: ctx.deload,
    blockIndex: ctx.blockIndex,
  };
}

/** Sesi selesai → sesi session-RPE + log ★ (set terakhir setiap ★ yang punya set). */
export function finishWorkout(
  s: ActiveWorkout,
  o: { rpe: number; durationMin: number; newId: () => string },
): { session: Omit<StSession, "updatedAt">; entries: LogEntry[] } {
  const w = s.workout;
  const date = wibDateOf(s.startedAt);
  const entries = w.items.flatMap((it, i) => {
    const last = s.sets[i]?.at(-1);
    return it.anchor && last ? [logEntryFor(it, last, { id: o.newId(), date, deload: w.deload, blockIndex: s.blockIndex })] : [];
  });
  return {
    session: {
      id: s.id,
      date,
      startedAt: s.startedAt,
      type: w.type,
      title: w.title,
      difficulty: w.difficulty,
      ...(s.planSessionId ? { planSessionId: s.planSessionId } : {}),
      durationMin: Math.round(o.durationMin),
      rpe: Math.round(o.rpe),
      setsDone: setsDone(s),
      setsPlanned: setsPlanned(s),
      movements: [...new Set(w.items.filter((it) => it.phase === "main").map((it) => it.movement))],
    },
    entries,
  };
}

/** Baca sesi aktif dari localStorage (mentah); bentuk tidak dikenal → null. */
export function parseActiveWorkout(raw: string | null): ActiveWorkout | null {
  if (!raw) return null;
  try {
    const x = JSON.parse(raw) as ActiveWorkout;
    if (x?.v !== 1 || typeof x.id !== "string" || Number.isNaN(Date.parse(x.startedAt)) || !Array.isArray(x.workout?.items) || !Array.isArray(x.sets)) return null;
    if (x.sets.length !== x.workout.items.length) return null;
    return { ...x, current: Math.min(Math.max(0, x.current | 0), x.workout.items.length - 1) };
  } catch {
    return null;
  }
}
