import { describe, expect, it } from "vitest";
import type { StrengthItem, StrengthWorkout } from "@/lib/generator/types";
import { buildProgram, RACES, type RaceTarget } from "@/lib/program";
import { planSessions } from "@/lib/program/sessions";
import { applyPhaseRule, ST_PHASE_RULES, stPhaseKey, stSlots } from "@/lib/program/st-phase";
import { generatorHref, parseStrengthPrefill, toGenerator } from "@/lib/program/to-generator";
import type { Movement } from "@/lib/profile";
import { applyProgression, type LogEntry } from "@/lib/progression";

// Program fiktif mulai Senin 2026-01-05.
const START = "2026-01-05";
const program = (race: RaceTarget, raceDate?: string) => buildProgram({ race, goalSec: RACES[race].defaultGoalSec, startDate: START, runsPerWeek: 3, ...(raceDate ? { raceDate } : {}) });
const days = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

describe("aturan ST per fase", () => {
  it("kunci fase dari minggu program", () => {
    expect(stPhaseKey({ phase: "prebase", cutback: false, raceWeek: false })).toBe("base");
    expect(stPhaseKey({ phase: "base", cutback: true, raceWeek: false })).toBe("base");
    expect(stPhaseKey({ phase: "build", cutback: false, raceWeek: false })).toBe("build");
    expect(stPhaseKey({ phase: "build", cutback: true, raceWeek: false })).toBe("build-cutback");
    expect(stPhaseKey({ phase: "peak", cutback: false, raceWeek: false })).toBe("peak");
    expect(stPhaseKey({ phase: "taper", cutback: false, raceWeek: false })).toBe("taper");
    expect(stPhaseKey({ phase: "taper", cutback: false, raceWeek: true })).toBe("race");
  });

  it("Base Moderate 45'; Build High; Peak maintenance; Taper volume setengah, intensitas tetap", () => {
    expect(ST_PHASE_RULES.base).toMatchObject({ difficulty: "moderate", duration: 45, holdLoad: false });
    expect(ST_PHASE_RULES.base.maxSets).toBeUndefined();
    expect(ST_PHASE_RULES.build).toMatchObject({ difficulty: "high", duration: 45, holdLoad: false });
    expect(ST_PHASE_RULES["build-cutback"]).toMatchObject({ difficulty: "moderate" });
    expect(ST_PHASE_RULES.peak).toMatchObject({ difficulty: "moderate", duration: 30, maxSets: 2, holdLoad: true });
    expect(ST_PHASE_RULES.taper).toMatchObject({ difficulty: "moderate", duration: 30, maxSets: 2, maxAccessorySets: 1, holdLoad: true });
  });

  it("slot: ST kaki ≥ 8 hari sebelum Hari H, minggu lomba tanpa ST kaki, Upper ≥ 3 hari", () => {
    expect(stSlots("taper", { monday: "2026-03-16", wednesday: "2026-03-18", raceDate: "2026-03-29" })).toEqual({ lower: true, upper: true });
    expect(stSlots("taper", { monday: "2026-03-16", wednesday: "2026-03-18", raceDate: "2026-03-23" })).toEqual({ lower: false, upper: true });
    expect(stSlots("race", { monday: "2026-03-23", wednesday: "2026-03-25", raceDate: "2026-03-29" })).toEqual({ lower: false, upper: true });
    expect(stSlots("race", { monday: "2026-03-23", wednesday: "2026-03-25", raceDate: "2026-03-27" })).toEqual({ lower: false, upper: false });
  });
});

describe("jadwal ST program mengikuti fase", () => {
  for (const race of ["5k", "10k", "hm", "fm"] as const) {
    it(`${race}: Build High, Peak & Taper 30', ST kaki terakhir ≥ 8 hari, minggu lomba hanya Upper`, () => {
      const p = program(race);
      const s = planSessions(p, "x");
      for (const w of p.weeks) {
        const st = s.filter((x) => x.week === w.index && x.kind.startsWith("st-"));
        const key = stPhaseKey(w);
        for (const x of st) {
          expect(x.stPhase).toBe(key);
          expect(toGenerator(x)).toMatchObject({ to: "strength", difficulty: ST_PHASE_RULES[key].difficulty, duration: ST_PHASE_RULES[key].duration, phase: key });
        }
        if (w.raceWeek) expect(st.map((x) => x.kind)).toEqual(["st-upper"]);
        else expect(st.map((x) => x.kind)).toEqual(["st-lower", "st-upper"]);
      }
      const lowers = s.filter((x) => x.kind === "st-lower");
      expect(days(lowers.at(-1)!.plannedDate, p.raceDate)).toBeGreaterThanOrEqual(8);
      const upperRaceWeek = s.filter((x) => x.kind === "st-upper").at(-1)!;
      expect(days(upperRaceWeek.plannedDate, p.raceDate)).toBeGreaterThanOrEqual(3);
    });
  }

  it("HM: minggu taper sebelum minggu lomba punya ST Lower ringan", () => {
    const p = program("hm");
    const s = planSessions(p, "x");
    const taper = p.weeks.find((w) => w.phase === "taper" && !w.raceWeek)!;
    expect(s.filter((x) => x.week === taper.index && x.kind.startsWith("st-")).map((x) => x.title)).toEqual(["ST Lower ringan", "ST Upper ringan"]);
  });

  it("Hari H Jumat: Upper minggu lomba (Rabu, 2 hari sebelumnya) tidak dibuat", () => {
    const sunday = program("10k").raceDate;
    const friday = new Date(Date.parse(`${sunday}T00:00:00Z`) - 2 * 86_400_000).toISOString().slice(0, 10);
    const p = program("10k", friday);
    const last = p.weeks.at(-1)!;
    expect(planSessions(p, "x").filter((x) => x.week === last.index && x.kind.startsWith("st-"))).toEqual([]);
  });

  it("aturan fase ikut ke tautan generator; sesi tanpa fase (data lama) tetap perilaku lama", () => {
    const s = planSessions(program("hm"), "x").find((x) => x.stPhase === "peak" && x.kind === "st-lower")!;
    const pre = parseStrengthPrefill(Object.fromEntries(new URL(generatorHref(s, toGenerator(s))!, "https://x.test").searchParams));
    expect(pre).toMatchObject({ duration: 30, difficulty: "moderate", phase: "peak", sessionId: s.id });
    const { stPhase: _p, ...old } = s;
    expect(toGenerator({ ...old, intensity: "easy" })).toEqual({ to: "strength", type: "lower", duration: 45, difficulty: "easy" });
  });
});

// Workout fiktif untuk batas set.
const item = (over: Partial<StrengthItem>): StrengthItem => ({ phase: "main", movement: "X", sets: 3, reps: "10–12", load: { kind: "bodyweight" }, restSec: 60, ...over });
const w: StrengthWorkout = {
  kind: "strength",
  title: "Lower",
  type: "lower",
  duration: 30,
  difficulty: "moderate",
  seed: 1,
  scheme: "Standar",
  deload: false,
  items: [
    item({ phase: "warmup", movement: "Cat-Cow", sets: 1 }),
    item({ movement: "Barbell Squat", anchor: true, sets: 4, load: { kind: "load", min: 12, max: 12, unit: "kg", perHand: false } }),
    item({ movement: "Glute Bridge", sets: 3 }),
    item({ movement: "Side Plank", sets: 2, accessory: true }),
  ],
  notes: [],
};

describe("batas set fase", () => {
  it("Peak: gerakan inti maks 2 set; pemanasan tidak disentuh", () => {
    const r = applyPhaseRule(w, ST_PHASE_RULES.peak);
    expect(r.items.map((i) => i.sets)).toEqual([1, 2, 2, 2]);
    expect(r.notes.at(-1)).toBe("Peak: maintenance. Set gerakan inti maks 2, beban tidak dinaikkan.");
  });

  it("Taper: inti maks 2, aksesori 1 (volume ±50%)", () => {
    const r = applyPhaseRule(w, ST_PHASE_RULES.taper);
    expect(r.items.map((i) => i.sets)).toEqual([1, 2, 2, 1]);
    const before = w.items.filter((i) => i.phase === "main").reduce((t, i) => t + i.sets, 0);
    const after = r.items.filter((i) => i.phase === "main").reduce((t, i) => t + i.sets, 0);
    expect(after / before).toBeLessThanOrEqual(0.6);
  });

  it("Base/Build tanpa batas set → workout tidak berubah", () => {
    expect(applyPhaseRule(w, ST_PHASE_RULES.base)).toBe(w);
    expect(applyPhaseRule(w, ST_PHASE_RULES.build)).toBe(w);
  });
});

describe("beban ditahan di Peak/Taper", () => {
  const squat: Movement = { name: "Barbell Squat", weight: "10–16 kg" };
  const moves = new Map([[squat.name, squat]]);
  const log = (date: string, rpe: number, value = 12): LogEntry => ({ id: date, date, movement: squat.name, load: 12, value, valueUnit: "reps", target: { lo: 10, hi: 12 }, rpe, targetRpe: 6, deload: false, blockIndex: 0 });

  it("siap naik → tahan beban dengan alasan fase; tanpa fase tetap naik", () => {
    const entries = [log("2026-03-02", 6), log("2026-03-05", 6)];
    const normal = applyProgression(w, moves, entries).items[1];
    expect(normal.load).toMatchObject({ min: 13, max: 13 });
    const held = applyProgression(w, moves, entries, [], { holdLoad: "Peak" }).items[1];
    expect(held.load).toMatchObject({ min: 12, max: 12 });
    expect(held.progression).toBe("→ Siap naik, tetapi tahan 12 kg. Fase Peak: beban ditahan, volume dikurangi. Naik lagi setelah fase ini.");
  });

  it("RPE terlalu tinggi → turun beban tetap berlaku di fase apa pun", () => {
    const held = applyProgression(w, moves, [log("2026-03-05", 9)], [], { holdLoad: "Taper" }).items[1];
    expect(held.progression?.startsWith("↓")).toBe(true);
  });
});
