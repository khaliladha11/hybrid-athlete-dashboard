import { describe, expect, it, vi } from "vitest";
import { addDays } from "@/lib/date";
import { readinessAdvice, weeklyAdvice } from "@/lib/coach";
import { DIFFICULTIES, DURATIONS, STRENGTH_TYPES, generateRunWorkout, generateStrengthWorkout, runTargets } from "@/lib/generator";
import type { Locale } from "@/lib/i18n/locale";
import { mockInsightActivities, mockInsightStrength, mockInsightWellness } from "@/lib/mock-data";
import { RACES, buildProgram, weekToText, type RaceTarget } from "@/lib/program";
import { planSessions } from "@/lib/program/sessions";
import { toGenerator } from "@/lib/program/to-generator";
import { recommendToday } from "@/lib/program/week-plan";
import { profile, type Movement } from "@/lib/profile";
import { applyProgression } from "@/lib/progression";
import { assessReadiness } from "@/lib/readiness";

/**
 * Paritas bahasa (1.2.0): fungsi `lib/` yang sama dijalankan dengan `id` dan `en`. Struktur, angka, urutan, dan
 * cabang harus identik; yang boleh beda hanya teks. Teks Inggris juga dicek terhadap aturan copy (DESIGN-SYSTEM §7).
 */

// Profil contoh (kondisi + home gym lengkap) supaya catatan kondisi dan progresi ikut teruji.
vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

const TODAY = "2026-10-14";
const SEEDS = [1, 7920, 15839, 23758];

/** Kerangka nilai: setiap string jadi "§" plus angka di dalamnya, supaya hanya teks yang boleh berbeda. */
function skeleton(v: unknown): unknown {
  if (typeof v === "string") return `§${(v.match(/\d+/g) ?? []).join(",")}`;
  if (Array.isArray(v)) return v.map(skeleton);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, skeleton(x)]));
  return v;
}

function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

const ID_WORDS = /(yang|dan|untuk|belum|sudah|tidak|jangan|minggu|hari|sesi|latihan|lari|kemarin|dengan|sampai)/i;
const badEnDash = (s: string) => /–/.test(s.replace(/[\d:'"]+\s?–\s?[\d:'"]+/g, ""));

function expectParity(run: (l: Locale) => unknown, label: string) {
  const id = run("id");
  const en = run("en");
  expect(skeleton(en), label).toEqual(skeleton(id));
  for (const t of strings(en)) {
    expect(t.includes("—"), `${label}: ${t}`).toBe(false);
    expect(badEnDash(t), `${label}: ${t}`).toBe(false);
    expect(t.includes("!"), `${label}: ${t}`).toBe(false);
    expect(ID_WORDS.test(t), `${label}: ${t}`).toBe(false);
  }
  return { id, en };
}

describe("paritas generator", () => {
  it("lari: semua durasi × kesulitan × seed", () => {
    for (const duration of DURATIONS)
      for (const difficulty of DIFFICULTIES)
        for (const seed of SEEDS) expectParity((locale) => generateRunWorkout({ duration, difficulty, seed, locale }), `run ${duration} ${difficulty} ${seed}`);
  });

  it("strength: semua tipe × durasi × kesulitan × seed, dengan progresi", () => {
    const { log, prs } = mockInsightStrength(TODAY);
    const movements = new Map(
      Object.values(profile.movementLibrary)
        .flat()
        .filter((m): m is Movement => typeof m !== "string")
        .map((m) => [m.name, m]),
    );
    for (const type of STRENGTH_TYPES)
      for (const duration of DURATIONS)
        for (const difficulty of DIFFICULTIES)
          for (const seed of SEEDS)
            expectParity(
              (locale) => applyProgression(generateStrengthWorkout({ type, duration, difficulty, seed, locale }), movements, log, prs, { locale }),
              `st ${type} ${duration} ${difficulty} ${seed}`,
            );
  });

  it("target zona lari", () => {
    expectParity((locale) => runTargets(profile, locale), "runTargets");
  });
});

describe("paritas Gita", () => {
  it("saran mingguan dan kesiapan dari data demo", () => {
    const acts = mockInsightActivities(TODAY);
    const wellness = mockInsightWellness(TODAY);
    for (let d = 0; d < 21; d += 3) {
      const today = addDays(TODAY, -d);
      const past = acts.filter((a) => (a.date ?? "") <= today);
      expectParity((locale) => weeklyAdvice(past, today, [], locale), `weekly ${today}`);
      expectParity((locale) => {
        const r = assessReadiness(wellness.filter((w) => w.date <= today), past, today, locale);
        return { r, advice: readinessAdvice(r, locale) };
      }, `readiness ${today}`);
    }
  });
});

describe("paritas program", () => {
  const TARGETS: RaceTarget[] = ["5k", "10k", "hm", "fm"];

  it("buildProgram, teks minggu, sesi, dan saran hari ini", () => {
    for (const race of TARGETS) {
      const input = { race, goalSec: RACES[race].defaultGoalSec, startDate: "2026-10-05", runsPerWeek: 3 as const };
      const { id, en } = expectParity((locale) => buildProgram(input, undefined, locale), `program ${race}`);
      expect(en).toBeTruthy();
      expectParity((locale) => {
        const p = buildProgram(input, undefined, locale);
        return p.weeks.map((w) => weekToText(p, w, locale));
      }, `weekToText ${race}`);
      expectParity((locale) => planSessions(buildProgram(input, undefined, locale), "p1", [], undefined, locale), `sessions ${race}`);
      expectParity((locale) => {
        const sessions = planSessions(buildProgram(input, undefined, locale), "p1", [], undefined, locale);
        const today = "2026-10-07";
        const remaining = sessions.filter((s) => s.plannedDate >= "2026-10-05" && s.plannedDate <= "2026-10-11");
        return recommendToday(remaining, { today, weekEnd: "2026-10-11", activities: mockInsightActivities(today), locale });
      }, `recommendToday ${race}`);
      expect(id).toBeTruthy();
      // Rute ke generator dibaca dari judul sesi: harus sama persis di kedua bahasa.
      const route = (l: Locale) => planSessions(buildProgram(input, undefined, l), "p1", [], undefined, l).map(toGenerator);
      expect(route("en"), `toGenerator ${race}`).toEqual(route("id"));
    }
  });
});
