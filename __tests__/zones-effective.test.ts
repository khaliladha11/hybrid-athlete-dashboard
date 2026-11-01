import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultSettings, resolveProfile, type AthleteSettings } from "@/lib/athlete-settings";
import { isHardRun } from "@/lib/coach";
import { generateRunWorkout, generateStrengthWorkout, MAX_STRENGTH_RPE, runTargets } from "@/lib/generator";
import { exportRun } from "@/lib/intervals/workout-export";
import { buildProgram, RACES } from "@/lib/program";
import { baseProfile } from "@/lib/profile";
import { hardRunThreshold } from "@/lib/thresholds";

const settings = (over: Partial<AthleteSettings>) => resolveProfile(baseProfile, { ...defaultSettings(baseProfile), ...over });
// HR maks 190 fiktif → Easy < 133, Z4 152–170.
const custom = settings({ hrZones: { mode: "maxHr", maxHr: 190 } });
const SEEDS = Array.from({ length: 20 }, (_, i) => i * 104729 + 7);

describe("zona HR efektif dipakai di semua tempat", () => {
  it("generator lari: target langkah dan catatan Easy", () => {
    const t = runTargets(custom);
    expect([t.easy.hr, t.tempo.hr, t.norwegian.hr, t.mini.hr, t.recovery.hr]).toEqual(["< 133", "152–170", "152–170", "≥ 152", "< 114"]);
    for (const seed of SEEDS) {
      const easy = generateRunWorkout({ duration: 45, difficulty: "easy", seed, free: true }, custom);
      for (const b of easy.blocks) for (const s of b.steps) if (s.kind === "run") expect(s.hr).toBe("< 133");
      expect(easy.notes).toContain("Jaga HR < 133. Kalau HR naik, perlambat atau jalan sampai turun.");
      const tempo = generateRunWorkout({ duration: 45, difficulty: "moderate", seed, free: true, pattern: "tempo" }, custom);
      expect(tempo.blocks.some((b) => b.steps.some((s) => s.hr === "152–170"))).toBe(true);
    }
    const ff = generateRunWorkout({ duration: 60, difficulty: "high", seed: 1, free: true, pattern: "15/15" }, custom);
    expect(ff.blocks.flatMap((b) => b.steps).some((s) => s.hr === "turun ke < 133")).toBe(true);
  });

  it("program: detail Easy dan long run", () => {
    const program = buildProgram({ race: "hm", goalSec: RACES.hm.defaultGoalSec, startDate: "2026-01-05", runsPerWeek: 4 }, custom);
    const details = program.weeks.flatMap((w) => w.sessions).map((s) => s.detail ?? "");
    expect(details.some((d) => d.includes("HR < 133"))).toBe(true);
    expect(details.some((d) => d.includes("HR < 140"))).toBe(false);
  });

  it("ekspor ke jam: catatan Acuan HR", () => {
    const w = generateRunWorkout({ duration: 45, difficulty: "easy", seed: 3, free: true }, custom);
    const r = exportRun(w, { easyPace: runTargets(custom).easy.pace });
    expect(r.ok && r.event.description).toMatch(/^Acuan HR: < 133\./);
  });

  it("tanpa pengaturan: angka lama", () => {
    const d = settings({});
    expect(runTargets(d).easy.hr).toBe("< 140");
    expect(runTargets(d).tempo.hr).toBe("160–170");
  });

  it("ambang lari berat & coach tidak berubah oleh zona (R8, RELEASE-1.0 §11 #1)", () => {
    expect(hardRunThreshold(168)).toEqual({ bpm: 151, personal: true, lthr: 168 });
    // Lari HR 152 di atas Z4 bawah zona kustom: tetap tidak berat tanpa ambang pribadi (155 bpm).
    expect(isHardRun({ id: "a", name: "Lari pagi", type: "Run", category: "run", avgHr: 152 })).toBe(false);
    for (const f of ["lib/coach.ts", "lib/thresholds.ts", "lib/readiness.ts", "lib/wellness-signals.ts"]) {
      expect(readFileSync(f, "utf-8"), f).not.toMatch(/hr-zones/);
    }
  });
});

describe("RPE ST efektif", () => {
  it("level dari Setting dipakai generator", () => {
    const p = settings({ strengthRpe: { easy: 4, moderate: 5, high: 6 } });
    for (const seed of SEEDS.slice(0, 5)) {
      const w = generateStrengthWorkout({ type: "fullBody", duration: 45, difficulty: "high", seed, free: true }, p);
      for (const it of w.items.filter((i) => i.phase === "main")) expect(it.rpe).toBe(6);
    }
  });

  it("RPE ≤ 7 tetap dijaga walau profil berisi nilai lebih tinggi", () => {
    const p = { ...settings({}), strengthRpe: { easy: 7, moderate: 8, high: 9 } };
    for (const difficulty of ["easy", "moderate", "high"] as const) {
      const w = generateStrengthWorkout({ type: "fullBody", duration: 45, difficulty, seed: 11, free: true }, p);
      for (const it of w.items) if (it.rpe !== undefined) expect(it.rpe).toBeLessThanOrEqual(MAX_STRENGTH_RPE);
    }
  });
});
