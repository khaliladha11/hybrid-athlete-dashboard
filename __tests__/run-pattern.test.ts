import { describe, expect, it } from "vitest";
import { defaultSettings, resolveProfile } from "@/lib/athlete-settings";
import { DIFFICULTIES, DURATIONS, generateRunWorkout, runTotalMinutes, validateRun, type Difficulty, type Duration, type RunPattern } from "@/lib/generator";
import { baseProfile } from "@/lib/profile";

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1);
const p = resolveProfile(baseProfile, defaultSettings(baseProfile));
const gen = (duration: Duration, difficulty: Difficulty, seed: number, pattern?: RunPattern, profile = p) => generateRunWorkout({ duration, difficulty, seed, pattern }, profile);

/** Judul pola yang diharapkan untuk setiap pola yang diminta. */
const TITLE: Record<RunPattern, RegExp> = {
  continuous: /^Easy Z2 Continuous/,
  runWalk: /^Easy Run-Walk/,
  cadenceDrill: /^Easy Z2 \+ Cadence Drill/,
  tempo: /^Tempo (Continuous|\d+×)/,
  cruise: /^Cruise Interval/,
  progression: /^Progression Run/,
  "4x4": /^Norwegian 4×4/,
  "15/15": /^15\/15 Interval/,
};
const LEVEL: Record<RunPattern, Difficulty> = {
  continuous: "easy",
  runWalk: "easy",
  cadenceDrill: "easy",
  tempo: "moderate",
  cruise: "moderate",
  progression: "moderate",
  "4x4": "high",
  "15/15": "high",
};

describe("pola lari yang diminta (0.13.1)", () => {
  it("pola yang cocok selalu terpilih, tetap lolos aturan dan durasinya tepat", () => {
    for (const [pattern, re] of Object.entries(TITLE) as [RunPattern, RegExp][]) {
      const durations: Duration[] = LEVEL[pattern] === "high" ? [45, 60] : [...DURATIONS];
      for (const duration of durations) {
        for (const seed of SEEDS) {
          const w = gen(duration, LEVEL[pattern], seed, pattern);
          expect(w.title, `${pattern}/${duration}/${seed}`).toMatch(re);
          expect(validateRun(w, p.rules)).toEqual([]);
          expect(Math.abs(runTotalMinutes(w) - duration)).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("pola yang tidak cocok dengan level diabaikan: hasil sama seperti tanpa pola", () => {
    for (const seed of SEEDS) {
      expect(gen(45, "easy", seed, "4x4")).toEqual(gen(45, "easy", seed));
      expect(gen(45, "high", seed, "tempo")).toEqual(gen(45, "high", seed));
      expect(gen(30, "high", seed, "4x4")).toEqual(gen(30, "high", seed)); // 30' High selalu mini interval
      expect(gen(60, "moderate", seed, "runWalk")).toEqual(gen(60, "moderate", seed));
    }
  });

  it("15/15 tidak pernah dipaksa bila sprint dilarang kondisi (tendon Achilles)", () => {
    const achilles = resolveProfile(baseProfile, { ...defaultSettings(baseProfile), conditions: ["achilles"] });
    expect(achilles.rules.avoidSprints).toBe(true);
    for (const seed of SEEDS) expect(gen(45, "high", seed, "15/15", achilles).title).toMatch(/^Norwegian 4×4/);
  });

  it("variasi tetap ada di dalam pola (seed berbeda → susunan tempo berbeda)", () => {
    const titles = new Set(SEEDS.map((s) => gen(45, "moderate", s, "tempo").title));
    expect(titles.size).toBeGreaterThan(1);
    for (const d of DIFFICULTIES) expect(gen(45, d, 1, undefined)).toEqual(gen(45, d, 1));
  });
});
