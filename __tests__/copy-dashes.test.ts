import { describe, expect, it, vi } from "vitest";
import { defaultSettings, resolveProfile } from "@/lib/athlete-settings";
import { CONDITION_IDS } from "@/lib/conditions";
import { readinessAdvice, weeklyAdvice } from "@/lib/coach";
import { addDays } from "@/lib/date";
import { DIFFICULTIES, DURATIONS, STRENGTH_TYPES, blockContext, generateRunWorkout, generateStrengthWorkout } from "@/lib/generator";
import { META } from "@/lib/generator/meta";
import type { Activity } from "@/lib/intervals/types";
import { MOVEMENT_MEDIA } from "@/lib/movements/media";
import { RACES, buildProgram, type RaceTarget } from "@/lib/program";
import { planSessions } from "@/lib/program/sessions";
import { baseProfile } from "@/lib/profile";
import { recommend, type LogEntry } from "@/lib/progression";

// Profil contoh (kondisi + home gym), data fiktif.
vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

/** DESIGN-SYSTEM §7: tanpa em dash di teks UI (en dash hanya di dalam rentang angka). */
const DASH = /—/;
const clean = (where: string, t: string | undefined) => expect(t ?? "", where).not.toMatch(DASH);

const TODAY = "2026-03-09";
const act = (daysAgo: number, over: Partial<Activity>): Activity => ({ id: `a${daysAgo}${over.name}`, name: "Easy Run", type: "Run", category: "run", date: addDays(TODAY, -daysAgo), ...over });

describe("teks UI tanpa em dash", () => {
  it("saran coach (80/20, progresi jarak, setelah ST kaki, setelah lari berat, readiness)", () => {
    const acts = [
      act(0, { name: "ST Lower", type: "WeightTraining", category: "strength" }),
      act(1, { name: "Long Run", distanceKm: 16, avgHr: 140 }),
      act(2, { name: "Tempo", distanceKm: 8, avgHr: 160 }),
      act(3, { name: "Interval", distanceKm: 8, avgHr: 162 }),
      act(10, { name: "Easy", distanceKm: 6, avgHr: 135 }),
    ];
    const advice = [...weeklyAdvice(acts, TODAY), ...readinessAdvice({ caution: true, reasons: ["HRV 40 ms, 20% di bawah rata-rata 7 hari (50 ms)."] } as never)];
    expect(advice.map((a) => a.id)).toEqual(expect.arrayContaining(["polarized", "volume", "after-leg-st", "after-hard-run"]));
    for (const a of advice) {
      clean(a.id, a.title);
      clean(a.id, a.message);
    }
  });

  it("alasan progresi (aturan lama)", () => {
    const m = { name: "Barbell Squat", weight: "10–16 kg" };
    const log = (date: string, load: number, value: number, rpe: number, over: Partial<LogEntry> = {}): LogEntry => ({ id: date + rpe, date, movement: m.name, load, value, valueUnit: "reps", target: { lo: 10, hi: 12 }, rpe, targetRpe: 6, deload: false, blockIndex: 0, ...over });
    const cases = [[log("2026-03-02", 12, 12, 6), log("2026-03-05", 12, 12, 6)], [log("2026-03-05", 12, 12, 6)], [log("2026-03-05", 12, 10, 9)], [log("2026-03-05", 12, 10, 7)], [log("2026-03-02", 16, 12, 6), log("2026-03-05", 16, 12, 6)]];
    for (const h of cases) clean("progresi", recommend(m, h, { deload: false })?.reason);
    clean("deload", recommend(m, cases[0], { deload: true })?.reason);
  });

  it("catatan & cue generator ST dan lari, cue & catatan kondisi gerakan", () => {
    const p = resolveProfile(baseProfile, { ...defaultSettings(baseProfile), conditions: [...CONDITION_IDS] });
    const blocks = [blockContext("2026-01-05", "2026-01-05"), blockContext("2026-01-26", "2026-01-05")];
    for (const block of blocks)
      for (const duration of DURATIONS)
        for (const difficulty of DIFFICULTIES) {
          for (const type of STRENGTH_TYPES) {
            const w = generateStrengthWorkout({ type, duration, difficulty, seed: 7, block }, p);
            for (const t of [...w.notes, ...w.items.map((i) => i.cue)]) clean(`${type}/${duration}/${difficulty}`, t);
          }
          for (const cadenceSpm of [undefined, 168, 178]) {
            const r = generateRunWorkout({ duration, difficulty, seed: 7, block, cadenceSpm }, p);
            clean(`lari/${duration}/${difficulty}`, JSON.stringify(r));
          }
        }
    for (const [n, m] of Object.entries(META)) clean(n, m.cue);
    for (const [n, m] of Object.entries(MOVEMENT_MEDIA)) for (const t of [...m.cues, ...Object.values(m.conditionNotes ?? {})]) clean(n, t);
  });

  it("program: judul sesi, fokus minggu, peringatan, catatan ST", () => {
    for (const race of Object.keys(RACES) as RaceTarget[])
      for (const currentLongRunKm of [undefined, 3, 8]) {
        const pr = buildProgram({ race, goalSec: RACES[race].defaultGoalSec, startDate: "2026-01-05", runsPerWeek: 3, currentLongRunKm });
        for (const t of [...pr.warnings, pr.strengthNote, ...pr.weeks.map((w) => w.focus), ...planSessions(pr, "x").flatMap((s) => [s.title, s.detail])]) clean(race, t);
      }
  });
});
