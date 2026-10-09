import { describe, expect, it } from "vitest";
import {
  isHardRun,
  isLegStrength,
  readinessAdvice,
  suggestFor,
  weekStats,
  weeklyAdvice,
  type Advice,
} from "@/lib/coach";
import { addDays } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import { mockActivities } from "@/lib/mock-data";

const TODAY = "2026-09-28";
let n = 0;
const run = (daysAgo: number, km: number, extra: Partial<Activity> = {}): Activity => ({
  id: `r${n++}`,
  name: "Easy Run",
  type: "Run",
  category: "run",
  date: addDays(TODAY, -daysAgo),
  distanceKm: km,
  movingTimeSec: km * 480,
  avgHr: 138,
  ...extra,
});
const st = (daysAgo: number, name: string): Activity => ({
  id: `s${n++}`,
  name,
  type: "WeightTraining",
  category: "strength",
  date: addDays(TODAY, -daysAgo),
});
const ids = (a: Advice[]) => a.map((x) => x.id);

describe("klasifikasi aktivitas", () => {
  it("lari berat: nama, HR ≥ 155, atau pace ≤ 6:30 tanpa HR", () => {
    expect(isHardRun(run(0, 5, { name: "Tempo 2×10'" }))).toBe(true);
    expect(isHardRun(run(0, 5, { name: "Norwegian 4×4" }))).toBe(true);
    expect(isHardRun(run(0, 5, { avgHr: 158 }))).toBe(true);
    expect(isHardRun(run(0, 5, { avgHr: 150 }))).toBe(false);
    expect(isHardRun(run(0, 5, { avgHr: undefined, avgPaceSecPerKm: 380 }))).toBe(true);
    expect(isHardRun(run(0, 5, { avgHr: undefined, avgPaceSecPerKm: 500 }))).toBe(false);
    expect(isHardRun(st(0, "Tempo ST"))).toBe(false);
  });

  it("ST kaki dikenali dari nama", () => {
    expect(isLegStrength(st(0, "Lower Body ST"))).toBe(true);
    expect(isLegStrength(st(0, "Full Body ST"))).toBe(true);
    expect(isLegStrength(st(0, "Upper Push ST"))).toBe(false);
  });
});

describe("80/20 (Seiler)", () => {
  it("≥ 2 lari berat dalam 7 hari → sarankan Easy", () => {
    const acts = [run(1, 6, { avgHr: 160 }), run(3, 5), run(5, 7, { name: "Interval 6×800" })];
    const a = weeklyAdvice(acts, TODAY);
    expect(ids(a)).toContain("polarized");
    expect(suggestFor(a, "run", { difficulty: "high", duration: 45 }).difficulty).toBe("easy");
  });

  it("1 lari berat → tidak ada saran", () => {
    expect(ids(weeklyAdvice([run(2, 6, { avgHr: 160 }), run(4, 5)], TODAY))).not.toContain("polarized");
  });

  it("lari berat > 7 hari lalu tidak dihitung", () => {
    expect(weekStats([run(8, 6, { avgHr: 160 }), run(9, 6, { avgHr: 160 })], TODAY).hardRuns7).toBe(0);
  });
});

describe("progresi jarak (Nielsen 2014)", () => {
  it("naik > 30% → peringatan + sarankan 30'", () => {
    const acts = [run(1, 10), run(3, 8), run(9, 7), run(11, 6)]; // 18 vs 13 km = +38%
    const s = weekStats(acts, TODAY);
    expect(s.runKm7).toBe(18);
    expect(s.runKmPrev7).toBe(13);
    expect(s.kmChange).toBeCloseTo(18 / 13 - 1);
    const a = weeklyAdvice(acts, TODAY);
    expect(ids(a)).toContain("volume");
    expect(a.find((x) => x.id === "volume")!.message).toMatch(/38%/);
    expect(suggestFor(a, "run", { difficulty: "easy", duration: 60 }).duration).toBe(30);
    expect(suggestFor(a, "run", { difficulty: "easy", duration: 30 }).duration).toBeUndefined();
  });

  it("naik ≤ 30% aman; basis < 5 km diabaikan", () => {
    expect(ids(weeklyAdvice([run(1, 12), run(9, 10)], TODAY))).not.toContain("volume");
    expect(weekStats([run(1, 10), run(9, 3)], TODAY).kmChange).toBeUndefined();
  });

  it("sisa ruang aman dihitung dari 130% minggu lalu", () => {
    const acts = [run(1, 10), run(9, 7), run(10, 3)]; // 10 vs 10: aman
    expect(weekStats(acts, TODAY).safeKmCap).toBeCloseTo(13);
  });
});

describe("concurrent training (Wilson 2012)", () => {
  it("setelah ST kaki kemarin → lari maksimal Moderate", () => {
    const a = weeklyAdvice([st(1, "Lower Body ST")], TODAY);
    expect(ids(a)).toEqual(["after-leg-st"]);
    expect(suggestFor(a, "run", { difficulty: "high", duration: 45 }).difficulty).toBe("moderate");
    expect(suggestFor(a, "run", { difficulty: "easy", duration: 45 })).toEqual({});
    expect(suggestFor(a, "strength", { difficulty: "high", duration: 45, type: "lower" })).toEqual({});
  });

  it("setelah long run / lari berat → ST sarankan Upper", () => {
    const a = weeklyAdvice([run(1, 14)], TODAY);
    expect(ids(a)).toContain("after-hard-run");
    expect(suggestFor(a, "strength", { difficulty: "moderate", duration: 45, type: "lower" }).type).toBe("upperPull");
    expect(suggestFor(a, "strength", { difficulty: "moderate", duration: 45, type: "upperPush" }).type).toBeUndefined();
  });

  it("aktivitas 2 hari lalu tidak memicu saran concurrent", () => {
    expect(weeklyAdvice([st(2, "Lower Body ST"), run(2, 14)], TODAY)).toEqual([]);
  });
});

describe("gabungan dengan readiness", () => {
  it("readiness turun satu level; dikombinasikan dengan batas lain ambil yang paling ringan", () => {
    const r = readinessAdvice({ caution: true, reasons: ["HRV turun"], hasData: true });
    expect(suggestFor(r, "strength", { difficulty: "high", duration: 45, type: "upperPush" }).difficulty).toBe("moderate");
    const combined = [...r, ...weeklyAdvice([st(1, "Lower Body ST")], TODAY)];
    expect(suggestFor(combined, "run", { difficulty: "high", duration: 45 }).difficulty).toBe("moderate");
    expect(readinessAdvice(null)).toEqual([]);
    expect(readinessAdvice({ caution: false, reasons: [], hasData: true })).toEqual([]);
  });

  it("data demo: +53% km dan long run kemarin terdeteksi, 80/20 aman", () => {
    const acts = mockActivities(TODAY);
    const a = weeklyAdvice(acts, TODAY);
    expect(ids(a).sort()).toEqual(["after-hard-run", "volume"]);
    expect(weekStats(acts, TODAY).hardRuns7).toBe(1);
  });
});

describe("saran relatif tidak berantai", () => {
  it("ignoreLowerBy: setelah diterapkan, readiness tidak menurunkan lagi; batas absolut tetap berlaku", () => {
    const r = readinessAdvice({ caution: true, reasons: ["HRV turun"], hasData: true });
    expect(suggestFor(r, "run", { difficulty: "moderate", duration: 45 }, { ignoreLowerBy: true })).toEqual({});
    const withPolarized: Advice[] = [...r, { id: "polarized", targets: ["run"], title: "", message: "", maxDifficulty: "easy" }];
    expect(suggestFor(withPolarized, "run", { difficulty: "moderate", duration: 45 }, { ignoreLowerBy: true }).difficulty).toBe("easy");
  });
});
