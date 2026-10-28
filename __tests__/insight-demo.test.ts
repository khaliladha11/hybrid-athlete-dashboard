import { describe, expect, it } from "vitest";
import { addDays, startOfWeekMonday } from "@/lib/date";
import { fitnessSeries } from "@/lib/insight/fitness";
import { runWeeks, volumeSummary } from "@/lib/insight/run-trends";
import { vdotWeeks } from "@/lib/insight/vdot-trend";
import { DEMO_REST_WEEK, mockActivities, mockInsightActivities, mockInsightWellness, mockWellness } from "@/lib/mock-data";

const TODAY = "2026-10-28";

describe("riwayat demo Insight", () => {
  it("deterministik dan memuat aktivitas demo 17 hari terakhir (sama dengan Profil)", () => {
    const a = mockInsightActivities(TODAY);
    expect(a).toEqual(mockInsightActivities(TODAY));
    const ids = new Set(a.map((x) => x.id));
    for (const m of mockActivities(TODAY)) expect(ids.has(m.id)).toBe(true);
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length);
    // Terbaru dulu, seperti getActivities.
    expect(a[0].startLocal! >= a.at(-1)!.startLocal!).toBe(true);
  });

  it("12 minggu terisi, satu minggu tanpa lari, satu lonjakan > 30%", () => {
    const rows = runWeeks(mockInsightActivities(TODAY), TODAY, 12);
    const rest = addDays(startOfWeekMonday(TODAY), -7 * DEMO_REST_WEEK);
    expect(rows.find((r) => r.start === rest)!.runs).toBe(0);
    expect(rows.filter((r) => r.runs > 0).length).toBeGreaterThanOrEqual(10);
    expect(rows.some((r) => r.jump)).toBe(true);
    expect(volumeSummary(rows).drawable).toBe(true);
  });

  it("sebagian easy run tanpa HR / cadence (seperti data jam asli)", () => {
    const easy = mockInsightActivities(TODAY).filter((a) => a.name === "Easy Run Z2");
    expect(easy.some((a) => a.avgHr === undefined)).toBe(true);
    expect(easy.some((a) => a.cadenceSpm === undefined)).toBe(true);
    // Cadence per kaki dari bentuk mentah sudah dikoreksi ke SPM total.
    expect(easy.filter((a) => a.cadenceSpm).every((a) => a.cadenceSpm! > 120)).toBe(true);
  });

  it("wellness 84 hari dengan CTL/ATL, 8 hari terakhir sama dengan Profil", () => {
    const w = mockInsightWellness(TODAY);
    expect(w).toHaveLength(84);
    expect(w.at(-1)!.date).toBe(TODAY);
    expect(w.every((x) => x.ctl !== undefined && x.atl !== undefined)).toBe(true);
    expect(w.slice(-8)).toEqual(mockWellness(TODAY));
    expect(fitnessSeries(w, TODAY, 12).drawable).toBe(true);
  });

  it("VDOT tersedia setiap minggu dari riwayat lari", () => {
    expect(vdotWeeks(mockInsightActivities(TODAY), [], TODAY, 12).every((r) => r.vdot !== undefined)).toBe(true);
  });
});

describe("transisi ambang 30 hari di Demo Mode (0.15.2)", () => {
  it("Profil demo (8 hari) = ambang umum, Insight demo (84 hari) = ambang pribadi", async () => {
    const { hrvBaseline, rhrBaseline } = await import("@/lib/thresholds");
    expect(hrvBaseline(mockWellness(TODAY), TODAY).active).toBe(false);
    expect(rhrBaseline(mockWellness(TODAY), TODAY).active).toBe(false);
    expect(hrvBaseline(mockInsightWellness(TODAY), TODAY).active).toBe(true);
    expect(rhrBaseline(mockInsightWellness(TODAY), TODAY).active).toBe(true);
  });
});

describe("check-in demo (0.15.2)", () => {
  it("valid, deterministik, tidak sampai hari ini", async () => {
    const { mockInsightCheckins } = await import("@/lib/mock-data");
    const { normalizeCheckins } = await import("@/lib/checkin");
    const c = mockInsightCheckins(TODAY);
    expect(normalizeCheckins(c)).toHaveLength(c.length);
    expect(c.every((x) => x.date < TODAY)).toBe(true);
    expect(mockInsightCheckins(TODAY)).toEqual(c);
  });
});
