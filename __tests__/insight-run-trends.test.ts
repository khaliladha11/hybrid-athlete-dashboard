import { describe, expect, it } from "vitest";
import { HARD_RUN_HR, isHardRun } from "@/lib/coach";
import { cadenceTarget } from "@/lib/generator/run";
import { cadenceGoal, cutbackStarts, deloadStarts, easySummary, runWeeks, volumeSummary } from "@/lib/insight/run-trends";
import { weekBuckets } from "@/lib/insight/weeks";
import type { Activity } from "@/lib/intervals/types";

const TODAY = "2026-01-08"; // Kamis, minggu 2026-01-05
let seq = 0;
function run(date: string, km: number, o: Partial<Activity> = {}): Activity {
  return {
    id: `t${++seq}`,
    name: "Easy Run",
    type: "Run",
    category: "run",
    date,
    startLocal: `${date}T06:00:00`,
    distanceKm: km,
    movingTimeSec: km * 400,
    avgHr: 140,
    cadenceSpm: 170,
    ...o,
  };
}

describe("runWeeks", () => {
  it("km per minggu, easy/berat sama dengan isHardRun", () => {
    const acts = [run("2026-01-05", 6), run("2026-01-06", 8, { name: "Tempo 2×10'", avgHr: 160 }), run("2026-01-07", 5, { avgHr: HARD_RUN_HR })];
    const rows = runWeeks(acts, TODAY, 6);
    expect(rows).toHaveLength(6);
    const cur = rows.at(-1)!;
    expect(cur.current).toBe(true);
    expect(cur.km).toBe(19);
    const hardKm = acts.filter(isHardRun).reduce((t, a) => t + a.distanceKm!, 0);
    expect(cur.hardKm).toBe(hardKm);
    expect(cur.easyKm).toBe(19 - hardKm);
  });

  it("mengabaikan non-lari, salinan kosong, dan tanggal setelah hari ini", () => {
    const empty = { ...run("2026-01-05", 0), distanceKm: undefined, movingTimeSec: undefined, avgHr: undefined };
    const rows = runWeeks([run("2026-01-05", 5), empty, run("2026-01-09", 7), { ...run("2026-01-06", 3), category: "walk" }], TODAY, 6);
    expect(rows.at(-1)!.km).toBe(5);
    expect(rows.at(-1)!.runs).toBe(1);
  });

  it("kenaikan > 30% sama dengan aturan coach, basis < 5 km tidak ditandai, termasuk minggu pertama", () => {
    const acts = [
      run("2025-11-24", 10), // minggu pembanding sebelum rentang 6 minggu
      run("2025-12-01", 13.5), // +35%
      run("2025-12-08", 14), // +3,7%
      run("2025-12-15", 4),
      run("2025-12-22", 9), // basis 4 km → tidak dihitung
    ];
    const rows = runWeeks(acts, TODAY, 6);
    expect(rows[0].start).toBe("2025-12-01");
    expect(rows[0].change).toBe(0.35);
    expect(rows[0].jump).toBe(true);
    expect(rows[1].jump).toBe(false);
    expect(rows[3].change).toBeUndefined();
    expect(rows[3].jump).toBe(false);
  });

  it("median pace/HR/cadence easy hanya dari lari yang punya nilai; long run & berat tidak dihitung", () => {
    const acts = [
      run("2026-01-05", 5, { movingTimeSec: 5 * 390, avgHr: 138, cadenceSpm: undefined }),
      run("2026-01-06", 5, { movingTimeSec: 5 * 410, avgHr: undefined, cadenceSpm: 168 }),
      run("2026-01-07", 5, { movingTimeSec: 5 * 420, avgHr: 142, cadenceSpm: 172 }),
      run("2026-01-04", 14, { movingTimeSec: 14 * 300, avgHr: 150 }), // long run (minggu lalu)
      run("2026-01-08", 6, { name: "Interval 6×400", avgHr: 170 }),
    ];
    const rows = runWeeks(acts, TODAY, 2);
    const e = rows[1].easy;
    expect(e.runs).toBe(3);
    expect(e.paceSec).toBe(410);
    expect(e.hr).toBe(140);
    expect(e.hrRuns).toBe(2);
    expect(e.cadence).toBe(170);
    expect(e.cadenceRuns).toBe(2);
    expect(rows[0].easy.runs).toBe(0);
    expect(rows[0].easy.paceSec).toBeUndefined();
  });

  it("minggu cutback dan deload ditandai dari parameter", () => {
    const rows = runWeeks([], TODAY, 6, { cutback: ["2025-12-15"], deload: ["2025-12-29"] });
    expect(rows.find((r) => r.start === "2025-12-15")!.cutback).toBe(true);
    expect(rows.find((r) => r.start === "2025-12-29")!.deload).toBe(true);
    expect(rows.filter((r) => r.cutback || r.deload)).toHaveLength(2);
  });
});

describe("cutbackStarts / deloadStarts", () => {
  it("cutback dari minggu program", () => {
    expect(cutbackStarts({ weeks: [{ start: "2025-12-01", cutback: false }, { start: "2025-12-08", cutback: true }] as never })).toEqual(["2025-12-08"]);
    expect(cutbackStarts(null)).toEqual([]);
  });
  it("deload = minggu terakhir blok, hanya bila blok aktif", () => {
    const b = weekBuckets(TODAY, 6);
    expect(deloadStarts(b, "2025-12-01", 4)).toEqual(["2025-12-22"]);
    expect(deloadStarts(b, undefined)).toEqual([]);
  });
});

describe("ringkasan", () => {
  it("volume: rata-rata minggu selesai dan persen berat, tanpa minggu berjalan", () => {
    const acts = [run("2025-12-29", 20), run("2025-12-30", 5, { name: "Tempo" }), run("2025-12-22", 25), run("2026-01-06", 30)];
    const s = volumeSummary(runWeeks(acts, TODAY, 2));
    expect(s.drawable).toBe(true);
    expect(s.text).toBe("Rata-rata 25,0 km per minggu, 20% berat.");
  });
  it("volume: kosong dan kurang dari 2 minggu", () => {
    expect(volumeSummary(runWeeks([], TODAY, 6))).toEqual({ drawable: false, text: "Belum ada lari tercatat dalam 6 minggu terakhir." });
    expect(volumeSummary(runWeeks([run("2026-01-05", 5)], TODAY, 6)).text).toContain("butuh 2 minggu");
  });
  it("volume: menyebut minggu yang naik > 30%", () => {
    expect(volumeSummary(runWeeks([run("2025-12-22", 10), run("2025-12-29", 15), run("2026-01-06", 5)], TODAY, 3)).text).toContain("1 minggu naik lebih dari 30%.");
  });

  it("easy: HR tidak dikirim jam → kalimat, bukan grafik", () => {
    const rows = runWeeks([run("2025-12-30", 5, { avgHr: undefined }), run("2026-01-06", 5, { avgHr: undefined })], TODAY, 6);
    expect(easySummary(rows, "hr")).toEqual({ drawable: false, text: "Jam tidak mengirim HR untuk easy run di rentang ini." });
    expect(easySummary(rows, "pace").drawable).toBe(true);
    expect(easySummary(runWeeks([], TODAY, 6), "pace").text).toBe("Belum ada easy run dalam rentang ini.");
  });

  it("easy: pace lebih cepat, HR turun, cadence dengan target", () => {
    const rows = runWeeks(
      [run("2025-12-29", 5, { movingTimeSec: 5 * 405, avgHr: 145, cadenceSpm: 166 }), run("2026-01-06", 5, { movingTimeSec: 5 * 392, avgHr: 139, cadenceSpm: 170 })],
      TODAY,
      2,
    );
    expect(easySummary(rows, "pace").text).toBe(`Median pace easy 6'32"/km, 13 detik/km lebih cepat dibanding 6'45"/km di awal rentang.`);
    expect(easySummary(rows, "hr").text).toBe("Median HR easy dari 145 menjadi 139 bpm.");
    expect(easySummary(rows, "cadence", 176).text).toBe("Median cadence easy terakhir 170 SPM, target 176 SPM.");
  });

  it("target cadence sama dengan aturan cadence generator", () => {
    expect(cadenceGoal([run("2026-01-06", 5, { cadenceSpm: 160 })], TODAY)).toBe(cadenceTarget(160).target);
    expect(cadenceGoal([], TODAY)).toBe(180);
  });

  it("tanpa em/en dash di kalimat", () => {
    const rows = runWeeks([run("2025-12-29", 5), run("2026-01-06", 5)], TODAY, 2);
    for (const t of [volumeSummary(rows).text, easySummary(rows, "pace").text, easySummary(rows, "hr").text]) expect(t).not.toMatch(/[—–]/);
  });
});
