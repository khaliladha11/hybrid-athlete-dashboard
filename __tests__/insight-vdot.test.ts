import { describe, expect, it } from "vitest";
import type { RaceResult } from "@/lib/athlete-settings";
import { goalGapSec, goalVdot, vdotSummary, vdotWeeks } from "@/lib/insight/vdot-trend";
import type { Activity } from "@/lib/intervals/types";
import { RACES } from "@/lib/program";
import { vdot } from "@/lib/run-zones";

const TODAY = "2026-01-08"; // Kamis
const run = (id: string, date: string, km: number, secPerKm: number): Activity => ({
  id,
  name: "Run",
  type: "Run",
  category: "run",
  date,
  distanceKm: km,
  movingTimeSec: km * secPerKm,
});
const race = (date: string, seconds: number): RaceResult => ({ distance: "5k", seconds, date }) as RaceResult;
const program = (goalSec: number) => ({ input: { goalSec } as never, spec: RACES.hm });

describe("vdotWeeks", () => {
  it("hanya memakai data sampai akhir minggu itu", () => {
    const acts = [run("a", "2025-12-16", 5, 360), run("b", "2026-01-06", 5, 330)];
    const rows = vdotWeeks(acts, [], TODAY, 6);
    const w = (start: string) => rows.find((r) => r.start === start)!;
    expect(w("2025-12-01").vdot).toBeUndefined();
    expect(w("2025-12-15").vdot).toBeCloseTo(vdot(5000, 1800), 1);
    expect(w("2025-12-29").vdot).toBe(w("2025-12-15").vdot);
    expect(w("2026-01-05").vdot).toBeCloseTo(vdot(5000, 1650), 1);
    expect(w("2026-01-05").confidence).toBe("rendah");
  });

  it("minggu berjalan memakai data sampai hari ini saja", () => {
    const rows = vdotWeeks([run("x", "2026-01-10", 5, 300)], [], TODAY, 2);
    expect(rows.at(-1)!.vdot).toBeUndefined();
  });

  it("hasil lomba lebih diutamakan, keyakinan tinggi", () => {
    const rows = vdotWeeks([run("a", "2025-12-30", 10, 300)], [race("2025-12-20", 1500)], TODAY, 3);
    const last = rows.at(-1)!;
    expect(last.source).toBe("race");
    expect(last.confidence).toBe("tinggi");
    expect(last.vdot).toBeCloseTo(vdot(5000, 1500), 1);
  });

  it("sumber lebih dari 90 hari tidak dipakai", () => {
    expect(vdotWeeks([run("old", "2025-09-01", 5, 330)], [], TODAY, 1)[0].vdot).toBeUndefined();
  });
});

describe("target", () => {
  it("tanpa program → tanpa target", () => {
    expect(goalVdot(null)).toBeUndefined();
  });
  it("VDOT target dan selisih detik/km", () => {
    const g = goalVdot(program(2 * 3600))!;
    expect(g.label).toBe("HM 21K");
    expect(g.vdot).toBeCloseTo(vdot(21097.5, 7200), 1);
    expect(goalGapSec(g.vdot + 2, g)).toBeNull();
    expect(goalGapSec(g.vdot - 3, g)).toBeGreaterThan(0);
  });
});

describe("vdotSummary", () => {
  it("tanpa sumber", () => {
    expect(vdotSummary(vdotWeeks([], [], TODAY, 6))).toEqual({ drawable: false, text: "Belum ada hasil lomba atau lari ≥ 3 km dalam 90 hari untuk menghitung VDOT." });
  });
  it("satu minggu → nilai saat ini, belum cukup untuk tren", () => {
    const s = vdotSummary(vdotWeeks([run("a", "2026-01-06", 5, 330)], [], TODAY, 6));
    expect(s.drawable).toBe(false);
    expect(s.text).toMatch(/^VDOT saat ini \d+,\d \(keyakinan rendah\)\. Belum ada data cukup/);
  });
  it("naik dengan selisih ke target", () => {
    const acts = [run("a", "2025-12-16", 5, 360), run("b", "2026-01-06", 5, 330)];
    const s = vdotSummary(vdotWeeks(acts, [], TODAY, 6), goalVdot(program(90 * 60)));
    expect(s.drawable).toBe(true);
    expect(s.text).toMatch(/^VDOT naik dari \d+,\d menjadi \d+,\d \(keyakinan rendah\)\. Selisih \d:\d\d\/km ke target HM 21K\.$/);
  });
  it("sudah di jalur target", () => {
    const acts = [run("a", "2025-12-16", 5, 300), run("b", "2026-01-06", 5, 300)];
    const s = vdotSummary(vdotWeeks(acts, [], TODAY, 6), goalVdot(program(3 * 3600)));
    expect(s.text).toMatch(/^VDOT stabil di \d+,\d \(keyakinan rendah\)\. Perkiraan sudah di jalur target HM 21K\.$/);
  });
});
