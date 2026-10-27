import { describe, expect, it } from "vitest";
import { BODY_BACK, BODY_FRONT } from "@/components/charts/muscle-paths";
import { MOVEMENT_MEDIA } from "@/lib/movements/media";
import { MUSCLE_REGIONS, muscleAriaLabel, muscleSummary, regionsOf, TEXT_ONLY_MOVEMENTS, TEXT_ONLY_MUSCLES } from "@/lib/movements/muscle-regions";

/** Region yang ada di path SVG (MuscleMapJS model pria). */
const FRONT = Object.keys(BODY_FRONT.parts);
const BACK = Object.keys(BODY_BACK.parts);

describe("pemetaan otot → region", () => {
  it("setiap gerakan library punya ≥ 1 otot utama terpetakan, atau tercatat teks saja dengan alasan", () => {
    for (const [name, m] of Object.entries(MOVEMENT_MEDIA)) {
      const mapped = m.primaryMuscles.some((x) => regionsOf(x).length > 0);
      if (TEXT_ONLY_MOVEMENTS[name]) {
        expect(mapped, `${name} tercatat teks saja padahal terpetakan`).toBe(false);
        expect(TEXT_ONLY_MOVEMENTS[name].length).toBeGreaterThan(10);
      } else expect(mapped, name).toBe(true);
    }
  });

  it("setiap nama otot di media terpetakan atau tercatat sebagai otot tanpa region", () => {
    const names = new Set(Object.values(MOVEMENT_MEDIA).flatMap((m) => [...m.primaryMuscles, ...m.secondaryMuscles]));
    for (const n of names) expect(n in MUSCLE_REGIONS || n in TEXT_ONLY_MUSCLES, n).toBe(true);
  });

  it("semua region menunjuk path yang ada di SVG", () => {
    for (const [muscle, regions] of Object.entries(MUSCLE_REGIONS))
      for (const r of regions) {
        const [view, slug] = r.split(":");
        expect(view === "front" ? FRONT : BACK, `${muscle} → ${r}`).toContain(slug);
      }
  });

  it("celah sumber: tibialis terpetakan, soleus ke betis belakang, lats ke punggung atas", () => {
    expect(regionsOf("Tulang kering (tibialis anterior)")).toEqual(["front:tibialis"]);
    expect(regionsOf("Betis (soleus)")).toEqual(["back:calves"]);
    expect(regionsOf("Latissimus")).toEqual(["back:upper-back"]);
    expect(regionsOf("Rotator cuff")).toEqual([]);
  });
});

describe("ringkasan otot sesi", () => {
  it("utama di satu gerakan tetap utama; sekunder tanpa duplikat; region dideduplikasi", () => {
    const s = muscleSummary(["Barbell Squat", "Barbell Sumo Deadlift / Hip Thrust", "Seated Single-Leg Calf Raise"]);
    for (const m of ["Barbell Squat", "Barbell Sumo Deadlift / Hip Thrust", "Seated Single-Leg Calf Raise"])
      for (const p of MOVEMENT_MEDIA[m].primaryMuscles) expect(s.primary).toContain(p);
    for (const x of s.secondary) expect(s.primary).not.toContain(x);
    for (const r of s.secondaryRegions) expect(s.primaryRegions).not.toContain(r);
    expect(new Set(s.primaryRegions).size).toBe(s.primaryRegions.length);
    expect(s.primaryRegions).toContain("back:calves");
  });

  it("gerakan tidak dikenal diabaikan; kosong → kosong", () => {
    expect(muscleSummary([])).toEqual({ primary: [], secondary: [], primaryRegions: [], secondaryRegions: [] });
    expect(muscleSummary(["Gerakan Fiktif"]).primary).toEqual([]);
  });

  it("label aksesibilitas menyebut otot utama dan sekunder", () => {
    expect(muscleAriaLabel({ primary: ["Gluteus", "Hamstring"], secondary: [] })).toBe("Otot utama: Gluteus, Hamstring; sekunder: tidak ada");
  });
});
