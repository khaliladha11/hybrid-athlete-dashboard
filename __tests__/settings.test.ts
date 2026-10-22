import { describe, expect, it, vi } from "vitest";
import { defaultSettings, formatRaceTarget, parseRaceTarget, parseSettings, resolveProfile, sessionCoverage, type AthleteSettings } from "@/lib/athlete-settings";
import { goalFromProfile } from "@/lib/program";
import { CONDITION_IDS, type ConditionId } from "@/lib/conditions";
import { barbellLoads, dumbbellLoads, feasibleLoads } from "@/lib/equipment";
import {
  DIFFICULTIES,
  DURATIONS,
  STRENGTH_TYPES,
  generateRunWorkout,
  generateStrengthWorkout,
  runToText,
  validateStrength,
} from "@/lib/generator";
import { STABILITY_HIP } from "@/lib/generator/meta";
import { recommend, type LogEntry } from "@/lib/progression";
import { baseProfile, findMovement } from "@/lib/profile";
import { formatPace, formatRange, paceAtFraction, parseDuration, parseRange, vdot, zonesFromVdot } from "@/lib/run-zones";

// Test aturan memakai profil contoh (kondisi + home gym lengkap), bukan JSON netral di repo.
vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

const SEEDS = Array.from({ length: 8 }, (_, i) => i * 7919 + 3);
const base = defaultSettings(baseProfile);
const make = (patch: Partial<AthleteSettings>) => resolveProfile(baseProfile, { ...base, ...patch });
const withConditions = (ids: ConditionId[]) => make({ conditions: ids });

function allStrength(p: ReturnType<typeof make>) {
  return STRENGTH_TYPES.flatMap((type) =>
    DURATIONS.flatMap((duration) =>
      DIFFICULTIES.flatMap((difficulty) => SEEDS.map((seed) => generateStrengthWorkout({ type, duration, difficulty, seed }, p))),
    ),
  );
}
function allRun(p: ReturnType<typeof make>) {
  return DURATIONS.flatMap((duration) => DIFFICULTIES.flatMap((difficulty) => SEEDS.map((seed) => generateRunWorkout({ duration, difficulty, seed }, p))));
}
const mainNames = (w: { items: { phase: string; movement: string }[] }) => w.items.filter((i) => i.phase === "main").map((i) => i.movement);

describe("default Setting = profil JSON", () => {
  it("kondisi default: APT, shin splints, overpronation, MCU", () => {
    expect(base.conditions).toEqual(["apt", "shin", "overpronation", "mcu"]);
  });
  it("tanpa berat handle, beban tidak dibatasi alat (pakai rentang library)", () => {
    const p = resolveProfile(baseProfile, base);
    expect(findMovement("Floor Press", p.movementLibrary)?.loads).toBeUndefined();
  });
});

describe("kondisi aktif memengaruhi generator ST", () => {
  it("shin splints aktif → prehab wajib; nonaktif → tidak lagi diwajibkan", () => {
    const on = withConditions(["shin"]);
    for (const w of allStrength(on).filter((x) => x.type === "lower" || x.type === "fullBody")) {
      expect(mainNames(w)).toEqual(expect.arrayContaining(["Tibialis Wall Raise", "Eccentric Calf Raise"]));
    }
    const off = withConditions([]);
    const lower = allStrength(off).filter((x) => x.type === "lower");
    expect(lower.some((w) => !mainNames(w).includes("Tibialis Wall Raise"))).toBe(true);
    for (const w of lower) expect(validateStrength(w, off.movementLibrary, off.rules)).toEqual([]);
  });

  it("overpronation/PFP/ITBS → minimal satu gerakan stabilitas panggul", () => {
    for (const id of ["overpronation", "pfp", "itbs"] as const) {
      for (const w of allStrength(withConditions([id])).filter((x) => x.type === "lower" || x.type === "fullBody")) {
        expect(mainNames(w).some((n) => STABILITY_HIP.includes(n))).toBe(true);
      }
    }
  });

  it("APT / nyeri punggung bawah → Dead Bug wajib di Lower/Full; LBP tanpa Barbell Squat", () => {
    for (const w of allStrength(withConditions(["apt"])).filter((x) => x.type === "lower" || x.type === "fullBody")) {
      expect(mainNames(w)).toContain("Dead Bug");
    }
    for (const w of allStrength(withConditions(["lbp"]))) expect(mainNames(w)).not.toContain("Barbell Squat");
  });

  it("nyeri bahu → tanpa gerakan overhead", () => {
    const banned = ["Seated Overhead Press", "Overhead Triceps Extension", "DB Floor Pullover"];
    for (const w of allStrength(withConditions(["shoulder"]))) for (const n of banned) expect(mainNames(w)).not.toContain(n);
  });

  it("Achilles / plantar fasciitis → Eccentric Calf Raise di Lower/Full", () => {
    for (const id of ["achilles", "plantar"] as const) {
      for (const w of allStrength(withConditions([id])).filter((x) => x.type === "lower" || x.type === "fullBody")) {
        expect(mainNames(w)).toContain("Eccentric Calf Raise");
      }
    }
  });

  it("semua kondisi aktif sekaligus → semua kombinasi tetap valid", () => {
    const p = withConditions([...CONDITION_IDS]);
    for (const w of allStrength(p)) expect(validateStrength(w, p.movementLibrary, p.rules)).toEqual([]);
  });

  it("catatan kondisi mengikuti toggle (MCU, Spine-Friendly) + catatan bebas ikut tampil", () => {
    const off = make({ conditions: [], customConditions: ["Pergelangan kiri pegal"] });
    const w = generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "moderate", seed: 1 }, off);
    expect(w.notes.join(" ")).not.toMatch(/MCU|Spine-Friendly/);
    expect(w.notes).toContain("Catatan kondisimu: Pergelangan kiri pegal");
  });
});

describe("kondisi aktif memengaruhi generator lari", () => {
  it("cue cadence & rel kereta hanya bila kondisinya aktif", () => {
    for (const w of allRun(withConditions([]))) {
      const t = runToText(w);
      expect(t).not.toContain("175–180 SPM");
      expect(t).not.toMatch(/rel kereta/i);
    }
    for (const w of allRun(withConditions(["shin"]))) {
      expect(runToText(w)).toContain("175–180 SPM");
      expect(runToText(w)).not.toMatch(/rel kereta/i);
    }
  });

  it("Achilles → High 45/60 selalu Norwegian 4×4 (tanpa sprint 15/15)", () => {
    for (const w of allRun(withConditions(["achilles"])).filter((x) => x.difficulty === "high" && x.duration !== 30)) {
      expect(w.title).toMatch(/4×4/);
    }
  });
});

describe("alat → gerakan & beban", () => {
  const eq = { ...base.equipment, dumbbell: { enabled: true, handleKg: 2, handles: 2 }, barbell: { enabled: true, barKg: 5 } };

  it("sepasang dumbbell: plat dipasang berpasangan (4 keping per jenis untuk 2 dumbbell)", () => {
    // Plat 4×1,25 / 4×1,5 / 4×2 → per dumbbell +2,5 / +3 / +4 (bisa digabung), handle 2 kg; plat juga bisa dipegang langsung.
    expect(dumbbellLoads(eq, true)).toEqual([1.25, 1.5, 2, 4.5, 5, 6, 7.5, 8.5, 9, 11.5]);
  });

  it("barbell: batang + plat berpasangan", () => {
    expect(barbellLoads(eq)?.at(-1)).toBe(5 + 2 * 2 * 1.25 + 2 * 2 * 1.5 + 2 * 2 * 2);
  });

  it("beban yang diresepkan selalu bisa dirakit & dalam rentang library", () => {
    const p = make({ equipment: eq });
    for (const w of allStrength(p)) {
      expect(validateStrength(w, p.movementLibrary, p.rules)).toEqual([]);
      for (const it of w.items) {
        const m = findMovement(it.movement, p.movementLibrary);
        if (it.load.kind === "load" && m?.loads) {
          expect(m.loads).toContain(it.load.min);
          expect(m.loads).toContain(it.load.max);
        }
      }
    }
  });

  it("beban di luar jangkauan alat → gerakan tidak dipakai", () => {
    // Floor Press 10–20 kg/tangan; handle 1 kg tanpa plat → mustahil.
    const p = make({ equipment: { ...eq, dumbbell: { enabled: true, handleKg: 1, handles: 2 }, plates: [] } });
    expect(feasibleLoads("Floor Press", "10–20 kg/tangan", p.equipmentModel)).toEqual([]);
    expect(p.movementStatus["Floor Press"].available).toBe(false);
  });

  it("tanpa barbell/band/pull-up bar → gerakannya hilang, Clamshell jadi bodyweight", () => {
    const p = make({ equipment: { ...base.equipment, barbell: { enabled: false }, bands: [], pullUpBar: false } });
    const names = allStrength(p).flatMap(mainNames);
    for (const n of ["Barbell Squat", "Barbell Sumo Deadlift / Hip Thrust", "Lateral Band Walk", "Dead Hang"]) expect(names).not.toContain(n);
    expect(findMovement("Clamshell", p.movementLibrary)?.weight).toBe("Bodyweight");
    expect(names).not.toContain("Standing Band Hip Abduction");
    // Tanpa band, syarat stabilitas panggul tetap terpenuhi oleh Clamshell (bodyweight) atau Side Plank.
    for (const w of allStrength(p).filter((x) => x.type === "lower")) {
      expect(mainNames(w).some((n) => n === "Clamshell" || n === "Side Plank")).toBe(true);
    }
  });

  it("progresi naik ke beban berikutnya yang bisa dirakit", () => {
    const p = make({ equipment: eq });
    const m = findMovement("DB RDL Wall-Tap Method", p.movementLibrary)!;
    const e = (id: string, date: string): LogEntry => ({
      id, date, movement: m.name, load: m.loads![0], value: 12, valueUnit: "reps",
      target: { lo: 10, hi: 12 }, rpe: 6, targetRpe: 6, deload: false, blockIndex: 0,
    });
    const rec = recommend(m, [e("a", "2026-10-01"), e("b", "2026-10-03")], { deload: false });
    if (m.loads!.length > 1) expect(rec).toMatchObject({ kind: "load", action: "increase", load: m.loads![1] });
    else expect(rec).toMatchObject({ kind: "load", action: "hold" });
  });
});

describe("pilihan movement library", () => {
  it("gerakan yang tidak dipilih tidak pernah diresepkan", () => {
    const p = make({ movements: { "Floor Press": false, "Glute Bridge": false } });
    const names = allStrength(p).flatMap(mainNames);
    expect(names).not.toContain("Floor Press");
    expect(names).not.toContain("Glute Bridge");
  });

  it("gerakan wajib kondisi tetap terpilih walau pernah dicentang mati", () => {
    const p = make({ movements: { "Tibialis Wall Raise": false } });
    expect(p.movementStatus["Tibialis Wall Raise"].available).toBe(true);
  });

  it("Negative Pull-Up bisa diaktifkan dari Setting", () => {
    const p = make({ movements: { "Negative Pull-Up": true } });
    const w = generateStrengthWorkout({ type: "upperPull", duration: 45, difficulty: "moderate", seed: 9 }, p);
    expect(mainNames(w).slice(0, 2)).toEqual(["Dead Hang", "Negative Pull-Up"]);
  });
});

describe("zona lari: VDOT Daniels", () => {
  it("5K 30:40 ≈ VDOT 30; 5K 19:57 ≈ VDOT 50", () => {
    expect(vdot(5000, 30 * 60 + 40)).toBeCloseTo(30, 0);
    expect(vdot(5000, 19 * 60 + 57)).toBeCloseTo(50, 0);
  });

  it("pace threshold sesuai tabel Daniels (VDOT 50 → ±4:15/km, VDOT 30 → ±6:24/km)", () => {
    expect(formatPace(paceAtFraction(50, 0.88))).toBe("4:15");
    expect(formatPace(paceAtFraction(30, 0.88))).toBe("6:24");
  });

  it("urutan zona: interval < 4×4 < tempo < easy (makin lambat)", () => {
    const z = zonesFromVdot(31);
    expect(z.miniInterval.slow).toBeLessThanOrEqual(z.norwegian4x4.fast);
    expect(z.norwegian4x4.slow).toBeLessThanOrEqual(z.tempo.fast + 1);
    expect(z.tempo.slow).toBeLessThan(z.easy.fast);
  });

  it("parser pace & durasi", () => {
    expect(parseRange("8:00–8:50/km")).toEqual({ fast: 480, slow: 530 });
    expect(parseRange("5:50/km")).toEqual({ fast: 350, slow: 350 });
    expect(parseRange("abc")).toBeUndefined();
    expect(formatRange({ fast: 375, slow: 390 })).toBe("6:15–6:30/km");
    expect(parseDuration("65:30")).toBe(3930);
    expect(parseDuration("2:45:00")).toBe(9900);
    expect(parseDuration("1:75:00")).toBeUndefined();
  });

  it("zona dari Setting dipakai generator lari", () => {
    const p = make({ runZones: { tempo: "6:00–6:10/km" } });
    const w = generateRunWorkout({ duration: 45, difficulty: "moderate", seed: 1 }, p);
    expect(runToText(w)).toContain("6:00–6:10/km");
  });
});

describe("parseSettings tahan data rusak", () => {
  it("string kosong / JSON rusak / tipe salah → default", () => {
    expect(parseSettings("", baseProfile)).toEqual(base);
    expect(parseSettings("{rusak", baseProfile)).toEqual(base);
    expect(parseSettings({ conditions: "x", runZones: { easy: "cepat" }, equipment: 5 }, baseProfile)).toMatchObject({
      conditions: base.conditions,
      runZones: {},
      equipment: base.equipment,
    });
  });

  it("id kondisi asing dibuang, nilai valid dipertahankan (round-trip)", () => {
    const s: AthleteSettings = { ...base, conditions: ["pfp", "apt"], runZones: { easy: "7:30–8:10/km" }, movements: { "Floor Press": false } };
    const parsed = parseSettings(JSON.stringify({ ...s, conditions: ["pfp", "apt", "kanker"] }), baseProfile);
    expect(parsed.conditions).toEqual(["apt", "pfp"]);
    expect(parsed.runZones).toEqual({ easy: "7:30–8:10/km" });
    expect(parsed.movements).toEqual({ "Floor Press": false });
  });
});

describe("profil dasar di Setting (0.11)", () => {
  it("field profil di Setting menimpa JSON; yang kosong ikut JSON", () => {
    const p = make({ profile: { name: "Atlet Contoh", age: 30, raceTargets: ["Sub-25m 5K"], blockStart: "2026-01-05" } });
    expect(p.name).toBe("Atlet Contoh");
    expect(p.age).toBe(30);
    expect(p.targets?.raceTargets).toEqual(["Sub-25m 5K"]);
    expect(p.training?.blockStart).toBe("2026-01-05");
    expect(p.training?.blockWeeks).toBe(baseProfile.training?.blockWeeks);
    expect(p.occupation).toBe(baseProfile.occupation);
  });

  it("parseSettings membuang field profil yang rusak", () => {
    const parsed = parseSettings(
      { profile: { name: "  Rina  ", age: 7, occupation: 5, goals: ["Konsisten", "", 3], raceTargets: "x", blockStart: "2026-13-40" } },
      baseProfile,
    );
    expect(parsed.profile).toEqual({ name: "Rina", goals: ["Konsisten"] });
    expect(parseSettings({}, baseProfile).profile).toEqual({});
    expect(parseSettings("", baseProfile).profile).toEqual({});
  });

  it("target lomba dari pemilih waktu terbaca oleh Program", () => {
    expect(formatRaceTarget("5k", 28 * 60 + 30)).toBe("Sub-28.5m 5K");
    expect(formatRaceTarget("hm", 2 * 3600)).toBe("Sub-2h Half Marathon");
    expect(parseRaceTarget("Sub-28.5m 5K")).toEqual({ race: "5k", seconds: 1710 });
    expect(parseRaceTarget("Sub-1h 10K")).toEqual({ race: "10k", seconds: 3600 });
    expect(parseRaceTarget("Lari santai")).toBeUndefined();
    const p = make({ profile: { raceTargets: [formatRaceTarget("10k", 55 * 60), formatRaceTarget("fm", 4.5 * 3600)] } });
    expect(goalFromProfile("10k", p)).toBe(3300);
    expect(goalFromProfile("fm", p)).toBe(16200);
  });
});

describe("gerakan cadangan tanpa alat (0.11.2)", () => {
  const PUSH = ["Push-Up", "Knee Push-Up", "Wall Push-Up"];
  const PULL = ["Prone Y-T-W Raise", "Prone Reverse Snow Angel"];
  const noGear = { dumbbell: { enabled: false, handles: 2 }, barbell: { enabled: false }, plates: [], bands: [], pullUpBar: false, bench: false, bandAnchor: false, other: [] };

  it("profil beralat: cadangan tidak dipilih otomatis (rotasi lama tidak berubah)", () => {
    const p = make({});
    for (const n of [...PUSH, ...PULL]) {
      expect(p.movementStatus[n], n).toMatchObject({ fallback: true, selected: false, available: false, autoSelected: false });
    }
  });

  it("tanpa alat: cadangan aktif otomatis untuk dorong & tarik", () => {
    const p = make({ equipment: noGear as AthleteSettings["equipment"] });
    for (const n of [...PUSH, ...PULL]) expect(p.movementStatus[n], n).toMatchObject({ selected: true, available: true, autoSelected: true });
  });

  it("per kategori: semua gerakan dorong utama dimatikan → cadangan dorong aktif, tarik tidak", () => {
    const pushPrimary = Object.fromEntries(baseProfile.movementLibrary.upperPush.filter((m) => !m.fallback).map((m) => [m.name, false]));
    const p = make({ movements: pushPrimary });
    for (const n of PUSH) expect(p.movementStatus[n].selected, n).toBe(true);
    for (const n of PULL) expect(p.movementStatus[n].selected, n).toBe(false);
  });

  it("pilihan eksplisit di Setting menang atas default cadangan", () => {
    expect(make({ movements: { "Push-Up": true } }).movementStatus["Push-Up"]).toMatchObject({ selected: true, available: true, autoSelected: false });
    const off = make({ equipment: noGear as AthleteSettings["equipment"], movements: { "Wall Push-Up": false } });
    expect(off.movementStatus["Wall Push-Up"].selected).toBe(false);
    expect(off.movementStatus["Push-Up"].selected).toBe(true);
  });
});

describe("cakupan jenis sesi ST (pesan alat)", () => {
  const noGear = { dumbbell: { enabled: false, handles: 2 }, barbell: { enabled: false }, plates: [], bands: [], pullUpBar: false, bench: false, bandAnchor: false, other: [] };
  const allOff = (cat: "upperPush" | "upperPull") => Object.fromEntries(baseProfile.movementLibrary[cat].map((m) => [m.name, false]));

  it("profil beralat dan profil tanpa alat (dengan cadangan) bisa menyusun semua jenis sesi", () => {
    for (const p of [make({}), make({ equipment: noGear as AthleteSettings["equipment"] })]) {
      for (const t of ["fullBody", "upperPush", "upperPull", "lower"] as const) expect(sessionCoverage(t, p, baseProfile), t).toEqual({ ok: true });
    }
  });

  it("tanpa alat dan semua gerakan tarik dimatikan → pesan alat yang dibutuhkan + gerakan yang bisa diaktifkan", () => {
    const p = make({ equipment: noGear as AthleteSettings["equipment"], movements: allOff("upperPull") });
    const c = sessionCoverage("upperPull", p, baseProfile);
    expect(c.ok).toBe(false);
    if (c.ok) return;
    expect(c.category).toBe("upperPull");
    expect(c.needs).toContain("pull-up bar");
    expect(c.needs).toContain("dumbbell");
    // Kombinasi yang sudah tercakup kombinasi lebih kecil tidak disebut.
    expect(c.needs.some((n) => n.startsWith("dumbbell +"))).toBe(false);
    expect(c.selectable).toEqual(expect.arrayContaining(["Prone Y-T-W Raise", "Prone Reverse Snow Angel"]));
  });

  it("kondisi yang melarang gerakan tidak disarankan sebagai jalan keluar", () => {
    const p = make({ conditions: ["shoulder"], equipment: noGear as AthleteSettings["equipment"], movements: allOff("upperPush") });
    const c = sessionCoverage("upperPush", p, baseProfile);
    expect(c.ok).toBe(false);
    if (c.ok) return;
    expect(c.selectable).not.toContain("Seated Overhead Press");
  });
});
