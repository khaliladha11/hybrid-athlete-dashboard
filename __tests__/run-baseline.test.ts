import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultSettings, resolveProfile } from "@/lib/athlete-settings";
import { CONDITION_IDS } from "@/lib/conditions";
import { DIFFICULTIES, DURATIONS, blockContext, generateRunWorkout } from "@/lib/generator";
import { baseProfile } from "@/lib/profile";

/**
 * Keluaran generator lari tanpa parameter baru harus identik dengan sebelum 0.13.1 (seed yang sama).
 * Fixture dibuat sekali dari kode sebelum perubahan: `UPDATE_RUN_BASELINE=1 npx vitest run __tests__/run-baseline.test.ts`.
 */
const FIXTURE = path.join(process.cwd(), "__tests__/fixtures/run-generator-baseline.json");
const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1);
const BLOCKS = { blok1: blockContext("2026-01-05", "2026-01-05"), deload: blockContext("2026-01-26", "2026-01-05"), bebas: undefined };
const PROFILES = {
  netral: resolveProfile(baseProfile, defaultSettings(baseProfile)),
  semuaKondisi: resolveProfile(baseProfile, { ...defaultSettings(baseProfile), conditions: [...CONDITION_IDS] }),
};

function currentHashes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [pName, p] of Object.entries(PROFILES))
    for (const cadenceSpm of [undefined, 168])
      for (const duration of DURATIONS)
        for (const difficulty of DIFFICULTIES)
          for (const [bName, block] of Object.entries(BLOCKS)) {
            const all = SEEDS.map((seed) => generateRunWorkout({ duration, difficulty, seed, block, free: !block, cadenceSpm }, p));
            out[`${pName}/${cadenceSpm ?? "-"}/${duration}/${difficulty}/${bName}`] = createHash("sha256").update(JSON.stringify(all)).digest("hex").slice(0, 16);
          }
  return out;
}

describe("generator lari: keluaran tanpa parameter baru tetap identik", () => {
  it("hash sama dengan baseline sebelum 0.13.1", () => {
    const now = currentHashes();
    if (process.env.UPDATE_RUN_BASELINE === "1") {
      writeFileSync(FIXTURE, JSON.stringify(now, null, 2) + "\n");
    }
    const baseline = JSON.parse(readFileSync(FIXTURE, "utf-8")) as Record<string, string>;
    expect(Object.keys(baseline)).toHaveLength(2 * 2 * 3 * 3 * 3);
    expect(now).toEqual(baseline);
  });
});
