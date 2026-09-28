import { describe, expect, it } from "vitest";
import profileJson from "@/config/athlete-profile.json";
import {
  DIFFICULTIES,
  DURATIONS,
  STRENGTH_TYPES,
  MAX_STRENGTH_RPE,
  REQUIRED_PREHAB,
  estimateStrengthMinutes,
  generateRunWorkout,
  generateStrengthWorkout,
  isBannedMovement,
  runToHuaweiSets,
  runToText,
  runTotalMinutes,
  sanitizeStrength,
  strengthToText,
  validateRun,
  validateStrength,
  type StrengthWorkout,
} from "@/lib/generator";
import { parseWeight, profile, type Movement } from "@/lib/profile";
import { STABILITY_HIP } from "@/lib/generator/meta";

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1);
const TOL = 2;

const runCombos = DURATIONS.flatMap((duration) => DIFFICULTIES.map((difficulty) => ({ duration, difficulty })));
const strengthCombos = STRENGTH_TYPES.flatMap((type) =>
  DURATIONS.flatMap((duration) => DIFFICULTIES.map((difficulty) => ({ type, duration, difficulty }))),
);

/** Whitelist dibaca langsung dari JSON mentah, bukan dari helper aplikasi. */
const lib = profileJson.movementLibrary;
const officialNames = new Set<string>([
  ...lib.warmupAndCooldown,
  ...[lib.upperPush, lib.upperPull, lib.lower, lib.stabilityAndCore, lib.prehab].flat().map((m) => m.name),
]);
const libraryByName = new Map<string, Movement>(
  [lib.upperPush, lib.upperPull, lib.lower, lib.stabilityAndCore, lib.prehab].flat().map((m) => [m.name, m as Movement]),
);

const allStrength = strengthCombos.flatMap((c) => SEEDS.map((seed) => generateStrengthWorkout({ ...c, seed })));
const allRun = runCombos.flatMap((c) => SEEDS.map((seed) => generateRunWorkout({ ...c, seed })));

describe("6. Semua kombinasi input menghasilkan output valid", () => {
  it("lari: 3 durasi × 3 kesulitan = 9 kombinasi", () => {
    expect(runCombos).toHaveLength(9);
    for (const c of runCombos) {
      for (const seed of SEEDS) {
        const w = generateRunWorkout({ ...c, seed });
        expect(validateRun(w), `${c.duration}/${c.difficulty}/seed ${seed}`).toEqual([]);
        expect(runToText(w).length).toBeGreaterThan(0);
        expect(runToHuaweiSets(w)).toMatch(/Set 1: /);
      }
    }
  });

  it("ST: 4 tipe × 3 durasi × 3 kesulitan = 36 kombinasi", () => {
    expect(strengthCombos).toHaveLength(36);
    for (const c of strengthCombos) {
      for (const seed of SEEDS) {
        const w = generateStrengthWorkout({ ...c, seed });
        expect(validateStrength(w), `${c.type}/${c.duration}/${c.difficulty}/seed ${seed}`).toEqual([]);
        expect(w.items.some((i) => i.phase === "warmup")).toBe(true);
        expect(w.items.some((i) => i.phase === "main")).toBe(true);
        expect(w.items.some((i) => i.phase === "cooldown")).toBe(true);
        expect(strengthToText(w)).not.toMatch(/\|/); // tanpa tabel Markdown
      }
    }
  });

  it("seed yang sama deterministik, seed berbeda bisa memberi variasi", () => {
    const a = generateStrengthWorkout({ type: "fullBody", duration: 45, difficulty: "moderate", seed: 42 });
    const b = generateStrengthWorkout({ type: "fullBody", duration: 45, difficulty: "moderate", seed: 42 });
    expect(a).toEqual(b);
    const variants = new Set(SEEDS.map((seed) => strengthToText(generateStrengthWorkout({ type: "fullBody", duration: 45, difficulty: "moderate", seed }))));
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe("1. Total durasi akurat (±2 menit)", () => {
  it("lari", () => {
    for (const w of allRun) {
      expect(Math.abs(runTotalMinutes(w) - w.duration)).toBeLessThanOrEqual(TOL);
    }
  });

  it("lari: durasi tepat sama dengan pilihan user", () => {
    for (const w of allRun) expect(runTotalMinutes(w)).toBe(w.duration);
  });

  it("ST", () => {
    for (const w of allStrength) {
      expect(Math.abs(estimateStrengthMinutes(w) - w.duration), w.title).toBeLessThanOrEqual(TOL);
    }
  });
});

describe("2. RPE ST tidak pernah > 7", () => {
  it("semua item", () => {
    for (const w of allStrength) {
      for (const it of w.items) if (it.rpe !== undefined) expect(it.rpe).toBeLessThanOrEqual(MAX_STRENGTH_RPE);
    }
  });

  it("RPE sesuai level: Easy 5, Moderate 6, High 7", () => {
    const expected = { easy: 5, moderate: 6, high: 7 } as const;
    for (const w of allStrength) {
      for (const it of w.items.filter((i) => i.phase === "main")) expect(it.rpe).toBe(expected[w.difficulty]);
    }
  });

  it("sanitizer meng-clamp RPE yang kebablasan", () => {
    const w = generateStrengthWorkout({ type: "lower", duration: 30, difficulty: "high", seed: 1 });
    const tampered: StrengthWorkout = { ...w, items: w.items.map((i) => (i.phase === "main" ? { ...i, rpe: 9 } : i)) };
    expect(validateStrength(tampered).some((m) => m.includes("RPE"))).toBe(true);
    const clean = sanitizeStrength(tampered);
    for (const it of clean.items) if (it.rpe !== undefined) expect(it.rpe).toBeLessThanOrEqual(7);
  });
});

describe("3. Beban tidak melampaui batas movement library", () => {
  it("semua item berbeban", () => {
    for (const w of allStrength) {
      for (const it of w.items) {
        const m = libraryByName.get(it.movement);
        if (!m) continue;
        const spec = parseWeight(m.weight);
        if (it.load.kind === "load") {
          expect(spec.kind, it.movement).toBe("load");
          if (spec.kind !== "load") continue;
          expect(it.load.max, `${it.movement} ${w.title}`).toBeLessThanOrEqual(spec.max);
          expect(it.load.min).toBeGreaterThanOrEqual(spec.min);
          expect(it.load.min).toBeLessThanOrEqual(it.load.max);
        } else {
          expect(it.load.kind).toBe(spec.kind);
        }
      }
    }
  });

  it("sanitizer meng-clamp beban yang melebihi batas", () => {
    const w = generateStrengthWorkout({ type: "upperPush", duration: 45, difficulty: "high", seed: 3 });
    const tampered: StrengthWorkout = {
      ...w,
      items: w.items.map((i) => (i.load.kind === "load" ? { ...i, load: { ...i.load, max: 999 } } : i)),
    };
    expect(validateStrength(tampered).some((m) => m.includes("Beban"))).toBe(true);
    expect(validateStrength(sanitizeStrength(tampered)).filter((m) => m.includes("Beban"))).toEqual([]);
  });
});

describe("4. Lower & Full Body selalu berisi prehab + stabilitas panggul", () => {
  it("Tibialis Wall Raise + Eccentric Calf Raise", () => {
    for (const w of allStrength.filter((x) => x.type === "lower" || x.type === "fullBody")) {
      const names = w.items.filter((i) => i.phase === "main").map((i) => i.movement);
      for (const req of REQUIRED_PREHAB) expect(names, w.title).toContain(req);
      expect(names).toContain("Tibialis Wall Raise");
      expect(names).toContain("Eccentric Calf Raise");
    }
  });

  it("minimal satu gerakan stabilitas panggul", () => {
    for (const w of allStrength.filter((x) => x.type === "lower" || x.type === "fullBody")) {
      expect(w.items.some((i) => STABILITY_HIP.includes(i.movement)), w.title).toBe(true);
    }
  });
});

describe("5. Semua gerakan terdaftar di athlete-profile.json", () => {
  it("whitelist", () => {
    for (const w of allStrength) {
      for (const it of w.items) expect(officialNames.has(it.movement), it.movement).toBe(true);
    }
  });

  it("gerakan dengan available=false tidak pernah diresepkan", () => {
    const disabled = [...libraryByName.values()].filter((m) => m.available === false).map((m) => m.name);
    for (const w of allStrength) for (const it of w.items) expect(disabled).not.toContain(it.movement);
  });

  it("Spine-Friendly: tidak ada pola axial loading berat", () => {
    for (const w of allStrength) for (const it of w.items) expect(isBannedMovement(it.movement)).toBe(false);
    expect(isBannedMovement("Conventional Deadlift")).toBe(true);
    expect(isBannedMovement("Barbell Back Squat")).toBe(true);
  });

  it("sanitizer membuang gerakan karangan", () => {
    const w = generateStrengthWorkout({ type: "lower", duration: 30, difficulty: "easy", seed: 5 });
    const tampered: StrengthWorkout = {
      ...w,
      items: [...w.items, { ...w.items.find((i) => i.phase === "main")!, movement: "Conventional Deadlift" }],
    };
    expect(validateStrength(tampered).length).toBeGreaterThan(0);
    expect(sanitizeStrength(tampered).items.map((i) => i.movement)).not.toContain("Conventional Deadlift");
  });
});

describe("Aturan tambahan", () => {
  it("Upper Pull diawali Dead Hang (progresi pull-up)", () => {
    for (const w of allStrength.filter((x) => x.type === "upperPull")) {
      expect(w.items.find((i) => i.phase === "main")?.movement).toBe("Dead Hang");
    }
  });

  it("Negative Pull-Up otomatis masuk setelah di-available-kan", () => {
    const unlocked = structuredClone(profile);
    unlocked.movementLibrary.upperPull = unlocked.movementLibrary.upperPull.map((m) =>
      m.name === "Negative Pull-Up" ? { ...m, available: true } : m,
    );
    const w = generateStrengthWorkout({ type: "upperPull", duration: 45, difficulty: "moderate", seed: 9 }, unlocked);
    const main = w.items.filter((i) => i.phase === "main").map((i) => i.movement);
    expect(main.slice(0, 2)).toEqual(["Dead Hang", "Negative Pull-Up"]);
  });

  it("lari: selalu ada pengingat cadence 175–180 & cue rel kereta", () => {
    for (const w of allRun) {
      const text = runToText(w);
      expect(text).toContain("175–180 SPM");
      expect(text).toMatch(/rel kereta/i);
    }
  });

  it("lari Easy: HR < 140; Moderate: tempo HR 160–170", () => {
    for (const w of allRun) {
      const runSteps = w.blocks.filter((b) => b.phase === "main").flatMap((b) => b.steps).filter((s) => s.kind === "run");
      if (w.difficulty === "easy") for (const s of runSteps) expect(s.hr).toBe("< 140");
      if (w.difficulty === "moderate") expect(runSteps.some((s) => s.hr === "160–170" && s.pace === "6:15–6:30/km")).toBe(true);
    }
  });

  it("lari High: 45/60 = Norwegian 4×4, 30 = mini interval", () => {
    for (const w of allRun.filter((x) => x.difficulty === "high")) {
      const main = w.blocks.find((b) => b.phase === "main")!;
      if (w.duration === 30) {
        expect(main.steps[0].pace).toBe("5:15–5:35/km");
      } else {
        expect(main.repeat).toBe(4);
        expect(main.steps.map((s) => s.durationMin)).toEqual([4, 3]);
        expect(main.steps[0].pace).toBe("5:50/km");
      }
    }
  });
});
