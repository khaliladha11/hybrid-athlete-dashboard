import { describe, expect, it } from "vitest";
import { heatmapSummary, heatmapWeeks } from "@/lib/insight/activity-heatmap";
import { complianceSummary, complianceWeeks } from "@/lib/insight/compliance-trend";
import type { Activity } from "@/lib/intervals/types";
import type { SessionResult } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";
import type { StSession } from "@/lib/st-session";

const TODAY = "2026-01-08"; // Kamis, minggu 2026-01-05

const plan = (id: string, plannedDate: string, kind: PlannedSession["kind"]): PlannedSession => ({
  id,
  week: 1,
  day: "Senin",
  plannedDate,
  date: plannedDate,
  kind,
  title: id,
  intensity: "easy",
});
const res = (status: SessionResult["status"]): SessionResult => ({ status, activityIds: [] });

describe("complianceWeeks", () => {
  const sessions = [
    plan("q1", "2025-12-30", "quality"),
    plan("l1", "2026-01-04", "long"),
    plan("st1", "2025-12-29", "st-lower"),
    plan("st2", "2026-01-01", "st-upper"),
    plan("e1", "2025-12-31", "easy"),
    plan("e2", "2026-01-06", "easy"),
    plan("r2", "2026-01-11", "race"),
    plan("st3", "2026-01-07", "st-upper"),
  ];
  const results = new Map<string, SessionResult>([
    ["q1", res("terpenuhi")],
    ["l1", res("sebagian")],
    ["st1", res("terpenuhi")],
    ["st2", res("belum")],
    ["e1", res("dilewati")],
    ["e2", res("terpenuhi")],
    ["st3", res("belum")],
  ]);
  const rows = complianceWeeks(sessions, results, TODAY, 2);

  it("lari & ST terpisah, sebagian dihitung, dilewati tidak dihitung", () => {
    expect(rows[0].run).toEqual({ terpenuhi: 1, sebagian: 1, belum: 0, total: 2 });
    expect(rows[0].st).toEqual({ terpenuhi: 1, sebagian: 0, belum: 1, total: 2 });
  });

  it("minggu berjalan (belum lengkap): sesi mendatang tetap belum, lomba = lari", () => {
    expect(rows[1].current).toBe(true);
    expect(rows[1].run).toEqual({ terpenuhi: 1, sebagian: 0, belum: 1, total: 2 });
    expect(rows[1].st).toEqual({ terpenuhi: 0, sebagian: 0, belum: 1, total: 1 });
  });

  it("ringkasan hanya dari minggu selesai, tanpa kata gagal", () => {
    const s = complianceSummary(rows);
    expect(s).toEqual({ drawable: true, text: "Lari 1 dari 2 sesi terpenuhi, ST 1 dari 2 sesi terpenuhi dalam 1 minggu selesai. 1 sesi sebagian." });
    expect(s.text).not.toMatch(/gagal|terlewat/i);
  });

  it("tanpa program, dan hanya minggu berjalan", () => {
    expect(complianceSummary(complianceWeeks([], new Map(), TODAY, 6)).drawable).toBe(false);
    expect(complianceSummary(complianceWeeks([plan("x", "2026-01-06", "easy")], new Map(), TODAY, 6)).text).toContain("belum selesai");
  });
});

describe("heatmapWeeks", () => {
  const act = (id: string, date: string, category: Activity["category"]): Activity => ({ id, name: id, type: "x", category, date, startLocal: `${date}T06:00:00`, movingTimeSec: 1800 });
  const ses = (id: string, date: string): StSession => ({
    id,
    date,
    startedAt: `${date}T12:00:00.000Z`,
    type: "lower",
    title: "Lower",
    difficulty: "easy",
    durationMin: 30,
    rpe: 5,
    setsDone: 4,
    setsPlanned: 4,
    movements: [],
    updatedAt: `${date}T13:00:00.000Z`,
  });

  it("lari / ST / keduanya / istirahat di tanggal asli; jalan = istirahat; mendatang", () => {
    const acts = [act("r", "2026-01-05", "run"), act("w", "2026-01-06", "walk"), act("r2", "2026-01-07", "run"), act("s", "2026-01-07", "strength")];
    const rows = heatmapWeeks(acts, [ses("l", "2026-01-08")], ["2026-01-04"], TODAY, 2);
    const cls = Object.fromEntries(rows.flatMap((r) => r.days).map((d) => [d.date, d.cls]));
    expect(cls["2026-01-04"]).toBe("st");
    expect(cls["2026-01-05"]).toBe("run");
    expect(cls["2026-01-06"]).toBe("rest");
    expect(cls["2026-01-07"]).toBe("both");
    expect(cls["2026-01-08"]).toBe("st");
    expect(cls["2026-01-09"]).toBe("future");
  });

  it("ST lokal yang sama dengan aktivitas strength tidak dihitung dobel (tetap satu hari ST)", () => {
    const s = { ...ses("l", "2026-01-07"), startedAt: "2026-01-06T23:00:00.000Z" }; // 06:00 WIB
    const rows = heatmapWeeks([act("s", "2026-01-07", "strength")], [s], [], TODAY, 1);
    expect(rows[0].days.find((d) => d.date === "2026-01-07")!.cls).toBe("st");
  });

  it("12 dan 26 minggu, Senin sampai Minggu", () => {
    for (const n of [12, 26]) {
      const rows = heatmapWeeks([], [], [], TODAY, n);
      expect(rows).toHaveLength(n);
      expect(rows.every((r) => r.days.length === 7)).toBe(true);
    }
  });

  it("ringkasan dan kondisi kosong", () => {
    expect(heatmapSummary(heatmapWeeks([], [], [], TODAY, 12))).toEqual({ drawable: false, text: "Belum ada lari atau ST tercatat dalam 12 minggu terakhir." });
    const rows = heatmapWeeks([act("a", "2025-12-29", "run"), act("b", "2025-12-30", "strength"), act("c", "2025-12-30", "run"), act("d", "2026-01-05", "run")], [], [], TODAY, 2);
    expect(heatmapSummary(rows).text).toBe("Rata-rata 2,0 hari aktif per minggu: 3 hari lari, 1 hari ST, 1 di antaranya lari + ST.");
  });
});
