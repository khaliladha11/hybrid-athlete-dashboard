import { describe, expect, it } from "vitest";
import {
  PRIMARY_WEIGHT,
  SECONDARY_WEIGHT,
  heatSummary,
  levelOf,
  muscleHeat,
  muscleScores,
  muscleWeights,
  movementsFor,
  musclesOfRegion,
  rarelyTrained,
} from "@/lib/insight/muscle-load";
import type { WorkSet } from "@/lib/insight/strength-trends";
import { MOVEMENT_MEDIA } from "@/lib/movements/media";

const TODAY = "2026-01-08";
const set = (date: string, movement: string, sessionKey = `ses:${date}`): WorkSet => ({ date, movement, kind: "load", load: 10, value: 10, estimated: false, sessionKey });
const squat = MOVEMENT_MEDIA["Barbell Squat"];

describe("bobot otot", () => {
  it("utama 1, sekunder 0,5; utama menang bila keduanya", () => {
    expect([PRIMARY_WEIGHT, SECONDARY_WEIGHT]).toEqual([1, 0.5]);
    const w = muscleWeights("Barbell Squat");
    for (const m of squat.primaryMuscles) expect(w.get(m)).toBe(1);
    for (const m of squat.secondaryMuscles.filter((x) => !squat.primaryMuscles.includes(x))) expect(w.get(m)).toBe(0.5);
    expect(muscleWeights("Bukan Gerakan").size).toBe(0);
  });
});

describe("skor otot", () => {
  const work = [set("2026-01-06", "Barbell Squat"), set("2026-01-06", "Barbell Squat"), set("2026-01-07", "Barbell Squat"), set("2025-12-20", "Barbell Squat")];
  const quad = squat.primaryMuscles[0];

  it("frekuensi: maks 1 per sesi, volume: set × bobot", () => {
    expect(muscleScores(work, TODAY, 7, "frequency").get(quad)).toBe(2);
    expect(muscleScores(work, TODAY, 7, "volume").get(quad)).toBe(3);
  });

  it("rentang 7 vs 30 hari", () => {
    expect(muscleScores(work, TODAY, 30, "frequency").get(quad)).toBe(3);
    expect(muscleScores(work, TODAY, 7, "frequency").size).toBeGreaterThan(0);
    expect(muscleScores([], TODAY, 7, "volume").size).toBe(0);
  });

  it("tingkat 1–4 relatif terhadap skor tertinggi, legenda angka", () => {
    expect([levelOf(0, 4), levelOf(1, 4), levelOf(2, 4), levelOf(3, 4), levelOf(4, 4)]).toEqual([0, 1, 2, 3, 4]);
    expect(levelOf(0.5, 4)).toBe(1);
    const h = muscleHeat(work, TODAY, 7, "volume");
    expect(h.max).toBe(3);
    expect(h.legend).toEqual([0.8, 1.5, 2.3, 3]);
    expect(h.levels["front:quadriceps"]).toBe(4);
    expect(Object.values(h.levels).every((l) => l! >= 1 && l! <= 4)).toBe(true);
  });

  it("ringkasan dan kondisi kosong", () => {
    expect(heatSummary(muscleHeat([], TODAY, 7, "frequency"), 7, "frequency")).toEqual({ drawable: false, text: "Belum ada sesi ST tercatat di perangkat ini dalam 7 hari terakhir." });
    expect(heatSummary(muscleHeat(work, TODAY, 7, "frequency"), 7, "frequency").text).toMatch(/^Paling banyak dilatih 7 hari terakhir \(sesi berbobot\): /);
  });
});

describe("jarang dilatih", () => {
  const available = ["Barbell Squat", "Floor Press", "Supported Single-Arm Row"];

  it("otot utama gerakan tersedia tanpa kerja utama 14 hari", () => {
    const r = rarelyTrained([set("2026-01-02", "Barbell Squat")], available, TODAY)!;
    for (const m of MOVEMENT_MEDIA["Floor Press"].primaryMuscles) expect(r).toContain(m);
    for (const m of squat.primaryMuscles) expect(r).not.toContain(m);
  });

  it("kerja sekunder tidak cukup; otot dari gerakan tidak tersedia tidak didaftar", () => {
    // Lying DB Triceps Extension: Dada hanya sekunder → Dada tetap jarang dilatih (Floor Press tersedia).
    expect(rarelyTrained([set("2026-01-02", "Lying DB Triceps Extension")], ["Floor Press", "Lying DB Triceps Extension"], TODAY)).toEqual(["Dada"]);
    // Hanya Barbell Squat tersedia dan sudah dilatih: tidak ada yang didaftar walau Dada tidak pernah dilatih.
    expect(rarelyTrained([set("2026-01-02", "Barbell Squat")], ["Barbell Squat"], TODAY)).toEqual([]);
  });

  it("tanpa sesi 14 hari → null (bukan daftar semua otot)", () => {
    expect(rarelyTrained([set("2025-12-20", "Barbell Squat")], available, TODAY)).toBeNull();
    expect(rarelyTrained([], available, TODAY)).toBeNull();
  });
});

describe("ketuk otot", () => {
  it("gerakan tersedia saja, utama dulu", () => {
    const quad = squat.primaryMuscles[0];
    const r = movementsFor(quad, ["Barbell Squat", "Floor Press"]);
    expect(r.primary).toEqual(["Barbell Squat"]);
    expect(r.secondary).not.toContain("Floor Press");
    expect(movementsFor(quad, []).primary).toEqual([]);
  });

  it("region peta → otot kurasi", () => {
    expect(musclesOfRegion("front:quadriceps")).toEqual(["Paha depan"]);
    expect(musclesOfRegion("back:gluteal")).toContain("Gluteus");
  });
});
