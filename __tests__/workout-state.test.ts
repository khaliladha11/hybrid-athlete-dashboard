import { describe, expect, it } from "vitest";
import type { StrengthItem, StrengthWorkout } from "@/lib/generator/types";
import {
  allDone,
  completeSet,
  defaultSet,
  elapsedMin,
  extendRest,
  finishWorkout,
  parseActiveWorkout,
  setsDone,
  setsPlanned,
  skipTimer,
  startHold,
  startWorkout,
  timerLeft,
  undoSet,
} from "@/lib/workout-state";

// Workout fiktif kecil: pemanasan, ★ berbeban, aksesori tahan.
const item = (over: Partial<StrengthItem>): StrengthItem => ({ phase: "main", movement: "X", sets: 2, reps: "8–12", load: { kind: "bodyweight" }, restSec: 60, rpe: 6, ...over });
const workout: StrengthWorkout = {
  kind: "strength",
  title: "Lower · Moderate 45'",
  type: "lower",
  duration: 45,
  difficulty: "moderate",
  seed: 1,
  scheme: "Standar",
  deload: false,
  items: [
    item({ phase: "warmup", movement: "Cat-Cow", sets: 1, reps: "10", restSec: 0 }),
    item({ movement: "Barbell Squat", anchor: true, load: { kind: "load", min: 10, max: 14, unit: "kg", perHand: false }, tempo: true }),
    item({ movement: "Side Plank", sets: 1, reps: undefined, durationSec: 30, restSec: 30 }),
  ],
  notes: [],
};
const T0 = Date.parse("2026-03-02T00:00:00.000Z");
const start = () => startWorkout({ id: "w1", nowIso: new Date(T0).toISOString(), workout, blockIndex: 2, planSessionId: "p:1:senin:st-lower" });

describe("mode latihan", () => {
  it("isian awal dari resep, lalu dari set terakhir", () => {
    let s = start();
    expect(defaultSet(s, 1)).toEqual({ load: 14, value: 12, unit: "reps", rpe: 6, tempo: true });
    expect(defaultSet(s, 2)).toMatchObject({ value: 30, unit: "sec" });
    s = completeSet(s, 1, { load: 12, value: 10, unit: "reps", rpe: 7 }, T0);
    expect(defaultSet(s, 1)).toEqual({ load: 12, value: 10, unit: "reps", rpe: 7 });
  });

  it("centang set → istirahat sesuai resep; item selesai → pindah ke gerakan berikutnya", () => {
    let s = start();
    s = completeSet(s, 0, defaultSet(s, 0), T0);
    expect(s.current).toBe(1);
    expect(s.timer).toBeUndefined(); // pemanasan tanpa istirahat
    s = completeSet(s, 1, defaultSet(s, 1), T0);
    expect(s.current).toBe(1);
    expect(s.timer).toEqual({ kind: "rest", endsAt: T0 + 60_000, item: 1 });
    expect(timerLeft(s, T0 + 15_500)).toBe(45);
    expect(timerLeft(s, T0 + 90_000)).toBe(0);
    s = completeSet(s, 1, defaultSet(s, 1), T0 + 120_000);
    expect(s.current).toBe(2);
    expect(setsDone(s)).toBe(3);
    expect(setsPlanned(s)).toBe(4);
  });

  it("timer dari jam: ditinggal lalu dibuka lagi tetap benar; +15 detik dan lewati", () => {
    let s = completeSet(start(), 1, defaultSet(start(), 1), T0);
    const reopened = parseActiveWorkout(JSON.stringify(s))!;
    expect(timerLeft(reopened, T0 + 50_000)).toBe(10);
    s = extendRest(reopened, T0 + 50_000);
    expect(timerLeft(s, T0 + 50_000)).toBe(25);
    expect(skipTimer(s).timer).toBeUndefined();
  });

  it("hitung mundur tahan untuk gerakan berdurasi saja", () => {
    const s = startHold(start(), 2, T0);
    expect(s.timer).toEqual({ kind: "hold", endsAt: T0 + 30_000, item: 2 });
    expect(startHold(start(), 1, T0).timer).toBeUndefined();
  });

  it("batalkan set terakhir; set tidak bisa melebihi rencana", () => {
    let s = completeSet(start(), 0, defaultSet(start(), 0), T0);
    expect(completeSet(s, 0, defaultSet(s, 0), T0)).toBe(s);
    s = undoSet(s, 0);
    expect(setsDone(s)).toBe(0);
    expect(s.current).toBe(0);
  });

  it("set terakhir tidak memicu istirahat; semua selesai", () => {
    let s = start();
    for (const i of [0, 1, 1, 2]) s = completeSet(s, i, defaultSet(s, i), T0);
    expect(allDone(s)).toBe(true);
    expect(s.timer).toBeUndefined();
  });

  it("selesai → sesi session-RPE dan log ★ dari set terakhir (tempo ikut)", () => {
    let s = start();
    s = completeSet(s, 1, { load: 12, value: 12, unit: "reps", rpe: 6, tempo: true }, T0);
    s = completeSet(s, 1, { load: 12, value: 11, unit: "reps", rpe: 7, tempo: true }, T0);
    let n = 0;
    const { session, entries } = finishWorkout(s, { rpe: 6, durationMin: 42, newId: () => `e${n++}` });
    expect(session).toMatchObject({ id: "w1", date: "2026-03-02", type: "lower", durationMin: 42, rpe: 6, setsDone: 2, setsPlanned: 4, planSessionId: "p:1:senin:st-lower" });
    expect(session.movements).toEqual(["Barbell Squat", "Side Plank"]);
    expect(entries).toEqual([
      {
        id: "e0",
        date: "2026-03-02",
        movement: "Barbell Squat",
        load: 12,
        tempo: true,
        value: 11,
        valueUnit: "reps",
        target: { lo: 8, hi: 12 },
        rpe: 7,
        targetRpe: 6,
        deload: false,
        blockIndex: 2,
      },
    ]);
  });

  it("rincian set (0.15.1): semua set yang dicentang, kg hanya untuk gerakan berbeban, detik untuk tahan", () => {
    let s = start();
    s = completeSet(s, 0, { value: 10, unit: "reps", rpe: 3 }, T0);
    s = completeSet(s, 1, { load: 12, value: 12, unit: "reps", rpe: 6 }, T0);
    s = completeSet(s, 1, { load: 14, value: 9, unit: "reps", rpe: 7 }, T0);
    s = completeSet(s, 2, { load: 5, value: 30, unit: "sec", rpe: 5 }, T0);
    const { session } = finishWorkout(s, { rpe: 6, durationMin: 40, newId: () => "e" });
    expect(session.sets).toEqual([
      { movement: "Cat-Cow", value: 10, unit: "reps" },
      { movement: "Barbell Squat", load: 12, value: 12, unit: "reps", tempo: true },
      { movement: "Barbell Squat", load: 14, value: 9, unit: "reps", tempo: true },
      { movement: "Side Plank", value: 30, unit: "sec" },
    ]);
  });

  it("★ tanpa set tidak dicatat; durasi dari jam mulai", () => {
    expect(finishWorkout(start(), { rpe: 3, durationMin: 10, newId: () => "x" }).entries).toEqual([]);
    expect(elapsedMin(start(), T0 + 44 * 60_000 + 20_000)).toBe(44);
    expect(elapsedMin(start(), T0)).toBe(1);
  });

  it("data sesi aktif rusak atau versi lain → null", () => {
    expect(parseActiveWorkout(null)).toBeNull();
    expect(parseActiveWorkout("{")).toBeNull();
    expect(parseActiveWorkout(JSON.stringify({ ...start(), v: 2 }))).toBeNull();
    expect(parseActiveWorkout(JSON.stringify({ ...start(), sets: [] }))).toBeNull();
  });
});
