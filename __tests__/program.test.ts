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
  phaseCounts,
  phaseOf,
  postRaceOffer,
  preBaseLongRuns,
  raceCountdown,
  raceWeekChecklist,
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

describe("jenis & durasi sesi (0.13)", () => {
  it("setiap sesi punya jenis; slot Selasa selalu quality, Minggu long atau lomba", () => {
    for (const race of TARGETS) {
      for (const runsPerWeek of [3, 4] as const) {
        const p = build(race, { runsPerWeek });
        for (const w of p.weeks) {
          const byDay = Object.fromEntries(w.sessions.map((s) => [s.day, s]));
          expect(byDay.Selasa.kind).toBe("quality");
          expect(byDay.Minggu.kind).toBe(w.raceWeek ? "race" : "long");
          if (runsPerWeek === 4 && !w.raceWeek) expect(byDay.Jumat.kind).toBe("recovery");
          for (const s of w.sessions) expect(["quality", "easy", "recovery", "long", "race"]).toContain(s.kind);
          expect(w.sessions.filter((s) => s.kind === "easy")).toHaveLength(1);
        }
      }
    }
  });

  it("durasi hanya untuk sesi berbasis waktu dan cocok dengan judulnya", () => {
    for (const race of TARGETS) {
      for (const w of build(race, { runsPerWeek: 4 }).weeks) {
        for (const s of w.sessions) {
          if (s.kind === "long" || s.kind === "race") expect(s.minutes, s.title).toBeUndefined();
          const m = s.title.match(/(\d+)'$/);
          if (s.minutes !== undefined) expect(s.title, s.title).toContain(`${s.minutes}'`);
          if (m && (s.kind === "easy" || s.kind === "recovery")) expect(s.minutes).toBe(Number(m[1]));
        }
      }
    }
  });
});

describe("panjang program dari Hari H (0.13.3)", () => {
  const MAX: Record<RaceTarget, number> = { "5k": 12, "10k": 14, hm: 20, fm: 24 };
  const sunday = (weeks: number) => addDaysLocal(START, weeks * 7 - 1);

  it("panjang standar dengan Hari H Minggu identik dengan program tanpa Hari H", () => {
    for (const race of TARGETS) {
      for (const currentLongRunKm of [undefined, 8, 15]) {
        const old = build(race, { currentLongRunKm });
        const now = build(race, { currentLongRunKm, weeks: RACES[race].weeks, raceDate: sunday(RACES[race].weeks) });
        expect({ ...now, input: old.input }).toEqual(old);
      }
    }
  });

  it("memendekkan: Base dulu, lalu Build; Peak & taper tidak pernah dipangkas", () => {
    for (const race of TARGETS) {
      const spec = RACES[race];
      const std = phaseCounts(spec);
      let prev = std;
      for (let weeks = spec.weeks - 1; weeks >= spec.taperWeeks + 2; weeks--) {
        const c = phaseCounts(spec, weeks);
        expect(c.base + c.build + c.peak + c.taper).toBe(weeks);
        expect(c.taper).toBe(spec.taperWeeks);
        expect(c.peak).toBe(Math.min(std.peak, weeks - spec.taperWeeks));
        if (c.build < std.build) expect(c.base).toBe(0); // Build baru dipangkas setelah Base habis
        expect(c.base).toBeLessThanOrEqual(prev.base);
        prev = c;
      }
    }
  });

  it("aturan kenaikan long run tidak pernah dilanggar di panjang apa pun; puncak yang tidak tercapai diberi peringatan", () => {
    for (const race of TARGETS) {
      const spec = RACES[race];
      for (let weeks = spec.taperWeeks + 2; weeks <= MAX[race]; weeks++) {
        for (const currentLongRunKm of [undefined, 9, 20]) {
          const p = build(race, { weeks, raceDate: sunday(weeks), currentLongRunKm });
          expect(p.weeks).toHaveLength(weeks);
          expect(p.weeks.filter((w) => w.phase === "taper")).toHaveLength(spec.taperWeeks);
          const levels = p.weeks.filter((w) => w.phase !== "taper" && !w.cutback).map((w) => w.longRunKm);
          for (let i = 1; i < levels.length; i++) {
            expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(Math.min(levels[i - 1] * 0.1, 2) + 1e-9);
            expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
          }
          const reached = Math.max(...p.weeks.map((w) => w.longRunKm));
          const standard = Math.max(...longRunPlan(spec, currentLongRunKm));
          const warned = p.warnings.some((w) => w.startsWith("Program lebih pendek dari standar"));
          expect(warned).toBe(weeks < spec.weeks && reached < standard);
          if (warned) expect(p.warnings.join(" ")).toContain(`${reached} km`);
        }
      }
    }
  });

  it("pre-Base: program inti identik dengan program sepanjang Max, long run naik pelan sampai titik awal inti", () => {
    for (const race of TARGETS) {
      const main = MAX[race];
      const inti = build(race, { weeks: main, raceDate: sunday(main) });
      const p = build(race, { weeks: main, preBaseWeeks: 6, rawLongestKm: 4, raceDate: sunday(main + 6) });
      expect(p.weeks).toHaveLength(main + 6);
      expect(p.weeks.slice(0, 6).every((w) => w.phase === "prebase")).toBe(true);
      // Program inti: isi minggu sama, hanya nomor & tanggal minggu yang bergeser.
      expect(p.weeks.slice(6).map((w) => ({ ...w, index: 0, start: "" }))).toEqual(inti.weeks.map((w) => ({ ...w, index: 0, start: "" })));
      const pre = p.weeks.slice(0, 6);
      expect(pre.every((w) => w.sessions.every((s) => s.intensity === "easy"))).toBe(true);
      expect(Math.max(...pre.map((w) => w.longRunKm))).toBeLessThanOrEqual(inti.weeks[0].longRunKm);
      expect(pre[0].longRunKm).toBe(5); // terjauh 4 km → mulai dari 5 km (kenaikan 10% di bawahnya < 0,5 km)
    }
    expect(preBaseLongRuns(8, 8, 12)).toEqual([8, 8.5, 9, 6.5, 9.5, 10, 11, 8]);
  });

  it("Hari H selain Minggu: sesi lomba di hari itu, sesi minggu lomba sesudahnya tidak dibuat", () => {
    const sat = addDaysLocal(START, 12 * 7 - 2);
    const p = build("hm", { weeks: 12, raceDate: sat });
    expect(p.raceDate).toBe(sat);
    const last = p.weeks.at(-1)!;
    expect(last.sessions.map((s) => s.day)).toEqual(["Selasa", "Rabu", "Sabtu"]);
    const tue = build("10k", { weeks: 10, raceDate: addDaysLocal(START, 9 * 7 + 1) }).weeks.at(-1)!;
    expect(tue.sessions.map((s) => `${s.day}:${s.kind}`)).toEqual(["Selasa:race"]);
  });
});

describe("hitung mundur & minggu lomba (0.13.2)", () => {
  const p = build("hm");

  it("sisa hari ke lomba; 0 di hari lomba; null setelahnya", () => {
    expect(raceCountdown(p, addDaysLocal(p.raceDate, -14))).toEqual({ days: 14 });
    expect(raceCountdown(p, p.raceDate)).toEqual({ days: 0 });
    expect(raceCountdown(p, addDaysLocal(p.raceDate, 1))).toBeNull();
  });

  it("checklist H-1: umum, rencana pace dari perkiraan bila berbeda, tanpa em dash", () => {
    const plain = raceWeekChecklist({ racePaceSec: p.racePaceSec });
    expect(plain).toHaveLength(4);
    expect(plain[3]).toContain(formatPaceSecLocal(p.racePaceSec));
    const pred = raceWeekChecklist({ racePaceSec: 341, predictedPaceSec: 355 });
    expect(pred[3]).toContain("perkiraan 5:55/km (target 5:41/km)");
    for (const line of [...plain, ...pred]) expect(line).not.toMatch(/—|!/);
  });

  it("tawaran catat hasil: H+1 sampai H+14, hilang setelah dicatat atau lewat dua minggu", () => {
    expect(postRaceOffer(p, [], p.raceDate)).toBe(false);
    expect(postRaceOffer(p, [], addDaysLocal(p.raceDate, 1))).toBe(true);
    expect(postRaceOffer(p, [], addDaysLocal(p.raceDate, 14))).toBe(true);
    expect(postRaceOffer(p, [], addDaysLocal(p.raceDate, 15))).toBe(false);
    expect(postRaceOffer(p, [{ distance: "hm", date: p.raceDate }], addDaysLocal(p.raceDate, 1))).toBe(false);
    // Hasil jarak lain atau sebelum lomba tidak menghapus tawaran.
    expect(postRaceOffer(p, [{ distance: "10k", date: p.raceDate }, { distance: "hm", date: addDaysLocal(p.raceDate, -30) }], addDaysLocal(p.raceDate, 1))).toBe(true);
  });
});

const formatPaceSecLocal = (sec: number) => `${Math.floor(Math.round(sec) / 60)}:${String(Math.round(sec) % 60).padStart(2, "0")}/km`;

function addDaysLocal(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
