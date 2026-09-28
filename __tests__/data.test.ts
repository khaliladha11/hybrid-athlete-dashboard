import { describe, expect, it } from "vitest";
import { addDays, startOfWeekMonday, toWibDate } from "@/lib/date";
import { normalizeActivity, normalizeCadence, normalizeWellness } from "@/lib/intervals/normalize";
import { summarizeLast7Days } from "@/lib/intervals/summary";
import { mockActivities, mockWellness } from "@/lib/mock-data";
import { assessReadiness, lowerDifficulty } from "@/lib/readiness";

const TODAY = "2026-09-28"; // Senin

describe("tanggal WIB", () => {
  it("UTC 18:00 = besoknya di WIB", () => {
    expect(toWibDate(new Date("2026-09-27T18:00:00Z"))).toBe("2026-09-28");
    expect(toWibDate(new Date("2026-09-27T16:59:00Z"))).toBe("2026-09-27");
  });
  it("minggu dimulai Senin", () => {
    expect(startOfWeekMonday("2026-09-28")).toBe("2026-09-28");
    expect(startOfWeekMonday("2026-10-04")).toBe("2026-09-28"); // Minggu
    expect(startOfWeekMonday("2026-09-27")).toBe("2026-09-21");
  });
});

describe("normalizer (field Huawei bisa null)", () => {
  it("cadence per-kaki dikali 2, yang sudah total dibiarkan", () => {
    expect(normalizeCadence(86)).toBe(172);
    expect(normalizeCadence(176)).toBe(176);
    expect(normalizeCadence(0)).toBeUndefined();
    expect(normalizeCadence(null)).toBeUndefined();
  });
  it("aktivitas dengan field kosong tetap aman", () => {
    const a = normalizeActivity({ id: 1, type: "Run", distance: null, average_heartrate: null });
    expect(a).toMatchObject({ id: "1", category: "run" });
    expect(a?.distanceKm).toBeUndefined();
    expect(a?.avgPaceSecPerKm).toBeUndefined();
    expect(normalizeActivity(null)).toBeNull();
    expect(normalizeActivity({ name: "tanpa id" })).toBeNull();
  });
  it("wellness tanpa HRV", () => {
    expect(normalizeWellness({ id: TODAY, hrv: null, restingHR: 55 })).toEqual({ date: TODAY, restingHr: 55 });
  });
});

describe("ringkasan 7 hari", () => {
  it("menghitung km lari, sesi, long run", () => {
    const s = summarizeLast7Days(mockActivities(TODAY), TODAY);
    expect(s.from).toBe(addDays(TODAY, -6));
    expect(s.runKm).toBeCloseTo(14.2 + 7.6 + 6.1, 5);
    expect(s.sessions).toEqual({ run: 3, strength: 2 });
    expect(s.longestRun?.km).toBeCloseTo(14.2);
    expect(s.avgPaceSecPerKm).toBeGreaterThan(0);
  });
  it("tanpa aktivitas tidak error", () => {
    const s = summarizeLast7Days([], TODAY);
    expect(s.runKm).toBe(0);
    expect(s.avgPaceSecPerKm).toBeUndefined();
  });
});

describe("readiness advisory", () => {
  it("data demo memicu peringatan (HRV turun, RHR naik, long run kemarin)", () => {
    const r = assessReadiness(mockWellness(TODAY), mockActivities(TODAY), TODAY);
    expect(r.caution).toBe(true);
    expect(r.reasons).toHaveLength(3);
  });
  it("kondisi normal tidak memicu peringatan", () => {
    const w = mockWellness(TODAY).map((x) => (x.date === TODAY ? { ...x, hrv: 63, restingHr: 52 } : x));
    const acts = mockActivities(TODAY).filter((a) => a.date !== addDays(TODAY, -1));
    expect(assessReadiness(w, acts, TODAY).caution).toBe(false);
  });
  it("tanpa data sama sekali", () => {
    expect(assessReadiness([], [], TODAY)).toEqual({ caution: false, reasons: [], hasData: false });
  });
  it("turun satu level", () => {
    expect(lowerDifficulty("high")).toBe("moderate");
    expect(lowerDifficulty("moderate")).toBe("easy");
  });
});
