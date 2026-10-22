import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import profileJson from "@/config/athlete-profile.json";
import { defaultSettings, resolveProfile, type AthleteSettings } from "@/lib/athlete-settings";
import { CONDITION_IDS } from "@/lib/conditions";
import { feasibleLoads, MOVEMENT_EQUIPMENT } from "@/lib/equipment";
import { DIFFICULTIES, DURATIONS, STRENGTH_TYPES, blockContext, generateStrengthWorkout, validateStrength } from "@/lib/generator";
import { ANCHOR_SINCE } from "@/lib/generator/meta";
import { MOVEMENT_MEDIA } from "@/lib/movements/media";
import { baseProfile } from "@/lib/profile";

// Test aturan memakai profil contoh (kondisi + home gym lengkap), bukan JSON netral di repo.
vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

const lib = profileJson.movementLibrary;
const coreNames = [lib.upperPush, lib.upperPull, lib.lower, lib.stabilityAndCore, lib.prehab].flat().map((m) => m.name);
const allNames = [...coreNames, ...lib.warmupAndCooldown];

/** Gerakan 0.9 dari docs/movement-library-proposal.md. */
const NEW_MOVEMENTS = [
  "Side Plank",
  "Standing Band Hip Abduction",
  "Single-Leg Glute Bridge",
  "Rear-Foot-Elevated Split Squat",
  "DB Step-Up",
  "DB Plié Squat",
  "Seated Single-Leg Calf Raise",
  "Plank",
  "Band Reverse Fly",
  "DB Scaption",
  "Band External Rotation",
  "Seated Band Hamstring Curl",
  "Quadruped Hip Circles",
];
const BAND_ANCHORED = ["Band Reverse Fly", "Band External Rotation", "Standing Band Hip Abduction", "Seated Band Hamstring Curl"];
/** Keputusan audit (docs/movement-media-audit.md): tanpa padanan / ditolak pemilik. */
const WITHOUT_IMAGE = ["Dead Hang", "Negative Pull-Up", "Seated DB Scapular Retraction", "Clamshell", "Tibialis Wall Raise"];

const base = defaultSettings(baseProfile);
const make = (patch: Partial<AthleteSettings>) => resolveProfile(baseProfile, { ...base, ...patch });
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 7919 + 5);
const mainNames = (w: { items: { phase: string; movement: string }[] }) => w.items.filter((i) => i.phase === "main").map((i) => i.movement);
function allStrength(p = make({}), block = blockContext("2026-10-12", "2026-09-28"), free = false) {
  return STRENGTH_TYPES.flatMap((type) =>
    DURATIONS.flatMap((duration) =>
      DIFFICULTIES.flatMap((difficulty) => SEEDS.map((seed) => generateStrengthWorkout({ type, duration, difficulty, seed, block, free }, p))),
    ),
  );
}

describe("media gerakan", () => {
  it("setiap gerakan library punya entri media (gambar atau images: null eksplisit), tanpa entri yatim", () => {
    for (const n of allNames) {
      expect(MOVEMENT_MEDIA, n).toHaveProperty([n]);
      expect(MOVEMENT_MEDIA[n].images === null || MOVEMENT_MEDIA[n].images?.length === 2, n).toBe(true);
    }
    expect(Object.keys(MOVEMENT_MEDIA).sort()).toEqual([...allNames].sort());
  });

  it("setiap path gambar benar-benar ada di public/movements", () => {
    for (const [n, m] of Object.entries(MOVEMENT_MEDIA)) {
      for (const img of m.images ?? []) {
        expect(img, n).toMatch(/^\/movements\/[a-z0-9-]+\/[01]\.webp$/);
        expect(existsSync(path.join(process.cwd(), "public", img)), `${n}: ${img}`).toBe(true);
      }
    }
  });

  it("gambar ⇔ sumber free-exercise-db berlisensi Unlicense; tanpa gambar ⇔ tanpa sumber", () => {
    for (const [n, m] of Object.entries(MOVEMENT_MEDIA)) {
      if (m.images) expect({ n, source: m.source, license: m.license, hasId: !!m.sourceId }).toEqual({ n, source: "free-exercise-db", license: "Unlicense", hasId: true });
      else expect({ n, source: m.source, license: m.license, id: m.sourceId }).toEqual({ n, source: null, license: null, id: null });
    }
  });

  it("gerakan tanpa gambar sesuai keputusan audit", () => {
    expect(Object.entries(MOVEMENT_MEDIA).filter(([, m]) => !m.images).map(([n]) => n).sort()).toEqual([...WITHOUT_IMAGE].sort());
  });

  it("cue 2–3 per gerakan dan otot utama terisi", () => {
    for (const [n, m] of Object.entries(MOVEMENT_MEDIA)) {
      expect(m.cues.length, n).toBeGreaterThanOrEqual(2);
      expect(m.cues.length, n).toBeLessThanOrEqual(3);
      expect(m.primaryMuscles.length, n).toBeGreaterThan(0);
    }
  });

  it("catatan kondisi hanya memakai id dari katalog", () => {
    for (const m of Object.values(MOVEMENT_MEDIA)) for (const id of Object.keys(m.conditionNotes ?? {})) expect(CONDITION_IDS).toContain(id);
  });
});

describe("gerakan baru 0.9", () => {
  it("semua gerakan baru ada di library dan punya pemetaan alat", () => {
    for (const n of NEW_MOVEMENTS) expect(allNames).toContain(n);
    for (const n of allNames) expect(MOVEMENT_EQUIPMENT, n).toHaveProperty([n]);
  });

  it("beban gerakan baru bisa dirakit dari plat yang dimiliki (handle 2 kg) dan dalam rentang library", () => {
    const eq = { ...base.equipment, dumbbell: { enabled: true, handleKg: 2, handles: 2 } };
    for (const m of [lib.lower, lib.prehab, lib.upperPull].flat().filter((x) => NEW_MOVEMENTS.includes(x.name))) {
      const loads = feasibleLoads(m.name, m.weight, eq);
      if (loads) expect(loads.length, m.name).toBeGreaterThan(0);
    }
  });

  it("setiap gerakan baru benar-benar muncul di hasil generator (bisa dijangkau)", () => {
    const seen = new Set(allStrength(make({}), blockContext("2026-10-12", "2026-09-28"), true).flatMap((w) => w.items.map((i) => i.movement)));
    for (const n of NEW_MOVEMENTS) expect(seen, n).toContain(n);
  });

  it("lolos semua aturan generator dengan alat terisi & semua kondisi aktif", () => {
    const p = make({
      conditions: [...CONDITION_IDS],
      equipment: { ...base.equipment, dumbbell: { enabled: true, handleKg: 2, handles: 2 }, barbell: { enabled: true, barKg: 5 } },
    });
    for (const w of allStrength(p)) {
      expect(validateStrength(w, p.movementLibrary, p.rules)).toEqual([]);
      for (const it of w.items) if (it.rpe !== undefined) expect(it.rpe).toBeLessThanOrEqual(7);
    }
  });

  it("tanpa titik tambat band → gerakan band yang ditambatkan tidak pernah muncul", () => {
    const p = make({ equipment: { ...base.equipment, bandAnchor: false } });
    const names = allStrength(p).flatMap(mainNames);
    for (const n of BAND_ANCHORED) expect(names).not.toContain(n);
    expect(names).toContain("Lateral Band Walk"); // band tanpa tambatan tetap jalan
  });

  it("gerakan yang dilarang kondisi aktif tidak pernah muncul", () => {
    const p = make({ conditions: ["shoulder", "lbp"] });
    const names = allStrength(p).flatMap(mainNames);
    for (const n of ["Seated Overhead Press", "Overhead Triceps Extension", "DB Floor Pullover", "Barbell Squat"]) expect(names).not.toContain(n);
  });

  it("★ baru tidak menggeser ★ blok yang sedang berjalan; berlaku mulai blok berikutnya", () => {
    const fresh = Object.keys(ANCHOR_SINCE);
    const anchors = (block: ReturnType<typeof blockContext>, free = false) =>
      allStrength(make({}), block, free).flatMap((w) => w.items.filter((i) => i.anchor).map((i) => i.movement));
    // Blok 1 (mulai 28 Sep, sebelum gerakan ditambahkan 12 Okt): tidak ada ★ baru.
    expect(anchors(blockContext("2026-10-12", "2026-09-28")).filter((n) => fresh.includes(n))).toEqual([]);
    // Blok-blok berikutnya: ★ baru mulai muncul.
    const later = ["2026-10-26", "2026-11-23", "2026-12-21", "2027-01-18"].flatMap((d) => anchors(blockContext(d, "2026-09-28")));
    expect(later.some((n) => fresh.includes(n))).toBe(true);
    // Mode bebas: langsung boleh.
    expect(anchors(blockContext("2026-10-12", "2026-09-28"), true).some((n) => fresh.includes(n))).toBe(true);
  });
});
