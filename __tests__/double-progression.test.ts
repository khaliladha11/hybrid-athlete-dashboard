import { describe, expect, it, vi } from "vitest";
import { defaultSettings, resolveProfile, type AthleteSettings } from "@/lib/athlete-settings";
import type { Equipment } from "@/lib/equipment";
import { generateStrengthWorkout } from "@/lib/generator";
import type { Difficulty, StrengthWorkout } from "@/lib/generator/types";
import { baseProfile, type Movement } from "@/lib/profile";
import { applyProgression, CAPPED_REPS, recommend, type LogEntry, type ProgressionCtx } from "@/lib/progression";

// Profil contoh (home gym), alat & log fiktif.
vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

const base = defaultSettings(baseProfile);
const ACCEPTED = { acceptedAt: "2026-10-27T01:00:00.000Z" };
// Dumbbell fixed 5 kg sepasang & 9 kg satu buah supaya Rear-Foot-Elevated Split Squat dan DB RDL bisa dipakai.
const gear = (plates: Equipment["plates"]): Equipment => ({
  ...base.equipment,
  dumbbell: { enabled: true, handleKg: 2, handles: 2 },
  barbell: { enabled: true, barKg: 10 },
  bench: true,
  plates,
  items: [
    { id: "f5", kind: "fixedDumbbell", kg: 5, count: 2 },
    { id: "f9", kind: "fixedDumbbell", kg: 9, count: 1 },
  ],
});
const SMALL = gear([{ kg: 1.25, count: 2 }]); // barbell 10 & 12,5 kg → batas alat 12,5 kg
const BIG = gear([{ kg: 1.25, count: 4 }, { kg: 2.5, count: 4 }]); // barbell sampai 25 kg
const make = (patch: Partial<AthleteSettings>) => resolveProfile(baseProfile, { ...base, conditions: [], ...patch });
const movesOf = (p: ReturnType<typeof make>) => new Map(Object.values(p.movementLibrary).flat().filter((m): m is Movement => typeof m === "object").map((m) => [m.name, m]));
const ctxOf = (p: ReturnType<typeof make>, over: Partial<ProgressionCtx> = {}): ProgressionCtx => {
  const ms = movesOf(p);
  return { difficulty: "moderate", usable: (n) => (ms.get(n)?.available !== false ? ms.get(n) : undefined), ...over };
};

let n = 0;
const log = (movement: string, load: number, date: string, value: number, rpe: number, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `l${n++}`,
  date,
  movement,
  load,
  value,
  valueUnit: "reps",
  target: { lo: 8, hi: 12 },
  rpe,
  targetRpe: 6,
  deload: false,
  blockIndex: 0,
  ...over,
});
const two = (movement: string, load: number, value: number, rpe: number, over: Partial<LogEntry> = {}) => [
  log(movement, load, "2026-10-20", value, rpe, over),
  log(movement, load, "2026-10-23", value, rpe, over),
];

describe("jalur lama tidak berubah (tanpa persetujuan / toggle nyala)", () => {
  it("tanpa batas baru, recommend dengan konteks = recommend lama", () => {
    for (const p of [make({ equipment: BIG }), make({ equipment: BIG, loadRule: { ...ACCEPTED, limitToLibrary: true } })]) {
      const squat = movesOf(p).get("Barbell Squat")!;
      expect(squat.cap).toBeUndefined();
      for (const h of [two("Barbell Squat", 12, 12, 6), two("Barbell Squat", 16, 12, 5), [log("Barbell Squat", 14, "2026-10-23", 10, 8)]]) {
        expect(recommend(squat, h, { deload: false, ctx: ctxOf(p) })).toEqual(recommend(squat, h, { deload: false }));
      }
    }
  });
});

describe("syarat naik relatif & saran Gita berangka", () => {
  const p = make({ equipment: BIG, loadRule: ACCEPTED });
  const squat = movesOf(p).get("Barbell Squat")!;

  it("RPE sama dengan target belum naik; RPE ≤ target − 1 naik satu langkah dengan alasan berangka", () => {
    const hold = recommend(squat, two("Barbell Squat", 15, 12, 6), { deload: false, ctx: ctxOf(p) });
    expect(hold).toMatchObject({ action: "hold", load: 15 });
    expect(hold?.kind === "load" && hold.reason).toBe("12 rep di 15 kg dengan RPE 6. Naik beban setelah 2 sesi dengan RPE ≤ 5.");
    const up = recommend(squat, two("Barbell Squat", 15, 12, 5), { deload: false, ctx: ctxOf(p) });
    expect(up).toMatchObject({ action: "increase", from: 15, load: 17.5 });
    expect(up?.kind === "load" && up.reason).toBe("2 sesi terakhir RPE 5 di 12 rep (target RPE 6): naik ke 17.5 kg.");
  });

  it("rep belum di ujung atas → tambah rep; 1 dari 2 sesi → tuntaskan sekali lagi", () => {
    expect(recommend(squat, [log("Barbell Squat", 15, "2026-10-23", 10, 5)], { deload: false, ctx: ctxOf(p) })).toMatchObject({ reason: "Tambah rep dulu: 10 dari 12 rep di 15 kg." });
    expect(recommend(squat, [log("Barbell Squat", 15, "2026-10-23", 12, 5)], { deload: false, ctx: ctxOf(p) })).toMatchObject({
      reason: "1 dari 2 sesi tuntas di 15 kg (RPE 5, 12 rep). Tuntaskan sekali lagi untuk naik.",
    });
  });
});

describe("double progression saat mentok", () => {
  const p = make({ equipment: SMALL, loadRule: ACCEPTED });
  const ms = movesOf(p);
  const squat = ms.get("Barbell Squat")!;
  const rec = (h: LogEntry[], over: Partial<ProgressionCtx> = {}) => recommend(squat, h, { deload: false, ctx: ctxOf(p, over) });

  it("rentang rep tetap per level (D3)", () => {
    expect(squat.cap).toEqual({ kg: 12.5, source: "equipment" });
    for (const d of ["easy", "moderate", "high"] as Difficulty[]) {
      const r = rec([log("Barbell Squat", 12.5, "2026-10-23", 9, 5)], { difficulty: d });
      expect(r).toMatchObject({ reps: `${CAPPED_REPS[d].lo}–${CAPPED_REPS[d].hi}` });
    }
    expect(CAPPED_REPS).toEqual({ easy: { lo: 10, hi: 15 }, moderate: { lo: 8, hi: 12 }, high: { lo: 6, hi: 10 } });
  });

  it("urutan: rep sampai ujung atas → tempo/jeda → varian satu sisi (mulai blok berikutnya)", () => {
    const step1 = rec([log("Barbell Squat", 12.5, "2026-10-23", 10, 5)]);
    expect(step1).toMatchObject({ action: "hold", load: 12.5, reps: "8–12" });
    expect(step1?.kind === "load" && step1.reason).toBe("Beban sudah di batas alat 12.5 kg. Naikkan rep sampai 12 (terakhir 10) dengan RPE ≤ 5.");
    expect(step1?.kind === "load" && step1.tempo).toBeFalsy();

    const step2 = rec(two("Barbell Squat", 12.5, 12, 5));
    expect(step2).toMatchObject({ tempo: true, reps: "8–12" });
    expect(step2?.kind === "load" && step2.reason).toBe(
      "2 sesi terakhir RPE 5 di 12 rep (target RPE 6), beban sudah di batas alat 12.5 kg. Tambah tempo: turun 3 detik, jeda 2 detik di bawah.",
    );

    // Tempo dua sesi tuntas: varian siap, tapi ★ diganti mulai blok berikutnya (blok yang sedang berjalan mulai sebelum sesi itu).
    const withTempo = two("Barbell Squat", 12.5, 12, 5, { tempo: true });
    const sameBlock = rec(withTempo, { blockStart: "2026-10-19" });
    expect(sameBlock).toMatchObject({ tempo: true });
    expect(sameBlock?.kind === "load" && sameBlock.variant).toBeUndefined();
    expect(sameBlock?.kind === "load" && sameBlock.reason).toMatch(/Siap pindah ke Rear-Foot-Elevated Split Squat mulai blok berikutnya/);
    const nextBlock = rec(withTempo, { blockStart: "2026-11-16" });
    expect(nextBlock).toMatchObject({ variant: "Rear-Foot-Elevated Split Squat" });
    expect(rec(withTempo, { free: true })).toMatchObject({ variant: "Rear-Foot-Elevated Split Squat" });
  });

  it("tempo boleh di tengah blok: sesi berikutnya tetap tempo sampai rep di ujung atas lagi", () => {
    const r = rec([log("Barbell Squat", 12.5, "2026-10-23", 9, 5, { tempo: true })], { blockStart: "2026-10-19" });
    expect(r).toMatchObject({ tempo: true, reps: "8–12" });
    expect(r?.kind === "load" && r.reason).toMatch(/tetap dengan tempo/);
  });

  it("tanpa varian di library (atau varian tidak lolos kondisi/alat): tetap tempo dan bilang begitu", () => {
    const rdl = ms.get("DB RDL Wall-Tap Method")!;
    const capRdl = rdl.cap!.kg;
    const r = recommend(rdl, two("DB RDL Wall-Tap Method", capRdl, 12, 5, { tempo: true }), { deload: false, ctx: ctxOf(p, { free: true }) });
    expect(r).toMatchObject({ tempo: true });
    expect(r?.kind === "load" && r.reason).toMatch(/Belum ada varian lebih sulit di library, tetap tempo dan jeda\.$/);
    const noBench = make({ equipment: { ...SMALL, bench: false }, loadRule: ACCEPTED });
    const sq = movesOf(noBench).get("Barbell Squat")!;
    const r2 = recommend(sq, two("Barbell Squat", 12.5, 12, 5, { tempo: true }), { deload: false, ctx: ctxOf(noBench, { free: true }) });
    expect(r2?.kind === "load" && r2.variant).toBeUndefined();
  });

  it("batas keamanan juga dihitung mentok dan disebut alasannya", () => {
    const apt = make({ equipment: BIG, loadRule: ACCEPTED, conditions: ["apt"] });
    const sq = movesOf(apt).get("Barbell Squat")!;
    const r = recommend(sq, two("Barbell Squat", 15, 12, 5), { deload: false, ctx: ctxOf(apt) });
    // 15 kg → beban berikutnya 17,5 > batas keamanan 16 kg → mentok.
    expect(r?.kind === "load" && r.reason).toMatch(/batas keamanan 16 kg\. Tambah tempo/);
  });

  it("alat bertambah: tidak mentok lagi, progresi beban jalan otomatis dan rotasi rep kembali", () => {
    const more = make({ equipment: BIG, loadRule: ACCEPTED });
    const sq = movesOf(more).get("Barbell Squat")!;
    const r = recommend(sq, two("Barbell Squat", 12.5, 12, 5, { tempo: true }), { deload: false, ctx: ctxOf(more) });
    expect(r).toMatchObject({ action: "increase", from: 12.5, load: 15 });
    expect(r?.kind === "load" && r.reps).toBeUndefined();
    expect(r?.kind === "load" && r.tempo).toBeUndefined();
  });
});

describe("diterapkan ke workout", () => {
  const p = make({ equipment: SMALL, loadRule: ACCEPTED });
  const withSquat = (rfess = false): StrengthWorkout => {
    for (let seed = 1; seed < 800; seed++) {
      const w = generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "moderate", seed, free: true }, p);
      const hasRfess = w.items.some((i) => i.movement === "Rear-Foot-Elevated Split Squat");
      if (w.items.some((i) => i.anchor && i.movement === "Barbell Squat") && hasRfess === rfess) return w;
    }
    throw new Error("Barbell Squat ★ tidak ditemukan");
  };

  it("mentok: rentang tetap + tempo di item; varian mengganti ★ (mode bebas) dengan titik awal rentang library-nya", () => {
    const w = withSquat();
    const tempo = applyProgression(w, movesOf(p), two("Barbell Squat", 12.5, 12, 5), [], { free: true }).items.find((i) => i.movement === "Barbell Squat")!;
    expect(tempo).toMatchObject({ reps: "8–12", tempo: true, load: { min: 12.5, max: 12.5 } });
    const swapped = applyProgression(w, movesOf(p), two("Barbell Squat", 12.5, 12, 5, { tempo: true }), [], { free: true }).items.find((i) => i.variantOf === "Barbell Squat")!;
    expect(swapped.movement).toBe("Rear-Foot-Elevated Split Squat");
    expect(swapped.anchor).toBe(true);
    expect(swapped.load.kind === "load" && swapped.load.min).toBe(movesOf(p).get("Rear-Foot-Elevated Split Squat")!.loads![0]);
  });

  it("varian yang sudah ada di sesi tidak dibuat dobel: tetap tempo dan bilang begitu", () => {
    const w = withSquat(true);
    const out = applyProgression(w, movesOf(p), two("Barbell Squat", 12.5, 12, 5, { tempo: true }), [], { free: true });
    expect(out.items.filter((i) => i.movement === "Rear-Foot-Elevated Split Squat")).toHaveLength(1);
    const sq = out.items.find((i) => i.movement === "Barbell Squat")!;
    expect(sq.tempo).toBe(true);
    expect(sq.progression).toMatch(/Rear-Foot-Elevated Split Squat sudah ada di sesi ini, tetap tempo dan jeda\.$/);
  });

  it("gerakan satu sisi: rentang tetap mempertahankan satuan per kaki", () => {
    for (let seed = 1; seed < 500; seed++) {
      const w = generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "moderate", seed, free: true }, p);
      const lunge = w.items.find((i) => i.anchor && i.movement === "Reverse Lunge");
      if (!lunge || lunge.load.kind !== "load") continue;
      const cap = movesOf(p).get("Reverse Lunge")!.cap!.kg;
      const out = applyProgression(w, movesOf(p), two("Reverse Lunge", cap, 12, 5), [], { free: true }).items.find((i) => i.movement === "Reverse Lunge")!;
      expect(out.reps).toBe("8–12/kaki");
      return;
    }
    throw new Error("Reverse Lunge ★ tidak ditemukan");
  });
});

describe("log: tempo & varian", () => {
  it("field baru tervalidasi; entri lama tanpa field tetap valid (tanpa tempo, bukan varian)", async () => {
    const { isLogEntry } = await import("@/lib/progression");
    const { normalizeLogEntry } = await import("@/lib/log-entries");
    const old = log("Barbell Squat", 12.5, "2026-10-01", 12, 5);
    expect(isLogEntry(old)).toBe(true);
    expect(normalizeLogEntry(old)).not.toHaveProperty("tempo");
    const fresh = { ...old, id: "x", tempo: true, variantOf: "Barbell Squat" };
    expect(normalizeLogEntry(fresh)).toMatchObject({ tempo: true, variantOf: "Barbell Squat" });
    expect(isLogEntry({ ...old, tempo: "ya" })).toBe(false);
  });
});
