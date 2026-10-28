import { describe, expect, it } from "vitest";
import { calendarItems, planMarker } from "@/lib/calendar";
import type { Activity } from "@/lib/intervals/types";
import { evaluateCompliance } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";
import type { StSession } from "@/lib/st-session";

// Minggu fiktif: Senin 2026-01-05.
const plan = (id: string, date: string, kind: PlannedSession["kind"], extra: Partial<PlannedSession> = {}): PlannedSession => ({
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
const run = (id: string, date: string, over: Partial<Activity> = {}): Activity => ({ id, name: "Tempo", type: "Run", category: "run", date, startLocal: `${date}T06:00:00`, distanceKm: 7, movingTimeSec: 2700, avgHr: 160, ...over });
const ses = (id: string, date: string, over: Partial<StSession> = {}): StSession => ({
  id,
  date,
  startedAt: `${date}T10:00:00.000Z`, // 17:00 WIB
  type: "lower",
  title: "Lower",
  difficulty: "moderate",
  durationMin: 45,
  rpe: 6,
  setsDone: 12,
  setsPlanned: 12,
  movements: [],
  updatedAt: `${date}T11:00:00.000Z`,
  ...over,
});
const TODAY = "2026-01-09";

describe("kalender: aktivitas di tanggal asli", () => {
  it("rencana ST Senin, ST dikerjakan Rabu: ST tampil Rabu; Senin tanpa aktivitas, penanda 'dipenuhi'", () => {
    const lower = plan("lower", "2026-01-05", "st-lower");
    const items = calendarItems([], [ses("s1", "2026-01-07")], []);
    expect([...items.keys()]).toEqual(["2026-01-07"]);
    expect(items.get("2026-01-07")).toEqual([{ kind: "local-st", date: "2026-01-07", id: "ses:s1", title: "ST Lower", minutes: 45 }]);
    const r = evaluateCompliance([lower], [], [], TODAY, [ses("s1", "2026-01-07")]);
    expect(items.has("2026-01-05")).toBe(false);
    expect(planMarker(lower, r.get("lower"), TODAY)).toBe("fulfilled");
    expect(r.get("lower")?.actualDate).toBe("2026-01-07");
  });

  it("rencana quality Selasa, lari Rabu: lari tampil Rabu, Selasa hanya penanda", () => {
    const q = plan("q", "2026-01-06", "quality", { km: 7, minutes: 45 });
    const items = calendarItems([run("r1", "2026-01-07")], [], []);
    expect(items.get("2026-01-07")?.map((i) => i.kind)).toEqual(["activity"]);
    expect(items.has("2026-01-06")).toBe(false);
    const r = evaluateCompliance([q], [run("r1", "2026-01-07")], [], TODAY);
    expect(planMarker(q, r.get("q"), TODAY)).toBe("fulfilled");
  });

  it("ST intervals.icu + sesi lokal yang sama → satu item (aktivitas); log ★ tanpa sesi tampil di tanggalnya", () => {
    const st: Activity = { id: "w1", name: "Weight Training", type: "WeightTraining", category: "strength", date: "2026-01-07", startLocal: "2026-01-07T17:05:00", movingTimeSec: 2700 };
    const items = calendarItems([st], [ses("s1", "2026-01-07")], ["2026-01-07", "2026-01-08"]);
    expect(items.get("2026-01-07")?.map((i) => i.kind)).toEqual(["activity"]);
    expect(items.get("2026-01-08")).toEqual([{ kind: "local-st", date: "2026-01-08", id: "log:2026-01-08", title: "ST (log ★)" }]);
  });

  it("penanda rencana: mendatang (warna intensitas), lewat & belum (netral), dilewati", () => {
    const fut = plan("f", "2026-01-10", "easy");
    const past = plan("p", "2026-01-06", "easy");
    expect(planMarker(fut, { status: "belum", activityIds: [] }, TODAY)).toBe("planned");
    expect(planMarker(past, { status: "belum", activityIds: [] }, TODAY)).toBe("open");
    expect(planMarker(past, { status: "dilewati", activityIds: [] }, TODAY)).toBe("skipped");
    expect(planMarker(past, { status: "sebagian", activityIds: ["x"] }, TODAY)).toBe("fulfilled");
  });
});
