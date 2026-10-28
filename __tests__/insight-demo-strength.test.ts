import { describe, expect, it } from "vitest";
import { prSeries } from "@/lib/insight/pr-trend";
import { patternMap, stWork, strengthWeeks } from "@/lib/insight/strength-trends";
import { DEMO_BARBELL_CAP_KG, mockInsightActivities, mockInsightStrength } from "@/lib/mock-data";
import { baseProfile } from "@/lib/profile";
import { dedupeStSessions, normalizeSessions } from "@/lib/st-session";

const TODAY = "2026-10-28";
const demo = mockInsightStrength(TODAY);

describe("data ST demo Insight", () => {
  it("deterministik dan valid menurut validator sesi", () => {
    expect(mockInsightStrength(TODAY)).toEqual(demo);
    expect(normalizeSessions(demo.sessions)).toHaveLength(demo.sessions.length);
  });

  it("setiap sesi berpasangan dengan aktivitas strength demo (tidak dobel)", () => {
    const items = dedupeStSessions(demo.sessions, mockInsightActivities(TODAY));
    expect(items.every((i) => i.source === "local" && i.activityId)).toBe(true);
  });

  it("minggu lama tanpa rincian set (perkiraan), minggu baru dengan rincian", () => {
    const rows = strengthWeeks(stWork(demo.sessions, demo.log), demo.sessions, patternMap(baseProfile.movementLibrary), TODAY, 12);
    expect(rows.some((r) => r.estimated)).toBe(true);
    expect(rows.some((r) => !r.estimated && r.patterns.lower.sets > 0)).toBe(true);
  });

  it("Barbell Squat mentok di batas alat lalu rep naik, tempo, varian", () => {
    const s = prSeries("Barbell Squat", demo.prs, demo.log, DEMO_BARBELL_CAP_KG);
    expect(s.cappedSince).toBeDefined();
    const markers = s.points.flatMap((p) => p.markers);
    expect(markers).toContain("rep");
    expect(markers).toContain("tempo");
    expect(markers).toContain("variant");
  });
});
