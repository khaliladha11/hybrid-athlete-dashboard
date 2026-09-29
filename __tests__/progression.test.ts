import { describe, expect, it } from "vitest";
import { generateStrengthWorkout, validateStrength } from "@/lib/generator";
import { findMovement, parseWeight, profile, type Movement } from "@/lib/profile";
import {
  MAX_HOLD_SEC,
  applyProgression,
  isLogEntry,
  loadStep,
  parseRepRange,
  recommend,
  type LogEntry,
} from "@/lib/progression";

const mv = (name: string) => findMovement(name)!;
let n = 0;
const entry = (movement: string, date: string, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `e${n++}`,
  date,
  movement,
  load: 16,
  value: 12,
  valueUnit: "reps",
  target: { lo: 10, hi: 12 },
  rpe: 6,
  targetRpe: 6,
  deload: false,
  blockIndex: 0,
  ...over,
});

describe("parser", () => {
  it("rentang rep", () => {
    expect(parseRepRange("10–12")).toEqual({ lo: 10, hi: 12 });
    expect(parseRepRange("8/kaki")).toEqual({ lo: 8, hi: 8 });
    expect(parseRepRange("10–12 (turun 3 detik)")).toEqual({ lo: 10, hi: 12 });
    expect(parseRepRange(undefined)).toBeUndefined();
  });

  it("langkah beban mengikuti rentang library", () => {
    const step = (name: string) => {
      const s = parseWeight(mv(name).weight);
      return s.kind === "load" ? loadStep(s) : undefined;
    };
    expect(step("Barbell Sumo Deadlift / Hip Thrust")).toBe(1); // 14–20 kg
    expect(step("Seated Overhead Press")).toBe(0.5); // 5 kg
    expect(step("Seated Lateral Raise")).toBe(0.5); // 1.25–3 kg
    expect(step("Seated Bent-Over DB Face Pull")).toBe(0.25); // 1.25–1.5 kg
  });
});

describe("aturan 2-for-2 (NSCA) dengan batas RPE", () => {
  const hip = mv("Barbell Sumo Deadlift / Hip Thrust"); // 14–20 kg, step 1

  it("tanpa riwayat → tidak ada rekomendasi", () => {
    expect(recommend(hip, [], { deload: false })).toBeNull();
  });

  it("2 sesi berturut tuntas → naik satu langkah", () => {
    const h = [entry(hip.name, "2026-09-29"), entry(hip.name, "2026-10-02")];
    expect(recommend(hip, h, { deload: false })).toMatchObject({ kind: "load", action: "increase", load: 17, from: 16 });
  });

  it("baru 1 sesi tuntas → tahan", () => {
    const h = [entry(hip.name, "2026-09-29", { value: 10 }), entry(hip.name, "2026-10-02")];
    expect(recommend(hip, h, { deload: false })).toMatchObject({ action: "hold", load: 16 });
  });

  it("RPE sedikit di atas target → tahan; jauh di atas → turun", () => {
    expect(recommend(hip, [entry(hip.name, "2026-10-02", { rpe: 7 })], { deload: false })).toMatchObject({ action: "hold", load: 16 });
    expect(recommend(hip, [entry(hip.name, "2026-10-02", { rpe: 8 })], { deload: false })).toMatchObject({ action: "decrease", load: 15 });
  });

  it("beban terakhir tidak dibulatkan ke kelipatan langkah", () => {
    const rdl = mv("DB RDL Wall-Tap Method"); // 8–10 kg, langkah 1
    const h = [entry(rdl.name, "2026-09-29", { load: 8.5 }), entry(rdl.name, "2026-10-02", { load: 8.5 })];
    expect(recommend(rdl, h, { deload: false })).toMatchObject({ action: "increase", from: 8.5, load: 9.5 });
    const top = [entry(rdl.name, "2026-09-29", { load: 9.5 }), entry(rdl.name, "2026-10-02", { load: 9.5 })];
    expect(recommend(rdl, top, { deload: false })).toMatchObject({ from: 9.5, load: 10 });
  });

  it("tidak pernah melewati batas library, tidak turun di bawah batas bawah", () => {
    const top = [entry(hip.name, "2026-09-29", { load: 20 }), entry(hip.name, "2026-10-02", { load: 20 })];
    const r = recommend(hip, top, { deload: false });
    expect(r).toMatchObject({ action: "hold", load: 20 });
    expect(r!.reason).toMatch(/batas library/);
    const over = [entry(hip.name, "2026-09-29", { load: 25 }), entry(hip.name, "2026-10-02", { load: 25 })];
    expect(recommend(hip, over, { deload: false })).toMatchObject({ load: 20 });
    expect(recommend(hip, [entry(hip.name, "2026-10-02", { load: 14, rpe: 9 })], { deload: false })).toMatchObject({ load: 14 });
  });

  it("minggu deload: progresi ditunda; sesi deload tidak dihitung sebagai basis", () => {
    const h = [entry(hip.name, "2026-09-29"), entry(hip.name, "2026-10-02")];
    expect(recommend(hip, h, { deload: true })).toMatchObject({ kind: "info" });
    const withDeload = [...h, entry(hip.name, "2026-10-20", { load: 12, value: 15, deload: true })];
    expect(recommend(hip, withDeload, { deload: false })).toMatchObject({ load: 17, from: 16 });
  });

  it("urutan riwayat berdasarkan tanggal, bukan urutan input", () => {
    const h = [entry(hip.name, "2026-10-02", { value: 10 }), entry(hip.name, "2026-09-25"), entry(hip.name, "2026-09-29")];
    // terbaru (10-02) belum tuntas → tahan
    expect(recommend(hip, h, { deload: false })).toMatchObject({ action: "hold" });
  });

  it("gerakan tahan: +5 detik, maksimal 60", () => {
    const hang = mv("Dead Hang");
    const hold = (d: string, v: number) => entry(hang.name, d, { load: undefined, value: v, valueUnit: "sec", target: { lo: v, hi: v } });
    expect(recommend(hang, [hold("2026-09-29", 25), hold("2026-10-02", 25)], { deload: false })).toMatchObject({ kind: "hold", seconds: 30 });
    expect(recommend(hang, [hold("2026-09-29", MAX_HOLD_SEC), hold("2026-10-02", MAX_HOLD_SEC)], { deload: false })).toMatchObject({ seconds: MAX_HOLD_SEC });
  });

  it("band: naik ke band berikutnya setelah 2 sesi tuntas", () => {
    const lbw = mv("Lateral Band Walk");
    const b = (d: string) => entry(lbw.name, d, { load: undefined, band: "Light" });
    expect(recommend(lbw, [b("2026-09-29"), b("2026-10-02")], { deload: false })).toMatchObject({ kind: "band", band: "Medium" });
  });
});

describe("applyProgression ke workout", () => {
  const movements = new Map<string, Movement>(
    (["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const).flatMap((c) => profile.movementLibrary[c]).map((m) => [m.name, m]),
  );

  it("hanya gerakan ★ yang berubah, hasil tetap lolos validator (beban ≤ library)", () => {
    const w = generateStrengthWorkout({ type: "lower", duration: 45, difficulty: "high", seed: 11 });
    const anchors = w.items.filter((i) => i.anchor);
    const entries = anchors.flatMap((a) => [
      entry(a.movement, "2026-09-29", { load: 999 }),
      entry(a.movement, "2026-10-02", { load: 999 }),
    ]);
    const out = applyProgression(w, movements, entries);
    expect(validateStrength(out)).toEqual([]);
    for (const [i, it] of out.items.entries()) {
      if (!it.anchor) expect(it).toEqual(w.items[i]);
      else expect(it.progression).toBeTruthy();
    }
  });

  it("tanpa riwayat → workout identik", () => {
    const w = generateStrengthWorkout({ type: "fullBody", duration: 30, difficulty: "easy", seed: 2 });
    expect(applyProgression(w, movements, [])).toBe(w);
  });
});

describe("validasi data impor", () => {
  it("menerima entri valid, menolak yang rusak", () => {
    expect(isLogEntry(entry("Glute Bridge", "2026-10-02", { load: undefined }))).toBe(true);
    expect(isLogEntry({ ...entry("X", "2026-10-02"), date: "kemarin" })).toBe(false);
    expect(isLogEntry({ ...entry("X", "2026-10-02"), rpe: "7" })).toBe(false);
    expect(isLogEntry(null)).toBe(false);
  });
});
