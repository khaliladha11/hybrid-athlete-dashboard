import { describe, expect, it } from "vitest";
import type { Checkin } from "@/lib/checkin";
import { checkinDays, checkinSummary } from "@/lib/insight/checkin-trend";
import { monthlyLines, monthlySummary, previousMonth, showMonthlyCard } from "@/lib/insight/monthly";
import type { Activity } from "@/lib/intervals/types";
import type { LogEntry } from "@/lib/progression";
import type { PrEntry } from "@/lib/prs";
import type { StSession } from "@/lib/st-session";

describe("bulan & jendela kartu", () => {
  it("bulan sebelumnya, termasuk pergantian tahun", () => {
    expect(previousMonth("2026-11-03")).toEqual({ start: "2026-10-01", end: "2026-10-31", key: "2026-10", label: "Oktober 2026" });
    expect(previousMonth("2027-01-01")).toMatchObject({ start: "2026-12-01", end: "2026-12-31", key: "2026-12" });
    expect(previousMonth("2026-03-05")).toMatchObject({ end: "2026-02-28" });
  });
  it("tanggal 1–7, sekali per bulan", () => {
    expect(showMonthlyCard("2026-11-01", null)).toBe(true);
    expect(showMonthlyCard("2026-11-07", null)).toBe(true);
    expect(showMonthlyCard("2026-11-08", null)).toBe(false);
    expect(showMonthlyCard("2026-11-03", "2026-10")).toBe(false);
    expect(showMonthlyCard("2026-11-03", "2026-09")).toBe(true);
  });
});

describe("ringkasan bulanan", () => {
  const TODAY = "2026-11-03";
  const run = (id: string, date: string, km: number, secPerKm = 360): Activity => ({ id, name: "Lari", type: "Run", category: "run", date, startLocal: `${date}T06:00:00`, distanceKm: km, movingTimeSec: km * secPerKm });
  const st = (id: string, date: string): Activity => ({ id, name: "Lower Body ST", type: "WeightTraining", category: "strength", date, startLocal: `${date}T19:00:00`, movingTimeSec: 2400 });
  const ses = (id: string, date: string, startedAt: string): StSession => ({
    id,
    date,
    startedAt,
    type: "lower",
    title: "Lower",
    difficulty: "moderate",
    durationMin: 40,
    rpe: 6,
    setsDone: 6,
    setsPlanned: 6,
    movements: ["Barbell Squat"],
    sets: [{ movement: "Barbell Squat", load: 14, value: 10, unit: "reps" }],
    updatedAt: startedAt,
  });
  const pr = (id: string, movement: string, loadKg: number, date: string, reps?: number): PrEntry => ({ id, movement, loadKg, ...(reps ? { reps } : {}), date, source: "log", updatedAt: `${date}T00:00:00.000Z` });
  const log = (date: string): LogEntry => ({ id: `l${date}`, date, movement: "Floor Press", load: 10, value: 10, valueUnit: "reps", target: { lo: 8, hi: 12 }, rpe: 6, targetRpe: 6, deload: false, blockIndex: 0 });

  const s = monthlySummary({
    today: TODAY,
    activities: [run("a", "2026-09-28", 5, 330), run("b", "2026-10-05", 10.2, 340), run("c", "2026-10-20", 6), run("d", "2026-11-01", 8), st("x", "2026-10-07")],
    // Sesi lokal 7 Okt 19:00 WIB = aktivitas x (tidak dobel); log ★ 14 Okt tanpa sesi = hari ST lain.
    stSessions: [ses("s1", "2026-10-07", "2026-10-07T12:05:00.000Z"), ses("s2", "2026-10-28", "2026-10-28T12:00:00.000Z")],
    log: [log("2026-10-14")],
    prs: [pr("p1", "Barbell Squat", 15, "2026-10-07", 8), pr("p2", "Barbell Squat", 17, "2026-10-28", 8), pr("p3", "Floor Press", 12, "2026-09-30")],
    raceResults: [],
    available: ["Barbell Squat", "Floor Press"],
  });

  it("km & lari di bulan itu saja, hari ST tanpa dobel, PR baru terbaik per gerakan", () => {
    expect(s).toMatchObject({ key: "2026-10", runKm: 16.2, runs: 2, stDays: 3 });
    expect(s.newPrs).toEqual([{ movement: "Barbell Squat", loadKg: 17, reps: 8 }]);
  });

  it("VDOT akhir bulan vs akhir bulan sebelumnya; otot terlewat di akhir bulan", () => {
    expect(s.vdot?.from).toBeDefined();
    expect(s.vdot!.to).toBeGreaterThan(s.vdot!.from!);
    expect(s.vdot!.confidence).toBe("rendah");
    expect(s.rarely).toEqual(["Dada", "Trisep"]);
  });

  it("baris teks, termasuk bulan kosong", () => {
    const lines = monthlyLines(s);
    expect(lines[0]).toBe("Lari 16,2 km dalam 2 lari.");
    expect(lines[1]).toBe("ST di 3 hari.");
    expect(lines[2]).toBe("PR baru: Barbell Squat 17 kg × 8.");
    expect(lines[3]).toMatch(/^VDOT akhir bulan \d+,\d, naik \d+,\d dari bulan sebelumnya \(keyakinan rendah\)\.$/);
    const empty = monthlySummary({ today: TODAY, activities: [], stSessions: [], log: [], prs: [], raceResults: [], available: [] });
    expect(empty.rarely).toBeNull();
    expect(monthlyLines(empty)).toEqual([
      "Belum ada lari tercatat bulan ini.",
      "Belum ada sesi ST tercatat.",
      "Belum ada PR baru bulan ini.",
      "VDOT belum bisa dihitung (butuh hasil lomba atau lari ≥ 3 km dalam 90 hari).",
    ]);
    for (const l of lines) expect(l).not.toMatch(/[—–]/);
  });
});

describe("tren check-in", () => {
  const TODAY = "2026-01-08";
  const c = (date: string, over: Partial<Checkin>): Checkin => ({ date, updatedAt: `${date}T01:00:00.000Z`, ...over });
  it("hari tanpa check-in & yang dilewati tetap kosong; ringkasan", () => {
    const days = checkinDays([c("2026-01-05", { shin: 4, sleep: 2 }), c("2026-01-06", {}), c("2026-01-07", { shin: 2, sleep: 4 })], TODAY, 1);
    expect(days.map((d) => d.shin)).toEqual([4, undefined, 2, undefined]);
    expect(checkinSummary(days, 1)).toEqual({ drawable: true, text: "2 check-in dalam 1 minggu; nyeri shin rata-rata 3,0/10, 1 hari ≥ 4; tidur rata-rata 3,0/5." });
    expect(checkinSummary(checkinDays([], TODAY, 6), 6).drawable).toBe(false);
  });
});
