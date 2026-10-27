import { describe, expect, it, vi } from "vitest";
import { defaultSettings, parseSettings, resolveProfile, type AthleteSettings } from "@/lib/athlete-settings";
import { DIFFICULTIES, DURATIONS, STRENGTH_TYPES, generateStrengthWorkout, validateStrength } from "@/lib/generator";
import { aboveLibrary, loadBounds, newRuleActive, safetyCap, SAFETY_CAPS } from "@/lib/load-bounds";
import { baseProfile, parseWeight, type Movement } from "@/lib/profile";
import { recommend, type LogEntry } from "@/lib/progression";
import { validatePart } from "@/lib/sync/parts";
import type { Equipment } from "@/lib/equipment";

// Profil contoh (home gym lengkap), bukan JSON netral di repo. Semua angka fiktif.
vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

const base = defaultSettings(baseProfile);
const ACCEPTED = { acceptedAt: "2026-10-27T01:00:00.000Z" };
// Batang 10 kg + plat 4 × 1,25 kg & 4 × 2,5 kg → barbell 10–25 kg per 2,5 kg; dumbbell handle 2 kg.
const gear: Equipment = {
  ...base.equipment,
  dumbbell: { enabled: true, handleKg: 2, handles: 2 },
  barbell: { enabled: true, barKg: 10 },
  plates: [
    { kg: 1.25, count: 4 },
    { kg: 2.5, count: 4 },
  ],
};
// Kondisi profil contoh dimatikan kecuali diminta, supaya batas keamanan hanya muncul di test yang memintanya.
const make = (patch: Partial<AthleteSettings>) => resolveProfile(baseProfile, { ...base, equipment: gear, conditions: [], ...patch });
const mv = (p: ReturnType<typeof make>, name: string): Movement => Object.values(p.movementLibrary).flat().find((m) => typeof m === "object" && m.name === name) as Movement;

let n = 0;
const entry = (movement: string, load: number, date: string, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `e${n++}`,
  date,
  movement,
  load,
  value: 12,
  valueUnit: "reps",
  target: { lo: 10, hi: 12 },
  rpe: 6,
  targetRpe: 6,
  deload: false,
  blockIndex: 0,
  ...over,
});

describe("aturan batas beban: persetujuan & toggle", () => {
  it("aktif hanya setelah persetujuan dan selama toggle rentang library mati", () => {
    expect(newRuleActive(undefined)).toBe(false);
    expect(newRuleActive({ limitToLibrary: false })).toBe(false);
    expect(newRuleActive(ACCEPTED)).toBe(true);
    expect(newRuleActive({ ...ACCEPTED, limitToLibrary: true })).toBe(false);
  });

  it("tersimpan di Setting, ikut sinkron per kunci, data rusak dibuang", () => {
    expect(parseSettings({ loadRule: { acceptedAt: "2026-10-27T01:00:00.000Z", limitToLibrary: true } }, baseProfile).loadRule).toEqual({
      acceptedAt: "2026-10-27T01:00:00.000Z",
      limitToLibrary: true,
    });
    expect(parseSettings({ loadRule: { acceptedAt: "kemarin", limitToLibrary: "ya" } }, baseProfile)).not.toHaveProperty("loadRule");
    expect(validatePart("settings", { ...base, loadRule: ACCEPTED }, baseProfile)?.loadRule).toEqual(ACCEPTED);
  });
});

describe("batas keamanan & aturan min()", () => {
  it("batas keamanan hanya saat kondisi terkait aktif", () => {
    expect(safetyCap("Barbell Squat", [])).toBeUndefined();
    expect(safetyCap("Barbell Squat", ["apt"])).toMatchObject({ kg: 16, condition: "apt" });
    expect(safetyCap("Seated Lateral Raise", ["apt"])).toBeUndefined();
    expect(safetyCap("Seated Lateral Raise", ["shoulder"])?.kg).toBe(3);
    for (const c of SAFETY_CAPS) expect(c.source.length).toBeGreaterThan(10);
  });

  it("aturan lama: batas atas library; aturan baru: min(alat, keamanan)", () => {
    expect(loadBounds("Barbell Squat", "10–16 kg", gear, [], undefined)?.cap).toEqual({ kg: 16, source: "library" });
    expect(loadBounds("Barbell Squat", "10–16 kg", gear, [], ACCEPTED)?.cap).toEqual({ kg: 25, source: "equipment" });
    expect(loadBounds("Barbell Squat", "10–16 kg", gear, ["apt"], ACCEPTED)?.cap).toEqual({ kg: 16, source: "safety", condition: "apt" });
    // Alat lebih ringan dari batas keamanan → alat yang menang.
    const light = { ...gear, plates: [{ kg: 1.25, count: 2 }] };
    expect(loadBounds("Barbell Squat", "10–16 kg", light, ["apt"], ACCEPTED)?.cap).toEqual({ kg: 12.5, source: "equipment" });
    // Alat belum bisa dicek → batas atas library.
    expect(loadBounds("Barbell Squat", "10–16 kg", { ...gear, barbell: { enabled: true } }, [], ACCEPTED)?.cap).toEqual({ kg: 16, source: "library" });
    expect(loadBounds("Glute Bridge", "Bodyweight", gear, [], ACCEPTED)).toBeUndefined();
  });

  it("profil efektif: batas & beban yang bisa dirakit sampai batas baru", () => {
    const oldRule = mv(make({}), "Barbell Squat");
    expect(oldRule.cap).toBeUndefined();
    expect(Math.max(...oldRule.loads!)).toBe(15);
    const newRule = mv(make({ loadRule: ACCEPTED }), "Barbell Squat");
    expect(newRule.cap).toEqual({ kg: 25, source: "equipment" });
    expect(Math.max(...newRule.loads!)).toBe(25);
    expect(mv(make({ loadRule: { ...ACCEPTED, limitToLibrary: true } }), "Barbell Squat").cap).toBeUndefined();
  });

  it("sepasang plat 2,5 kg mengubah batas alat", () => {
    const fewer = { ...gear, plates: [{ kg: 1.25, count: 4 }, { kg: 2.5, count: 2 }] };
    const more = { ...gear, plates: [{ kg: 1.25, count: 4 }, { kg: 2.5, count: 4 }] };
    const cap = (eq: Equipment) => mv(make({ equipment: eq, loadRule: ACCEPTED }), "Barbell Sumo Deadlift / Hip Thrust").cap!.kg;
    expect(cap(more) - cap(fewer)).toBe(5);
  });
});

describe("progresi dengan batas baru", () => {
  const squat = (patch: Partial<AthleteSettings>) => mv(make(patch), "Barbell Squat");
  const twice = (load: number) => [entry("Barbell Squat", load, "2026-10-20"), entry("Barbell Squat", load, "2026-10-23")];

  it("aturan lama: log di atas library di-clamp ke batas library", () => {
    const r = recommend(squat({}), twice(17.5), { deload: false });
    expect(r).toMatchObject({ action: "hold", load: 16 });
    expect(r?.kind === "load" && r.reason).toMatch(/batas library/);
  });

  it("aturan baru: mulai dari log terakhir tanpa lompatan, naik satu langkah beban yang bisa dirakit", () => {
    const m = squat({ loadRule: ACCEPTED });
    expect(recommend(m, twice(15), { deload: false })).toMatchObject({ action: "increase", from: 15, load: 17.5 });
    expect(recommend(m, twice(17.5), { deload: false })).toMatchObject({ action: "increase", from: 17.5, load: 20 });
    const atCap = recommend(m, twice(25), { deload: false });
    expect(atCap).toMatchObject({ action: "hold", load: 25 });
    expect(atCap?.kind === "load" && atCap.reason).toMatch(/batas alat/);
  });

  it("batas keamanan menahan beban dan menyebut alasannya", () => {
    const r = recommend(squat({ loadRule: ACCEPTED, conditions: ["apt"] }), twice(16), { deload: false });
    expect(r).toMatchObject({ action: "hold", load: 16 });
    expect(r?.kind === "load" && r.reason).toMatch(/batas keamanan/);
  });
});

describe("generator dengan aturan baru", () => {
  it("semua kombinasi: beban ≤ batas efektif dan selalu bisa dirakit; level tetap dari rentang library", () => {
    for (const conditions of [[], ["apt", "shoulder"]] as AthleteSettings["conditions"][]) {
      const p = make({ loadRule: ACCEPTED, conditions });
      for (const type of STRENGTH_TYPES)
        for (const duration of DURATIONS)
          for (const difficulty of DIFFICULTIES) {
            const w = generateStrengthWorkout({ type, duration, difficulty, seed: 7 }, p);
            expect(validateStrength(w, p.movementLibrary, p.rules)).toEqual([]);
            for (const it of w.items) {
              if (it.load.kind !== "load") continue;
              const m = mv(p, it.movement);
              const spec = parseWeight(m.weight);
              if (spec.kind !== "load") continue;
              expect(it.load.max).toBeLessThanOrEqual(m.cap!.kg);
              // Tanpa log/PR, resep generator tetap di rentang library (titik awal) bila ada beban yang bisa dirakit di sana.
              if (!m.loads || m.loads.some((v) => v >= spec.min && v <= spec.max)) expect(it.load.max, it.movement).toBeLessThanOrEqual(spec.max);
              if (m.loads?.length) expect(m.loads).toContain(it.load.max);
            }
          }
    }
  });

  it("label DI ATAS RENTANG AWAL hanya bila beban resep melewati batas atas library", () => {
    expect(aboveLibrary("10–16 kg", 16)).toBe(false);
    expect(aboveLibrary("10–16 kg", 17.5)).toBe(true);
    expect(aboveLibrary("Bodyweight", 50)).toBe(false);
  });
});
