import { describe, expect, it } from "vitest";
import { movementsWithLoad, prSeries, prSummary } from "@/lib/insight/pr-trend";
import type { LogEntry } from "@/lib/progression";
import type { PrEntry } from "@/lib/prs";

const M = "Barbell Squat";
const log = (date: string, load: number | undefined, value: number, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `${date}-${over.movement ?? M}`,
  date,
  movement: M,
  ...(load !== undefined ? { load } : {}),
  value,
  valueUnit: "reps",
  target: { lo: 8, hi: 12 },
  rpe: 6,
  targetRpe: 6,
  deload: false,
  blockIndex: 0,
  ...over,
});
const pr = (date: string, loadKg: number, reps?: number, over: Partial<PrEntry> = {}): PrEntry => ({
  id: `pr-${date}`,
  movement: M,
  loadKg,
  ...(reps ? { reps } : {}),
  date,
  source: "manual",
  updatedAt: `${date}T00:00:00.000Z`,
  ...over,
});

describe("prSeries", () => {
  it("beban terbaik per tanggal dari PR + log ★, beban sama → rep terbanyak", () => {
    const s = prSeries(M, [pr("2026-01-01", 12, 8)], [log("2026-01-01", 12, 10), log("2026-01-03", 14, 8), log("2026-01-03", 10, 12, { id: "b" })]);
    expect(s.points.map((p) => [p.date, p.load, p.reps])).toEqual([
      ["2026-01-01", 12, 10],
      ["2026-01-03", 14, 8],
    ]);
  });

  it("gerakan mentok (barbell 17 kg): rep naik, tempo, varian sebagai penanda; mentok sejak", () => {
    const entries = [
      log("2026-01-01", 15, 12),
      log("2026-01-05", 17, 8),
      log("2026-01-08", 17, 10),
      log("2026-01-12", 17, 10, { tempo: true }),
      log("2026-01-15", 12, 8, { movement: "Single-Leg DB RDL", variantOf: M }),
    ];
    const s = prSeries(M, [], entries, 17);
    expect(s.cappedSince).toBe("2026-01-05");
    expect(s.points.map((p) => [p.date, p.load, p.markers, !!p.carried])).toEqual([
      ["2026-01-01", 15, [], false],
      ["2026-01-05", 17, [], false],
      ["2026-01-08", 17, ["rep"], false],
      ["2026-01-12", 17, ["tempo"], false],
      ["2026-01-15", 17, ["variant"], true],
    ]);
    expect(prSummary(s).text).toBe("Beban terbaik 17 kg × 10 rep (8 Jan). Beban mentok di batas alat 17 kg sejak 5 Jan; progresi lanjut lewat rep, tempo/jeda, dan varian.");
  });

  it("log tanpa beban, tahan, dan tombstone diabaikan; varian tanpa titik sebelumnya diabaikan", () => {
    const s = prSeries(
      M,
      [pr("2026-01-02", 20, 5, { deletedAt: "2026-01-03T00:00:00.000Z" })],
      [log("2026-01-01", undefined, 12), log("2026-01-02", 10, 30, { valueUnit: "sec" }), log("2026-01-03", 8, 8, { movement: "X", variantOf: M })],
    );
    expect(s.points).toEqual([]);
    expect(prSummary(s)).toEqual({ drawable: false, text: "Belum ada catatan beban untuk Barbell Squat." });
  });

  it("satu titik → belum cukup; tanpa batas alat → tanpa kalimat mentok", () => {
    expect(prSummary(prSeries(M, [pr("2026-01-02", 14, 6)], [])).text).toBe("Beban terbaik 14 kg × 6 rep (2 Jan). Butuh 2 catatan beban untuk tren ini.");
    const s = prSeries(M, [pr("2026-01-02", 14), pr("2026-01-09", 15)], []);
    expect(s.cappedSince).toBeUndefined();
    expect(prSummary(s)).toEqual({ drawable: true, text: "Beban terbaik 15 kg (9 Jan)." });
  });
});

describe("movementsWithLoad", () => {
  it("gerakan dengan catatan beban, terbaru dulu", () => {
    expect(movementsWithLoad([pr("2026-01-01", 10, 5, { movement: "Floor Press" })], [log("2026-01-05", 14, 8), log("2026-01-06", undefined, 10, { movement: "Plank" })])).toEqual([M, "Floor Press"]);
  });
});
