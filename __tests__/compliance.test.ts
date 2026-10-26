import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/intervals/types";
import { evaluateCompliance, weekSummary } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";

// Sesi & aktivitas fiktif (minggu 2026-01-05 s.d. 2026-01-11).
const sess = (id: string, date: string, kind: PlannedSession["kind"], extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id,
  week: 1,
  day: "",
  plannedDate: date,
  date,
  kind,
  title: id,
  intensity: kind === "quality" ? "moderate" : "easy",
  ...extra,
});
let n = 0;
const act = (date: string, extra: Partial<Activity> = {}): Activity => ({
  id: `a${++n}`,
  name: "Lari pagi",
  type: "Run",
  category: "run",
  date,
  startLocal: `${date}T06:00:00`,
  distanceKm: 6,
  movingTimeSec: 40 * 60,
  avgHr: 140,
  ...extra,
});
const TODAY = "2026-01-12";
const status = (r: ReturnType<typeof evaluateCompliance>, id: string) => r.get(id)?.status;

describe("kepatuhan sesi lari", () => {
  const easy = sess("easy", "2026-01-08", "easy", { minutes: 40, km: 4.7 });

  it("tepat hari dan ±1 hari → selesai; lebih dari 1 hari tidak dihitung", () => {
    expect(status(evaluateCompliance([easy], [act("2026-01-08")], [], TODAY), "easy")).toBe("selesai");
    expect(status(evaluateCompliance([easy], [act("2026-01-09")], [], TODAY), "easy")).toBe("selesai");
    expect(status(evaluateCompliance([easy], [act("2026-01-07")], [], TODAY), "easy")).toBe("selesai");
    expect(status(evaluateCompliance([easy], [act("2026-01-10")], [], TODAY), "easy")).toBe("terlewat");
  });

  it("durasi atau jarak di bawah 80% → sebagian", () => {
    const r = evaluateCompliance([easy], [act("2026-01-08", { movingTimeSec: 25 * 60, distanceKm: 3 })], [], TODAY);
    expect(r.get("easy")).toMatchObject({ status: "sebagian", ratio: 0.64 });
    // Cukup salah satu (durasi ATAU jarak).
    expect(status(evaluateCompliance([easy], [act("2026-01-08", { movingTimeSec: 20 * 60, distanceKm: 4 })], [], TODAY), "easy")).toBe("selesai");
  });

  it("easy yang dikerjakan berat → selesai dengan catatan lebih-berat", () => {
    const r = evaluateCompliance([easy], [act("2026-01-08", { avgHr: 165 })], [], TODAY);
    expect(r.get("easy")).toMatchObject({ status: "selesai", note: "lebih-berat" });
  });

  it("quality dikerjakan ringan → sebagian; berat → selesai; quality ringan (strides) cukup lari apa pun", () => {
    const q = sess("q", "2026-01-06", "quality", { km: 6.5 });
    expect(status(evaluateCompliance([q], [act("2026-01-06", { distanceKm: 7 })], [], TODAY), "q")).toBe("sebagian");
    expect(status(evaluateCompliance([q], [act("2026-01-06", { distanceKm: 7, name: "Tempo 2x10" })], [], TODAY), "q")).toBe("selesai");
    const strides = sess("s", "2026-01-06", "quality", { intensity: "easy", minutes: 30, km: 3.5 });
    expect(status(evaluateCompliance([strides], [act("2026-01-06", { movingTimeSec: 30 * 60 })], [], TODAY), "s")).toBe("selesai");
  });

  it("long run: jarak ≥ 80% rencana; aktivitas ganda sehari dijumlah", () => {
    const long = sess("long", "2026-01-11", "long", { km: 14 });
    expect(status(evaluateCompliance([long], [act("2026-01-11", { distanceKm: 10 })], [], TODAY), "long")).toBe("sebagian");
    const r = evaluateCompliance([long], [act("2026-01-11", { distanceKm: 7 }), act("2026-01-11", { distanceKm: 5, startLocal: "2026-01-11T17:00:00" })], [], TODAY);
    expect(r.get("long")?.status).toBe("selesai");
    expect(r.get("long")?.activityIds).toHaveLength(2);
  });

  it("dua sesi berebut satu aktivitas: satu aktivitas hanya untuk satu sesi, tanggal terdekat menang", () => {
    const tue = sess("tue", "2026-01-06", "quality", { km: 6 });
    const wed = sess("wed", "2026-01-07", "easy", { minutes: 40 });
    const r = evaluateCompliance([tue, wed], [act("2026-01-07")], [], TODAY);
    expect(status(r, "wed")).toBe("selesai");
    expect(status(r, "tue")).toBe("terlewat");
  });

  it("tanpa aktivitas: mendatang, hari ini, kemarin masih bisa, lewat dari itu terlewat", () => {
    const list = [sess("future", "2026-01-14", "easy"), sess("today", TODAY, "easy"), sess("yesterday", "2026-01-11", "easy"), sess("old", "2026-01-10", "easy")];
    const r = evaluateCompliance(list, [], [], TODAY);
    expect(list.map((s) => status(r, s.id))).toEqual(["mendatang", "hari-ini", "hari-ini", "terlewat"]);
    expect(r.get("yesterday")?.masihBisa).toBe(true);
  });

  it("override: dilewati tidak dicocokkan; digeser dinilai di tanggal baru", () => {
    const skip = sess("skip", "2026-01-08", "easy", { override: { sessionId: "skip", action: "skip", decidedAt: "2026-01-08T00:00:00Z" } });
    const moved = sess("moved", "2026-01-14", "quality", { plannedDate: "2026-01-06", override: { sessionId: "moved", action: "move", toDate: "2026-01-14", decidedAt: "2026-01-07T00:00:00Z" } });
    const r = evaluateCompliance([skip, moved], [act("2026-01-08"), act("2026-01-06", { name: "Tempo" })], [], TODAY);
    expect(r.get("skip")).toEqual({ status: "dilewati", activityIds: [] });
    expect(status(r, "moved")).toBe("digeser");
  });

  it("data kosong/null aman: aktivitas tanpa tanggal atau tanpa metrik", () => {
    const r = evaluateCompliance([easy], [act("2026-01-08", { distanceKm: undefined, movingTimeSec: undefined }), { ...act("x"), date: undefined }], [], TODAY);
    expect(status(r, "easy")).toBe("selesai");
    expect(evaluateCompliance([], [], [], TODAY).size).toBe(0);
  });
});

describe("kepatuhan sesi ST", () => {
  const lower = sess("lower", "2026-01-05", "st-lower");
  const upper = sess("upper", "2026-01-07", "st-upper");

  it("dari log ST lokal (±1 hari) dan dari aktivitas strength intervals.icu", () => {
    const r = evaluateCompliance([lower, upper], [act("2026-01-07", { category: "strength", type: "WeightTraining", name: "Upper" })], ["2026-01-06"], TODAY);
    expect(r.get("lower")).toMatchObject({ status: "selesai", logDate: "2026-01-06" });
    expect(r.get("upper")).toMatchObject({ status: "selesai", activityIds: [expect.any(String)] });
  });

  it("aktivitas lari tidak memenuhi sesi ST; tanpa log → terlewat", () => {
    const r = evaluateCompliance([lower], [act("2026-01-05")], [], TODAY);
    expect(status(r, "lower")).toBe("terlewat");
  });
});

describe("ringkasan minggu", () => {
  it("selesai dari total sesi minggu (lari + ST) dan status long run", () => {
    const list = [
      sess("lower", "2026-01-05", "st-lower"),
      sess("q", "2026-01-06", "quality", { km: 6 }),
      sess("easy", "2026-01-08", "easy", { minutes: 40 }),
      sess("long", "2026-01-11", "long", { km: 14 }),
      sess("next", "2026-01-13", "easy", { week: 2 }),
    ];
    const r = evaluateCompliance(list, [act("2026-01-06", { name: "Tempo" }), act("2026-01-11", { distanceKm: 14 })], ["2026-01-05"], TODAY);
    expect(weekSummary(list, r, 1)).toEqual({ week: 1, done: 3, total: 4, longRun: { km: 14, status: "selesai" } });
    expect(weekSummary(list, r, 2)).toEqual({ week: 2, done: 0, total: 1 });
  });
});
