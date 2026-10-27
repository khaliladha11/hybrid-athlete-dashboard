import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RACES, buildProgram, type RaceTarget } from "@/lib/program";
import { isRunKind, planSessions } from "@/lib/program/sessions";

/**
 * Program panjang tetap (sebelum 0.13.3) harus tetap identik: 4 jarak × 3/4 lari × long run awal × target.
 * Sejak 0.14.1 hanya sesi lari yang dibandingkan (tanpa catatan ST); jadwal ST mengikuti fase dan diuji di
 * `st-phase.test.ts`.
 * Fixture dibuat sekali dari kode sebelum perubahan: `UPDATE_PROGRAM_BASELINE=1 npx vitest run __tests__/program-baseline.test.ts`.
 */
const FIXTURE = path.join(process.cwd(), "__tests__/fixtures/program-baseline.json");
const START = "2026-01-05";
const LONGS = [undefined, 0, 5, 8, 12, 20, 40];

function currentHashes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const race of Object.keys(RACES) as RaceTarget[])
    for (const runsPerWeek of [3, 4] as const)
      for (const currentLongRunKm of LONGS)
        for (const goalSec of [RACES[race].defaultGoalSec, Math.round(RACES[race].defaultGoalSec * 0.7)]) {
          const p = buildProgram({ race, goalSec, startDate: START, runsPerWeek, currentLongRunKm });
          const sessions = planSessions(p, `${race}-${START}`).filter((x) => isRunKind(x.kind));
          out[`${race}/${runsPerWeek}/${currentLongRunKm ?? "-"}/${goalSec}`] = createHash("sha256").update(JSON.stringify({ p: { ...p, strengthNote: undefined }, sessions })).digest("hex").slice(0, 16);
        }
  return out;
}

describe("program panjang tetap: keluaran identik dengan sebelum 0.13.3", () => {
  it("hash sama dengan baseline", () => {
    const now = currentHashes();
    if (process.env.UPDATE_PROGRAM_BASELINE === "1") writeFileSync(FIXTURE, JSON.stringify(now, null, 2) + "\n");
    const baseline = JSON.parse(readFileSync(FIXTURE, "utf-8")) as Record<string, string>;
    expect(Object.keys(baseline)).toHaveLength(4 * 2 * LONGS.length * 2);
    expect(now).toEqual(baseline);
  });
});
