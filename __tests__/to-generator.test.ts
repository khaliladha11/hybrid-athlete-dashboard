import { describe, expect, it } from "vitest";
import { generateRunWorkout } from "@/lib/generator";
import { buildProgram, RACES, type RaceTarget } from "@/lib/program";
import { evaluateCompliance } from "@/lib/program/compliance";
import { planSessions, type PlannedSession } from "@/lib/program/sessions";
import {
  generatorHref,
  nearestDuration,
  parseRunPrefill,
  parseStrengthPrefill,
  planToday,
  sessionCardText,
  shortTitle,
  todaySession,
  toGenerator,
} from "@/lib/program/to-generator";

const START = "2026-01-05";
const RACES_ALL: RaceTarget[] = ["5k", "10k", "hm", "fm"];
const all = (race: RaceTarget, runsPerWeek: 3 | 4) =>
  planSessions(buildProgram({ race, goalSec: RACES[race].defaultGoalSec, startDate: START, runsPerWeek }), `${race}-${START}`);
const params = (href: string) => Object.fromEntries(new URL(href, "https://x.test").searchParams);

describe("pemetaan sesi → generator (§4.4)", () => {
  it("semua jenis sesi × fase × jarak × 3/4 lari mengikuti tabel", () => {
    for (const race of RACES_ALL) {
      for (const runs of [3, 4] as const) {
        for (const s of all(race, runs)) {
          const t = toGenerator(s);
          const where = `${race}/${s.id}/${s.title}`;
          if (s.kind === "long" || s.kind === "race") expect(t.to, where).toBe("card");
          if (s.kind === "easy" || s.kind === "recovery") expect(t, where).toMatchObject({ to: "run", difficulty: "easy" });
          if (s.kind === "st-lower") expect(t, where).toMatchObject({ to: "strength", type: "lower", duration: 45 });
          if (s.kind === "st-upper") expect(t, where).toMatchObject({ to: "strength", type: s.week % 2 ? "upperPull" : "upperPush" });
          if (s.kind === "quality") {
            if (/^(Race pace|Sharpener)/.test(s.title)) expect(t.to, where).toBe("card");
            else if (s.intensity === "easy") expect(t, where).toMatchObject({ to: "run", difficulty: "easy", duration: 30 });
            else expect(t, where).toMatchObject({ to: "run", difficulty: s.intensity });
            if (/^Tempo/.test(s.title)) expect(t, where).toMatchObject({ pattern: "tempo" });
            if (/^Norwegian/.test(s.title)) expect(t, where).toMatchObject({ pattern: "4x4" });
          }
          if (t.to === "run") {
            expect([30, 45, 60]).toContain(t.duration);
            // Isian benar-benar menghasilkan pola yang diminta.
            const w = generateRunWorkout({ duration: t.duration, difficulty: t.difficulty, seed: 7, pattern: t.pattern });
            if (t.pattern === "tempo") expect(w.title).toMatch(/^Tempo/);
            if (t.pattern === "4x4") expect(w.title).toMatch(/^Norwegian 4×4/);
          }
        }
      }
    }
  });

  it("durasi dibulatkan ke 30/45/60 terdekat; quality tanpa menit dari jarak", () => {
    expect([25, 35, 40, 50, 53, 70].map(nearestDuration)).toEqual([30, 30, 45, 45, 60, 60]);
    const tempo = all("hm", 3).find((s) => s.title.startsWith("Tempo"))!;
    expect(toGenerator(tempo)).toEqual({ to: "run", difficulty: "moderate", duration: 45, pattern: "tempo" });
    const st = all("hm", 3).filter((s) => s.kind === "st-upper" && s.intensity === "easy");
    expect(st.length).toBeGreaterThan(0);
    for (const s of st) expect(toGenerator(s)).toMatchObject({ difficulty: "easy" });
  });

  it("judul quality yang tidak dikenali → kartu", () => {
    const odd: PlannedSession = { id: "x", week: 1, day: "Selasa", plannedDate: START, date: START, kind: "quality", title: "Hill repeats 8×30\"", intensity: "high", km: 6 };
    expect(toGenerator(odd)).toEqual({ to: "card" });
  });
});

describe("kartu sesi program", () => {
  const ctx = { easyPace: "7:20–8:43/km", racePace: "7:07/km" };
  const long = (intensity: "easy" | "moderate", km = 14): PlannedSession => ({ id: "l", week: 9, day: "Minggu", plannedDate: START, date: START, kind: "long", title: `Long run ${km} km`, intensity, km });

  it("format Copy Set: long run, long run progresif, lomba, race pace berseri, sharpener", () => {
    expect(sessionCardText(long("easy"), ctx)).toBe("Run [14 km, Pace 7:20–8:43]");
    expect(sessionCardText(long("moderate", 18), ctx)).toBe("Run [15 km, Pace 7:20–8:43]\nRun [3 km, Pace 7:07]");
    expect(sessionCardText(long("easy"), { ...ctx, km: 10.5 })).toBe("Run [10.5 km, Pace 7:20–8:43]");
    const hm = all("hm", 3);
    expect(sessionCardText(hm.find((s) => s.kind === "race")!, ctx)).toBe("Run [21.1 km, Pace 7:07]");
    expect(sessionCardText(hm.find((s) => s.title.startsWith("Race pace"))!, ctx)).toBe("Warm-up [10', Pace 7:20–8:43]\nSet 1: Run [2 km, Pace 7:07] & Rest [3'] × 3\nCool-down [10']");
    expect(sessionCardText(hm.find((s) => s.title.startsWith("Sharpener"))!, ctx)).toBe("Warm-up [15', Pace 7:20–8:43]\nSet 1: Run [1', Pace 7:07] & Rest [1'] × 4");
  });

  it("semua sesi kartu punya teks; tanpa em dash, en dash hanya di dalam rentang angka", () => {
    for (const race of RACES_ALL) {
      for (const s of all(race, 4).filter((x) => toGenerator(x).to === "card")) {
        const text = sessionCardText(s, ctx);
        expect(text.length, s.title).toBeGreaterThan(5);
        expect(text).not.toContain("—");
        expect(text.replace(/\d–\d/g, "")).not.toContain("–");
      }
    }
  });
});

describe("prefill generator lewat query", () => {
  const hm = all("hm", 3);

  it("lari: bolak-balik, label pendek, versi saran ditandai dan tanpa pola", () => {
    const tempo = hm.find((s) => s.title.startsWith("Tempo"))!;
    const href = generatorHref(tempo, toGenerator(tempo))!;
    expect(href.startsWith("/run?")).toBe(true);
    expect(parseRunPrefill(params(href))).toEqual({ week: tempo.week, kind: "quality", duration: 45, difficulty: "moderate", pattern: "tempo", label: "Tempo", planDifficulty: "moderate", planDuration: 45 });
    const lowered = parseRunPrefill(params(generatorHref(tempo, toGenerator(tempo), { difficulty: "easy" })!));
    expect(lowered).toEqual({ week: tempo.week, kind: "quality", duration: 45, difficulty: "easy", label: "Tempo", adjusted: true, planDifficulty: "moderate", planDuration: 45 });
  });

  it("strength: bolak-balik; kartu tidak punya tautan", () => {
    const st = hm.find((s) => s.kind === "st-lower")!;
    expect(parseStrengthPrefill(params(generatorHref(st, toGenerator(st))!))).toEqual({ week: 1, type: "lower", duration: 45, difficulty: "moderate", label: "ST Lower / Full Body" });
    const long = hm.find((s) => s.kind === "long")!;
    expect(generatorHref(long, toGenerator(long))).toBeNull();
  });

  it("query rusak atau bukan dari program → null; label aneh diganti", () => {
    expect(parseRunPrefill({})).toBeNull();
    expect(parseRunPrefill({ src: "program", w: "5", k: "quality", d: "50", lvl: "moderate" })).toBeNull();
    expect(parseRunPrefill({ src: "program", w: "5", k: "st-lower", d: "45", lvl: "moderate" })).toBeNull();
    expect(parseRunPrefill({ src: "program", w: "0", k: "easy", d: "45", lvl: "easy" })).toBeNull();
    expect(parseRunPrefill({ src: "program", w: "5", k: "easy", d: "45", lvl: "easy", p: "jalan", t: "<script>" })).toEqual({ week: 5, kind: "easy", duration: 45, difficulty: "easy", label: "Sesi program", planDifficulty: "easy", planDuration: 45 });
    // Rencana asli rusak → dianggap sama dengan isian.
    expect(parseRunPrefill({ src: "program", w: "5", k: "quality", d: "45", lvl: "easy", adj: "1", plvl: "brutal", pd: "99" })).toMatchObject({ adjusted: true, planDifficulty: "easy", planDuration: 45 });
    expect(parseStrengthPrefill({ src: "program", w: "5", type: "legs", d: "45", lvl: "easy" })).toBeNull();
  });

  it("label pendek", () => {
    expect(["Tempo 2×10'", "Easy run 40'", "Fartlek ringan 35'", "Interval 5×800 m", "Easy + strides 30'", "Norwegian 4×4"].map(shortTitle)).toEqual([
      "Tempo",
      "Easy run",
      "Fartlek ringan",
      "Interval",
      "Easy + strides",
      "Norwegian",
    ]);
  });
});

describe("sesi hari ini & rencana untuk saran", () => {
  const hm = all("hm", 3);

  it("sesi hari ini belum selesai, lari didahulukan; hari istirahat → null", () => {
    const tue = hm.find((s) => s.week === 5 && s.day === "Selasa")!;
    expect(todaySession(hm, new Map(), tue.date)?.id).toBe(tue.id);
    expect(todaySession(hm, new Map(), "2026-02-06")).toBeNull(); // Jumat, 3 lari/minggu
    const r = evaluateCompliance(hm, [{ id: "a", name: "Tempo", type: "Run", category: "run", date: tue.date, distanceKm: 7, movingTimeSec: 2700 }], [], tue.date);
    expect(todaySession(hm, r, tue.date)).toBeNull();
  });

  it("planToday: level & durasi generator, jarak, long run minggu lalu", () => {
    const tempo = hm.find((s) => s.week === 6 && s.kind === "quality")!;
    expect(planToday(tempo, hm)).toMatchObject({ kind: "quality", difficulty: "moderate", duration: 45 });
    const long = hm.find((s) => s.week === 6 && s.kind === "long")!;
    const prev = hm.find((s) => s.week === 5 && s.kind === "long")!;
    expect(planToday(long, hm)).toEqual({ kind: "long", difficulty: long.intensity, km: long.km, prevLongKm: prev.km });
    expect(planToday(hm.find((s) => s.kind === "st-lower")!, hm)).toBeNull();
  });
});
