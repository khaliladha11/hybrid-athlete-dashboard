import { describe, expect, it } from "vitest";
import { HARD_RUN_HR, isHardRun } from "@/lib/coach";
import { addDays } from "@/lib/date";
import type { Activity, Wellness } from "@/lib/intervals/types";
import { assessReadiness, readinessBasis } from "@/lib/readiness";
import { BASELINE_DAYS, baselineStatus, hardRunStatus, hardRunThreshold, hrvBaseline, hrvPersonalDrop, rhrBaseline, rhrPersonalLimit } from "@/lib/thresholds";

const TODAY = "2026-03-31";
/** `n` hari wellness fiktif sebelum hari ini (hari ini tidak termasuk). */
const days = (n: number, f: (i: number) => Partial<Wellness>): Wellness[] => Array.from({ length: n }, (_, i) => ({ date: addDays(TODAY, -(n - i)), ...f(i) }));

describe("HR lari berat dari LTHR", () => {
  it("90% LTHR, dibulatkan; tanpa LTHR atau tidak masuk akal → 155", () => {
    expect(hardRunThreshold(169)).toEqual({ bpm: 152, personal: true, lthr: 169 });
    expect(hardRunThreshold(175)).toEqual({ bpm: 158, personal: true, lthr: 175 });
    expect(hardRunThreshold(undefined)).toEqual({ bpm: 155, personal: false });
    expect(hardRunThreshold(40)).toEqual({ bpm: 155, personal: false });
    expect(HARD_RUN_HR).toBe(155);
  });

  it("isHardRun memakai ambang yang ditandai server", () => {
    const run = (avgHr: number, hardHrBpm?: number): Activity => ({ id: "x", name: "Lari Pagi", type: "Run", category: "run", avgHr, ...(hardHrBpm ? { hardHrBpm } : {}) });
    expect(isHardRun(run(153))).toBe(false);
    expect(isHardRun(run(153, 152))).toBe(true);
    expect(isHardRun(run(151, 152))).toBe(false);
  });

  it("teks status", () => {
    expect(hardRunStatus(hardRunThreshold(169))).toBe("Lari berat: ≥ 152 bpm (90% LTHR 169 di intervals.icu).");
    expect(hardRunStatus(hardRunThreshold(undefined))).toContain("ambang umum");
  });
});

describe("transisi 30 hari", () => {
  it("29 hari = ambang umum, 30 hari = ambang pribadi aktif sejak hari setelah nilai ke-30", () => {
    const w29 = days(29, () => ({ restingHr: 52, hrv: 60 }));
    expect(rhrBaseline(w29, TODAY)).toEqual({ days: 29, active: false });
    expect(hrvBaseline(w29, TODAY).active).toBe(false);
    const w30 = days(30, (i) => ({ restingHr: 50 + (i % 5), hrv: 55 + (i % 7) }));
    const b = rhrBaseline(w30, TODAY);
    expect(b.active).toBe(true);
    expect(b.since).toBe(TODAY);
    expect(BASELINE_DAYS).toBe(30);
    expect(baselineStatus("Resting HR", b)).toBe("Resting HR: ambang pribadi aktif sejak 31 Mar (rata-rata 30 hari).");
    expect(baselineStatus("HRV", hrvBaseline(w29, TODAY))).toBe("HRV: masih memakai ambang umum (29 dari 30 hari data).");
  });

  it("hanya 60 hari terakhir dan 30 nilai terakhir yang dipakai", () => {
    const old = days(90, () => ({ restingHr: 70 })).slice(0, 40);
    const recent = days(30, () => ({ restingHr: 50 }));
    const b = rhrBaseline([...old, ...recent], TODAY);
    expect(b.mean).toBe(50);
  });
});

describe("resting HR pribadi", () => {
  const base = days(30, (i) => ({ restingHr: i % 2 ? 50 : 54 }));
  it("batas = rata-rata + maks(1 SD, 3 bpm)", () => {
    const limit = rhrPersonalLimit(rhrBaseline(base, TODAY))!;
    expect(limit).toBeCloseTo(52 + Math.max(2.03, 3), 1);
  });
  it("readiness memakai batas pribadi, bukan +5 dari 7 hari", () => {
    const at = (rhr: number) => assessReadiness([...base, { date: TODAY, restingHr: rhr }], [], TODAY);
    expect(at(55).caution).toBe(true);
    expect(at(55).reasons[0]).toContain("batas pribadi 55 bpm");
    expect(at(54).caution).toBe(false);
    expect(at(55).baselines.restingHr.active).toBe(true);
  });
  it("29 hari → aturan umum (+5 dari rata-rata 7 hari)", () => {
    const w = days(29, () => ({ restingHr: 52 }));
    expect(assessReadiness([...w, { date: TODAY, restingHr: 56 }], [], TODAY).caution).toBe(false);
    expect(assessReadiness([...w, { date: TODAY, restingHr: 57 }], [], TODAY).reasons[0]).toContain("naik 5 bpm");
  });
});

describe("HRV pribadi (Plews: ln rMSSD 7 hari vs rata-rata 30 hari − 0,5 SD)", () => {
  const base = days(30, (i) => ({ hrv: [55, 60, 65][i % 3] }));
  it("turun di bawah batas → waspada; di dalam rentang → tidak", () => {
    const b = hrvBaseline(base, TODAY);
    const low = [...base.slice(0, 24), ...days(6, () => ({ hrv: 50 })), { date: TODAY, hrv: 50 }];
    expect(hrvPersonalDrop(low, TODAY, hrvBaseline(low, TODAY))).not.toBeNull();
    expect(hrvPersonalDrop([...base, { date: TODAY, hrv: 60 }], TODAY, b)).toBeNull();
    const r = assessReadiness(low, [], TODAY);
    expect(r.caution).toBe(true);
    expect(r.reasons[0]).toMatch(/^HRV rata-rata 7 hari \d+ ms, di bawah batas normal pribadi \d+ ms/);
  });
  it("HRV tidak dikirim jam → aturan HRV dilewati walau ada 30 hari resting HR", () => {
    const w = days(30, () => ({ restingHr: 52 }));
    const r = assessReadiness([...w, { date: TODAY, restingHr: 52 }], [], TODAY);
    expect(r.baselines.hrv.active).toBe(false);
    expect(r.used).toEqual(["resting HR"]);
    expect(r.basis).toBe("Kesiapan dihitung dari resting HR dan sesi kemarin.");
  });
});

describe("dasar kesiapan dengan check-in", () => {
  it("hanya check-in, wellness + check-in, tanpa apa pun", () => {
    expect(readinessBasis([], true)).toBe("Kesiapan dihitung dari check-in dan sesi kemarin.");
    expect(readinessBasis(["resting HR"], true)).toBe("Kesiapan dihitung dari resting HR, check-in, dan sesi kemarin.");
    expect(readinessBasis([])).toBe("Data HRV dan resting HR dari jam belum ada, jadi kesiapan hanya dihitung dari sesi kemarin.");
  });
});
