import { describe, expect, it } from "vitest";
import { barbellLoads, dumbbellLoads, equipmentCap, feasibleLoads, hasNeed, normalizeEquipment, type Equipment } from "@/lib/equipment";

// Alat fiktif.
const base: Equipment = {
  dumbbell: { enabled: false, handles: 2 },
  barbell: { enabled: false },
  plates: [],
  bands: [],
  pullUpBar: false,
  bench: true,
  bandAnchor: false,
  other: [],
  items: [],
};
const fallback = { ...base };

describe("alat 0.14.0: migrasi & item berbobot tetap", () => {
  it("data alat lama tanpa daftar item → kosong; item rusak dibuang; id unik", () => {
    const old = { dumbbell: { enabled: true, handleKg: 2, handles: 2 }, barbell: { enabled: true, barKg: 5 }, plates: [{ kg: 2.5, count: 4 }], bands: ["Light"], pullUpBar: true, bench: true, bandAnchor: true, other: [] };
    expect(normalizeEquipment(old, fallback).items).toEqual([]);
    const withItems = normalizeEquipment(
      {
        ...old,
        items: [
          { id: "a", kind: "fixedDumbbell", kg: 7.5, count: 2 },
          { id: "a", kind: "kettlebell", kg: 12, count: 1 },
          { kind: "barbell", kg: 20, count: 1 },
          { id: "c", kind: "kettlebell", kg: -1, count: 1 },
          { id: "d", kind: "fixedDumbbell", kg: 5, count: 0 },
        ],
      },
      fallback,
    ).items;
    expect(withItems.map((i) => [i.kind, i.kg])).toEqual([
      ["fixedDumbbell", 7.5],
      ["kettlebell", 12],
    ]);
    expect(new Set(withItems.map((i) => i.id)).size).toBe(2);
  });

  it("dumbbell fixed: cukup untuk gerakan dumbbell walau dumbbell handle mati; sepasang butuh ≥ 2 buah", () => {
    const eq: Equipment = { ...base, items: [{ id: "f1", kind: "fixedDumbbell", kg: 7.5, count: 2 }, { id: "f2", kind: "fixedDumbbell", kg: 10, count: 1 }] };
    expect(hasNeed(eq, "dumbbell")).toBe(true);
    expect(dumbbellLoads(eq, true)).toEqual([7.5]);
    expect(dumbbellLoads(eq, false)).toEqual([7.5, 10]);
  });

  it("dumbbell handle + dumbbell fixed digabung; handle aktif tanpa berat → belum bisa dicek", () => {
    const eq: Equipment = { ...base, dumbbell: { enabled: true, handleKg: 2, handles: 2 }, plates: [{ kg: 1, count: 4 }], items: [{ id: "f", kind: "fixedDumbbell", kg: 8, count: 2 }] };
    expect(dumbbellLoads(eq, true)).toEqual([1, 2, 4, 8]);
    expect(dumbbellLoads({ ...eq, dumbbell: { enabled: true, handles: 2 } }, true)).toBeUndefined();
  });

  it("kettlebell hanya dicatat, tidak mengubah beban", () => {
    const eq: Equipment = { ...base, items: [{ id: "k", kind: "kettlebell", kg: 12, count: 1 }] };
    expect(hasNeed(eq, "dumbbell")).toBe(false);
    expect(dumbbellLoads(eq, false)).toBeUndefined();
  });
});

describe("batas alat", () => {
  const bar: Equipment = { ...base, barbell: { enabled: true, barKg: 10 }, plates: [{ kg: 2.5, count: 2 }] };

  it("beban terberat yang bisa dirakit; sepasang plat 2,5 kg menambah 5 kg", () => {
    expect(barbellLoads(bar)).toEqual([10, 15]);
    expect(equipmentCap("Barbell Squat", "10–16 kg", bar)).toBe(15);
    const more = { ...bar, plates: [{ kg: 2.5, count: 4 }] };
    expect(equipmentCap("Barbell Squat", "10–16 kg", more)).toBe(20);
  });

  it("belum bisa dicek (berat batang kosong) → tidak ada batas alat", () => {
    expect(equipmentCap("Barbell Squat", "10–16 kg", { ...bar, barbell: { enabled: true } })).toBeUndefined();
    expect(equipmentCap("Glute Bridge", "Bodyweight", bar)).toBeUndefined();
  });

  it("beban yang bisa dirakit: default rentang library, dengan batas atas baru bisa melewatinya", () => {
    const more = { ...bar, plates: [{ kg: 2.5, count: 4 }] };
    expect(feasibleLoads("Barbell Squat", "10–16 kg", more)).toEqual([10, 15]);
    expect(feasibleLoads("Barbell Squat", "10–16 kg", more, 20)).toEqual([10, 15, 20]);
  });
});
