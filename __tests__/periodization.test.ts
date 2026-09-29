import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES,
  DURATIONS,
  REP_SCHEMES,
  STRENGTH_TYPES,
  blockContext,
  cadenceTarget,
  generateRunWorkout,
  generateStrengthWorkout,
  runToText,
  type StrengthWorkout,
} from "@/lib/generator";

const START = "2026-09-28"; // Senin
const SEEDS = Array.from({ length: 30 }, (_, i) => i * 104_729 + 7);
const anchors = (w: StrengthWorkout) => w.items.filter((i) => i.anchor).map((i) => i.movement);
const mainSets = (w: StrengthWorkout) => w.items.filter((i) => i.phase === "main" && i.anchor).reduce((s, i) => s + i.sets, 0);

describe("blok periodisasi (Bompa: 3 minggu naik + 1 deload)", () => {
  it("menghitung minggu & deload dari tanggal", () => {
    expect(blockContext("2026-09-28", START)).toEqual({ index: 0, week: 1, weeks: 4, deload: false });
    expect(blockContext("2026-10-04", START)).toMatchObject({ index: 0, week: 1 }); // Minggu, masih minggu 1
    expect(blockContext("2026-10-05", START)).toMatchObject({ index: 0, week: 2, deload: false });
    expect(blockContext("2026-10-19", START)).toMatchObject({ index: 0, week: 4, deload: true });
    expect(blockContext("2026-10-26", START)).toMatchObject({ index: 1, week: 1, deload: false });
  });

  it("tanggal sebelum mulai / blockStart tidak valid → blok 1 minggu 1", () => {
    expect(blockContext("2026-09-01", START)).toMatchObject({ index: 0, week: 1, deload: false });
    expect(blockContext("2026-10-19", "bukan-tanggal")).toMatchObject({ index: 0, week: 1 });
  });
});

describe("ST: variasi sistematis (Kassiano 2022)", () => {
  const combos = STRENGTH_TYPES.flatMap((type) =>
    DURATIONS.flatMap((duration) => DIFFICULTIES.map((difficulty) => ({ type, duration, difficulty }))),
  );

  it("gerakan utama (★) sama di semua seed dalam satu blok", () => {
    const block = blockContext("2026-10-05", START);
    for (const c of combos) {
      const first = anchors(generateStrengthWorkout({ ...c, seed: SEEDS[0], block }));
      expect(first.length, `${c.type}`).toBeGreaterThan(0);
      for (const seed of SEEDS) expect(anchors(generateStrengthWorkout({ ...c, seed, block })), `${c.type}/${seed}`).toEqual(first);
    }
  });

  it("gerakan utama sama untuk tipe yang sama walau durasi/kesulitan beda", () => {
    const block = blockContext("2026-09-28", START);
    for (const type of STRENGTH_TYPES) {
      const sets = new Set(
        DURATIONS.flatMap((duration) =>
          DIFFICULTIES.map((difficulty) => {
            const a = anchors(generateStrengthWorkout({ type, duration, difficulty, seed: 1, block }));
            return a.slice(0, type === "fullBody" ? 3 : a.length).join("|");
          }),
        ),
      );
      expect(sets.size, type).toBe(1);
    }
  });

  it("gerakan utama berganti ketika blok berganti (setidaknya sebagian tipe)", () => {
    const changed = STRENGTH_TYPES.filter((type) => {
      const perBlock = new Set(
        [0, 1, 2, 3, 4, 5].map((i) =>
          anchors(generateStrengthWorkout({ type, duration: 45, difficulty: "moderate", seed: 1, block: { index: i, week: 1, weeks: 4, deload: false } })).join("|"),
        ),
      );
      return perBlock.size > 1;
    });
    expect(changed.length).toBeGreaterThanOrEqual(3);
  });

  it("aksesori & skema rep tetap bervariasi antar seed", () => {
    const block = blockContext("2026-09-28", START);
    const texts = new Set(SEEDS.map((seed) => JSON.stringify(generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "moderate", seed, block }).items)));
    expect(texts.size).toBeGreaterThan(3);
    const schemes = new Set(SEEDS.map((seed) => generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "moderate", seed, block }).scheme));
    expect(schemes).toEqual(new Set(Object.values(REP_SCHEMES).map((s) => s.label)));
  });

  it("skema rep mengikuti level: Easy tanpa 'Tegangan', High tanpa 'Volume'", () => {
    for (const seed of SEEDS) {
      expect(generateStrengthWorkout({ type: "fullBody", duration: 45, difficulty: "easy", seed }).scheme).not.toBe("Tegangan");
      expect(generateStrengthWorkout({ type: "fullBody", duration: 45, difficulty: "high", seed }).scheme).not.toBe("Volume");
    }
  });
});

describe("ST: minggu deload", () => {
  const normal = blockContext("2026-10-12", START); // minggu 3
  const deload = blockContext("2026-10-19", START); // minggu 4

  it("set gerakan utama tidak lebih banyak dari minggu biasa (Moderate/High)", () => {
    for (const type of STRENGTH_TYPES)
      for (const duration of DURATIONS)
        for (const difficulty of ["moderate", "high"] as const)
          for (const seed of SEEDS.slice(0, 10)) {
            const a = generateStrengthWorkout({ type, duration, difficulty, seed, block: normal });
            const b = generateStrengthWorkout({ type, duration, difficulty, seed, block: deload });
            expect(b.deload).toBe(true);
            expect(Math.max(...b.items.filter((i) => i.anchor).map((i) => i.sets))).toBeLessThanOrEqual(3);
            expect(mainSets(b), `${type}/${duration}/${difficulty}`).toBeLessThanOrEqual(mainSets(a));
          }
  });

  it("beban turun satu tingkat dan catatan deload muncul", () => {
    const a = generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "high", seed: 3, block: normal });
    const b = generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "high", seed: 3, block: deload });
    const maxLoad = (w: StrengthWorkout) => Math.max(0, ...w.items.map((i) => (i.load.kind === "load" ? i.load.max : 0)));
    expect(maxLoad(b)).toBeLessThan(maxLoad(a));
    expect(b.notes.join(" ")).toMatch(/deload/i);
    expect(a.notes.join(" ")).not.toMatch(/Minggu deload/);
  });
});

describe("lari: perpustakaan pola (Daniels) & cadence personal (Heiderscheit)", () => {
  const variants = (duration: (typeof DURATIONS)[number], difficulty: (typeof DIFFICULTIES)[number]) =>
    new Set(SEEDS.map((seed) => runToText(generateRunWorkout({ duration, difficulty, seed })).split("\n")[0].replace(/ · .*/, "").replace(/\d+/g, "#")));

  it("jumlah pola per level", () => {
    for (const d of DURATIONS) {
      expect(variants(d, "easy").size, `easy ${d}`).toBe(3);
      expect(variants(d, "moderate").size, `moderate ${d}`).toBeGreaterThanOrEqual(3);
      expect(variants(d, "high").size, `high ${d}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("progression run: Z2 lalu tempo tanpa jeda", () => {
    const w = SEEDS.map((seed) => generateRunWorkout({ duration: 45, difficulty: "moderate", seed })).find((x) => x.title.startsWith("Progression"));
    expect(w).toBeDefined();
    const main = w!.blocks.filter((b) => b.phase === "main");
    expect(main.map((b) => b.steps[0].hr)).toEqual(["< 140", "160–170"]);
  });

  it("target cadence: +5% bertahap, maksimal 180, pertahankan jika sudah ≥ 175", () => {
    expect(cadenceTarget(undefined)).toEqual({ target: 180 });
    expect(cadenceTarget(160).target).toBe(168);
    expect(cadenceTarget(172).target).toBe(180);
    expect(cadenceTarget(177)).toMatchObject({ target: 177 });
    expect(cadenceTarget(177).note).toMatch(/pertahankan/);
  });

  it("cadence drill memakai target personal dan catatan muncul di workout", () => {
    const w = SEEDS.map((seed) => generateRunWorkout({ duration: 45, difficulty: "easy", seed, cadenceSpm: 160 })).find((x) => x.title.includes("Cadence Drill"));
    expect(w).toBeDefined();
    const text = runToText(w!);
    expect(text).toContain("Fokus cadence 168 SPM");
    expect(text).toContain("target sesi ini 168 SPM");
  });

  it("minggu deload menambah catatan pada lari", () => {
    const w = generateRunWorkout({ duration: 45, difficulty: "high", seed: 1, block: blockContext("2026-10-19", START) });
    expect(w.notes.join(" ")).toMatch(/Minggu deload/);
  });
});

describe("ST: gerakan utama selalu multi-joint (NSCA)", () => {
  it("setiap ★ adalah compound atau progresi pull-up", async () => {
    const { COMPOUND_MOVEMENTS } = await import("@/lib/generator/meta");
    const allowed = new Set([...COMPOUND_MOVEMENTS, "Dead Hang", "Negative Pull-Up"]);
    for (const type of STRENGTH_TYPES)
      for (const index of [0, 1, 2, 3, 4, 5])
        for (const seed of SEEDS.slice(0, 5)) {
          const w = generateStrengthWorkout({ type, duration: 60, difficulty: "high", seed, block: { index, week: 1, weeks: 4, deload: false } });
          for (const name of anchors(w)) expect(allowed.has(name), `${type}: ${name}`).toBe(true);
        }
  });
});
