import { describe, expect, it, vi } from "vitest";
import { defaultSettings, resolveProfile } from "@/lib/athlete-settings";
import { generateStrengthWorkout } from "@/lib/generator";
import { baseProfile, type Movement } from "@/lib/profile";
import { applyProgression, type LogEntry } from "@/lib/progression";
import { bestPr, compactPrTombstones, detectPrs, latestPr, mergePrs, normalizePr, normalizePrs, prHistory, tombstonePr, type PrEntry } from "@/lib/prs";
import { mergePart, changedKeys } from "@/lib/sync/merge";
import { validatePart } from "@/lib/sync/parts";

// Profil contoh & PR fiktif.
vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

const LIB = new Set(["Floor Press", "Barbell Squat", "Glute Bridge"]);
const T = "2026-10-27T01:00:00.000Z";
const pr = (id: string, movement: string, loadKg: number, date: string, over: Partial<PrEntry> = {}): PrEntry => ({
  id,
  movement,
  loadKg,
  date,
  source: "manual",
  updatedAt: `${date}T00:00:00.000Z`,
  ...over,
});
let n = 0;
const log = (movement: string, load: number, date: string, value = 12, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `l${n++}`,
  date,
  movement,
  load,
  value,
  valueUnit: "reps",
  target: { lo: 10, hi: 12 },
  rpe: 6,
  targetRpe: 6,
  deload: false,
  blockIndex: 0,
  ...over,
});

describe("validasi & gabungan PR", () => {
  it("hanya gerakan library; beban wajib; set/rep boleh tidak diketahui; data rusak dibuang", () => {
    expect(normalizePr(pr("a", "Floor Press", 10, "2026-10-25"), LIB)).toEqual(pr("a", "Floor Press", 10, "2026-10-25"));
    expect(normalizePr(pr("a", "Seated DB Curl", 7, "2026-10-25"), LIB)).toBeNull();
    expect(normalizePr({ ...pr("a", "Floor Press", 10, "2026-10-25"), loadKg: 0 }, LIB)).toBeNull();
    expect(normalizePr({ ...pr("a", "Floor Press", 10, "2026-10-25"), sets: 3, reps: 8 }, LIB)).toMatchObject({ sets: 3, reps: 8 });
    expect(normalizePr({ ...pr("a", "Floor Press", 10, "2026-10-25"), sets: null, reps: null }, LIB)).not.toHaveProperty("sets");
    expect(normalizePr({ ...pr("a", "Floor Press", 10, "25 Okt") }, LIB)).toBeNull();
    expect(normalizePrs([pr("a", "Floor Press", 10, "2026-10-25"), "rusak", { id: "b" }], LIB)).toHaveLength(1);
  });

  it("gabungan per id: tombstone menang, lalu yang terbaru; komutatif & idempoten", () => {
    const a = pr("a", "Floor Press", 10, "2026-10-25");
    const edited = { ...a, loadKg: 11, updatedAt: "2026-10-26T00:00:00.000Z" };
    const gone = tombstonePr(a, T);
    expect(mergePrs([a], [edited])).toEqual([edited]);
    expect(mergePrs([edited], [gone])).toEqual([gone]);
    expect(mergePrs([gone], [edited])).toEqual(mergePrs([edited], [gone]));
    const m = mergePrs([a, pr("b", "Barbell Squat", 17, "2026-10-25")], [edited]);
    expect(mergePrs(m, m)).toEqual(m);
    expect(compactPrTombstones([gone], Date.parse(T) + 91 * 86_400_000)).toEqual([]);
  });

  it("PR terbaik (beban, lalu rep), terbaru, dan riwayat tanpa entri terhapus", () => {
    const list = [pr("a", "Floor Press", 10, "2026-10-01", { reps: 8 }), pr("b", "Floor Press", 10, "2026-10-10", { reps: 10 }), pr("c", "Floor Press", 9, "2026-10-20"), tombstonePr(pr("d", "Floor Press", 20, "2026-10-21"), T)];
    expect(bestPr(list, "Floor Press")?.id).toBe("b");
    expect(latestPr(list, "Floor Press")?.id).toBe("c");
    expect(prHistory(list, "Floor Press").map((p) => p.id)).toEqual(["c", "b", "a"]);
  });
});

describe("PR otomatis dari log", () => {
  it("sesi yang mengalahkan PR terbaik (manual atau dari log) menjadi PR; id deterministik; tidak dobel", () => {
    const manual = [pr("m", "Floor Press", 10, "2026-10-25")];
    const l = [log("Floor Press", 10, "2026-10-26", 12), log("Floor Press", 11, "2026-10-27", 8), log("Floor Press", 10.5, "2026-10-28"), log("Floor Press", 11, "2026-10-29", 10)];
    const fresh = detectPrs(l, manual, T, LIB);
    // 10 kg × 12 mengalahkan PR manual 10 kg dengan rep tidak diketahui; lalu 11 × 8 dan 11 × 10.
    expect(fresh.map((p) => [p.loadKg, p.reps, p.source])).toEqual([
      [10, 12, "log"],
      [11, 8, "log"],
      [11, 10, "log"],
    ]);
    expect(fresh[1].id).toBe(`log-${l[1].id}`);
    // Beban sama dengan PR manual tapi rep PR manual tidak diketahui → rep lebih banyak = PR.
    expect(detectPrs([l[0]], manual, T, LIB)).toHaveLength(1);
    expect(detectPrs(l, [...manual, ...fresh], T, LIB).filter((p) => p.loadKg === 11)).toEqual([]);
  });

  it("gerakan tahan, bodyweight, terhapus, dan di luar library diabaikan", () => {
    const l = [log("Floor Press", 10, "2026-10-26", 30, { valueUnit: "sec" }), log("Seated DB Curl", 7, "2026-10-26"), log("Floor Press", 12, "2026-10-26", 10, { deletedAt: T })];
    expect(detectPrs(l, [], T, LIB)).toEqual([]);
  });
});

describe("PR sebagai titik awal progresi (aturan batas beban aktif)", () => {
  const base = defaultSettings(baseProfile);
  const gear = { ...base.equipment, dumbbell: { enabled: true, handleKg: 2, handles: 2 }, barbell: { enabled: true, barKg: 10 }, plates: [{ kg: 1.25, count: 4 }, { kg: 2.5, count: 4 }] };
  const profileWith = (accepted: boolean) =>
    resolveProfile(baseProfile, { ...base, equipment: gear, conditions: [], ...(accepted ? { loadRule: { acceptedAt: T } } : {}) });
  const movementsOf = (p: ReturnType<typeof profileWith>) =>
    new Map(Object.values(p.movementLibrary).flat().filter((m): m is Movement => typeof m === "object").map((m) => [m.name, m]));
  // Gerakan ★ berbeban pertama di sesi lower contoh.
  const anchorOf = (p: ReturnType<typeof profileWith>) => {
    const w = generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "moderate", seed: 3 }, p);
    const it = w.items.find((i) => i.anchor && i.load.kind === "load")!;
    return { w, name: it.movement };
  };

  it("tanpa log: PR terbaru jadi titik awal, di-clamp ke batas; aturan lama tidak memakai PR", () => {
    const pNew = profileWith(true);
    const { w, name } = anchorOf(pNew);
    const m = movementsOf(pNew).get(name)!;
    const prs = [pr("s", name, m.cap!.kg + 50, "2026-10-25")];
    const it = applyProgression(w, movementsOf(pNew), [], prs).items.find((i) => i.movement === name)!;
    expect(it.load).toMatchObject({ kind: "load", min: m.cap!.kg, max: m.cap!.kg });
    expect(it.progression).toMatch(/Mulai dari PR/);
    const pOld = profileWith(false);
    const old = anchorOf(pOld);
    const itOld = applyProgression(old.w, movementsOf(pOld), [], prs).items.find((i) => i.movement === old.name)!;
    expect(itOld.progression).toBeUndefined();
  });

  it("PR di antara beban yang bisa dirakit → beban terdekat di bawahnya, tidak melompat ke atas PR", () => {
    const pNew = profileWith(true);
    const { w, name } = anchorOf(pNew);
    const m = movementsOf(pNew).get(name)!;
    const below = m.loads!.filter((v) => v < m.cap!.kg);
    const [a, b] = below.slice(-2);
    const it = applyProgression(w, movementsOf(pNew), [], [pr("s", name, (a + b) / 2, "2026-10-25")]).items.find((i) => i.movement === name)!;
    expect(it.load).toMatchObject({ min: a, max: a });
  });
});

describe("sinkron bagian prs", () => {
  it("digabung per entri dengan tombstone; validasi menolak payload rusak", () => {
    const a = pr("a", "Floor Press", 10, "2026-10-25");
    const b = pr("b", "Barbell Squat", 17, "2026-10-25");
    const merged = mergePart("prs", [a], [b, tombstonePr(a, T)], []);
    expect(merged.map((p) => [p.id, !!p.deletedAt])).toEqual([
      ["a", true],
      ["b", false],
    ]);
    expect(mergePart("prs", [b, tombstonePr(a, T)], [a], [])).toEqual(merged);
    expect(changedKeys("prs", [a], [a, b])).toEqual(["*"]);
    expect(validatePart("prs", "x", baseProfile)).toBeUndefined();
    expect(validatePart("prs", [a, { id: "rusak" }], baseProfile)).toEqual([a]);
  });
});
