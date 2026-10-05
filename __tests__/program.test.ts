import { describe, expect, it } from "vitest";
import {
  RACES,
  buildProgram,
  currentWeekIndex,
  formatGoal,
  goalFromProfile,
  isCutback,
  longRunPlan,
  parseGoal,
  phaseOf,
  weekToText,
  type RaceTarget,
} from "@/lib/program";

const START = "2026-10-05"; // Senin
const TARGETS: RaceTarget[] = ["5k", "10k", "hm", "fm"];
const build = (race: RaceTarget, extra: Partial<Parameters<typeof buildProgram>[0]> = {}) =>
  buildProgram({ race, goalSec: RACES[race].defaultGoalSec, startDate: START, runsPerWeek: 3, ...extra });

describe("waktu target", () => {
  it("parse & format", () => {
    expect(parseGoal("30:00")).toBe(1800);
    expect(parseGoal("1:00:00")).toBe(3600);
    expect(parseGoal("2:59:30")).toBe(10770);
    expect(parseGoal("abc")).toBeUndefined();
    expect(parseGoal("30:75")).toBeUndefined();
    expect(parseGoal("0:00")).toBeUndefined();
    expect(formatGoal(1800)).toBe("30:00");
    expect(formatGoal(10770)).toBe("2:59:30");
  });

  it("target default dari profil (Sub-30m 5K, Sub-1h 10K, Sub-3h HM)", () => {
    expect(goalFromProfile("5k")).toBe(30 * 60);
    expect(goalFromProfile("10k")).toBe(60 * 60);
    expect(goalFromProfile("hm")).toBe(3 * 3600);
    expect(goalFromProfile("fm")).toBe(RACES.fm.defaultGoalSec); // tidak ada target FM di profil
  });
});

describe("struktur program per target", () => {
  it("jumlah minggu, fase berurutan, minggu terakhir = lomba", () => {
    const order = ["base", "build", "peak", "taper"];
    for (const race of TARGETS) {
      const p = build(race);
      expect(p.weeks).toHaveLength(RACES[race].weeks);
      const phases = p.weeks.map((w) => order.indexOf(w.phase));
      expect(phases).toEqual([...phases].sort((a, b) => a - b));
      expect(new Set(p.weeks.map((w) => w.phase))).toEqual(new Set(order));
      const last = p.weeks.at(-1)!;
      expect(last.raceWeek).toBe(true);
      const race_ = last.sessions.find((s) => s.isRace)!;
      expect(race_.km).toBe(RACES[race].km);
      expect(race_.intensity).toBe("high");
      expect(p.raceDate).toBe(last.sessions.length ? addDaysLocal(last.start, 6) : "");
    }
  });

  it("3 atau 4 lari per minggu (minggu lomba tanpa recovery run)", () => {
    for (const race of TARGETS) {
      for (const runs of [3, 4] as const) {
        const p = build(race, { runsPerWeek: runs });
        for (const w of p.weeks) {
          expect(w.sessions.length).toBe(w.raceWeek ? 3 : runs);
          for (const s of w.sessions) expect(["easy", "moderate", "high"]).toContain(s.intensity);
        }
      }
    }
  });

  it("taper: fase taper di akhir sesuai jarak", () => {
    expect(phaseOf(8, RACES["5k"])).toBe("taper");
    expect(phaseOf(7, RACES["5k"])).not.toBe("taper");
    expect(phaseOf(14, RACES.fm)).toBe("taper");
    expect(phaseOf(13, RACES.fm)).not.toBe("taper");
  });
});

describe("long run aman untuk riwayat shin splints", () => {
  it("naik ≤ 10% dan ≤ 2 km per minggu (di luar cutback), tidak melewati puncak", () => {
    for (const race of TARGETS) {
      for (const current of [undefined, 3, 8, 15, 25]) {
        const spec = RACES[race];
        const plan = longRunPlan(spec, current);
        const pre = spec.weeks - spec.taperWeeks;
        let prevLevel = plan[0];
        for (let w = 2; w <= pre; w++) {
          const v = plan[w - 1];
          expect(v).toBeLessThanOrEqual(spec.peakLongKm);
          if (isCutback(w, spec)) {
            expect(v).toBeLessThan(prevLevel);
            continue;
          }
          expect(v - prevLevel, `${race} w${w}`).toBeLessThanOrEqual(2);
          expect(v, `${race} w${w}`).toBeLessThanOrEqual(prevLevel * 1.1 + 1e-9);
          prevLevel = v;
        }
      }
    }
  });

  it("cutback setiap minggu ke-4 sebelum taper", () => {
    const p = build("hm");
    expect(p.weeks.filter((w) => w.cutback).map((w) => w.index)).toEqual([4, 8]);
    for (const w of p.weeks.filter((x) => x.cutback)) {
      expect(w.sessions.every((s) => s.intensity !== "high")).toBe(true);
    }
  });

  it("taper menurunkan volume menjelang lomba", () => {
    for (const race of TARGETS) {
      const p = build(race);
      const pre = RACES[race].weeks - RACES[race].taperWeeks;
      const peakLong = Math.max(...p.weeks.slice(0, pre).map((w) => w.longRunKm));
      for (const w of p.weeks.slice(pre, -1)) expect(w.longRunKm).toBeLessThan(peakLong);
    }
  });

  it("long run awal memakai data intervals.icu bila ada, maksimal 75% puncak", () => {
    expect(longRunPlan(RACES.hm, 14)[0]).toBe(13.5); // 75% × 18 = 13.5
    expect(longRunPlan(RACES.hm, 4)[0]).toBe(10); // minimal default program
  });
});

describe("pace & peringatan", () => {
  it("race pace dihitung dari target", () => {
    expect(Math.round(build("5k").racePaceSec)).toBe(360); // 30:00 / 5 km = 6:00/km
    expect(Math.round(build("10k").racePaceSec)).toBe(360);
  });

  it("FM tanpa basis → peringatan; target terlalu cepat → peringatan", () => {
    expect(build("fm", { currentLongRunKm: 8 }).warnings.join(" ")).toMatch(/basis/);
    expect(build("fm", { currentLongRunKm: 20, runsPerWeek: 4 }).warnings).toHaveLength(0);
    expect(build("hm", { runsPerWeek: 3 }).warnings.join(" ")).toMatch(/4 lari\/minggu/);
    expect(build("10k", { goalSec: 40 * 60 }).warnings.join(" ")).toMatch(/ambisius/);
  });

  it("minggu berjalan & teks salin", () => {
    const p = build("10k");
    expect(currentWeekIndex(p, "2026-10-05")).toBe(1);
    expect(currentWeekIndex(p, "2026-10-12")).toBe(2);
    expect(currentWeekIndex(p, "2026-09-30")).toBe(0);
    const text = weekToText(p, p.weeks[0]);
    expect(text).toContain("PB 10K · Minggu 1/10");
    expect(text).not.toMatch(/\|/);
  });
});

function addDaysLocal(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
