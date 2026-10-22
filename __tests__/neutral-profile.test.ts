import { describe, expect, it } from "vitest";
import rawJson from "@/config/athlete-profile.json";
import { defaultSettings, resolveProfile } from "@/lib/athlete-settings";
import {
  DIFFICULTIES,
  DURATIONS,
  STRENGTH_TYPES,
  blockContext,
  estimateStrengthMinutes,
  generateRunWorkout,
  generateStrengthWorkout,
  runTotalMinutes,
  validateRun,
  validateStrength,
} from "@/lib/generator";
import { baseProfile, profile } from "@/lib/profile";
import { formatRange, ZONE_KEYS, zonesFromVdot } from "@/lib/run-zones";

/** Profil netral di repo (sejak 0.11): fork baru tidak mewarisi data siapa pun. */
const json = rawJson as Record<string, unknown> & { runZonesSource: { vdot: number; reason: string } };
const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1);
const BLOCKS = [blockContext("2026-01-05", "2026-01-05"), blockContext("2026-01-26", "2026-01-05")];

describe("config/athlete-profile.json netral", () => {
  it("tanpa identitas, target, kondisi, alat, atau tanggal blok", () => {
    expect(json.name).toBe("");
    expect(json).not.toHaveProperty("age");
    expect(json).not.toHaveProperty("occupation");
    expect(json).not.toHaveProperty("category");
    expect(json.targets).toEqual({ goals: [], raceTargets: [] });
    expect(json.conditions).toEqual([]);
    expect(baseProfile.training?.blockStart).toBeUndefined();
    const eq = profile.equipmentModel;
    expect(eq.dumbbell.enabled || eq.barbell.enabled || eq.pullUpBar || eq.bench || eq.bandAnchor).toBe(false);
    expect(eq.plates).toEqual([]);
    expect(eq.bands).toEqual([]);
  });

  it("zona default = zonesFromVdot(vdot yang dicatat), dengan alasan", () => {
    const z = zonesFromVdot(json.runZonesSource.vdot);
    for (const k of ZONE_KEYS) expect(baseProfile.runZones?.[k]?.pace).toBe(formatRange(z[k]));
    expect(json.runZonesSource.reason.length).toBeGreaterThan(20);
  });

  it("profil efektif default = profil netral (tanpa aturan kondisi)", () => {
    const p = resolveProfile(baseProfile, defaultSettings(baseProfile));
    expect(p.activeConditions).toEqual([]);
    expect(p.warnings).toEqual([]);
  });
});

describe("generator dengan profil netral", () => {
  it("lari: semua kombinasi durasi × kesulitan × seed × blok/bebas valid dan durasinya tepat", () => {
    let n = 0;
    for (const duration of DURATIONS)
      for (const difficulty of DIFFICULTIES)
        for (const seed of SEEDS)
          for (const block of [...BLOCKS, undefined]) {
            const w = generateRunWorkout({ duration, difficulty, seed, block, free: !block }, profile);
            expect(validateRun(w, profile.rules)).toEqual([]);
            expect(Math.abs(runTotalMinutes(w) - duration)).toBeLessThanOrEqual(2);
            n++;
          }
    expect(n).toBe(DURATIONS.length * DIFFICULTIES.length * SEEDS.length * 3);
  });

  it("strength bodyweight saja: semua jenis × durasi × kesulitan × 25 seed × blok/deload/bebas tidak error dan lolos aturan wajib", () => {
    const blocks = [blockContext("2026-01-05", "2026-01-05"), blockContext("2026-01-26", "2026-01-05"), blockContext("2026-02-02", "2026-01-05"), undefined];
    expect(blocks[1]?.deload).toBe(true);
    const category = { upperPush: "upperPush", upperPull: "upperPull", lower: "lower", fullBody: "lower" } as const;
    const seen = new Set<string>();
    let n = 0;
    for (const type of STRENGTH_TYPES)
      for (const duration of DURATIONS)
        for (const difficulty of DIFFICULTIES)
          for (const seed of SEEDS)
            for (const block of blocks) {
              const w = generateStrengthWorkout({ type, duration, difficulty, seed, block, free: !block }, profile);
              expect(validateStrength(w, profile.movementLibrary, profile.rules), `${type}/${duration}/${difficulty}/${seed}`).toEqual([]);
              expect(estimateStrengthMinutes(w)).toBeLessThanOrEqual(duration + 2);
              const names = new Set(profile.movementLibrary[category[type]].map((m) => m.name));
              expect(w.items.some((i) => names.has(i.movement)), `${type} tanpa gerakan utama`).toBe(true);
              for (const i of w.items) seen.add(i.movement);
              n++;
            }
    expect(n).toBe(STRENGTH_TYPES.length * DURATIONS.length * DIFFICULTIES.length * SEEDS.length * blocks.length);
    // Kelima gerakan cadangan tanpa alat benar-benar terpakai.
    for (const m of ["Push-Up", "Knee Push-Up", "Wall Push-Up", "Prone Y-T-W Raise", "Prone Reverse Snow Angel"]) expect(seen, m).toContain(m);
  });
});
