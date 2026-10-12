import { describe, expect, it } from "vitest";
import {
  MIN_HEIGHT,
  detectWork,
  doneSegments,
  labelsFit,
  layoutBars,
  planSegments,
  speedHeights,
  staggerDelays,
  summarizeDone,
  tierHeights,
} from "@/components/charts/skyline-scale";
import { formatPaceTag } from "@/components/ui/format";
import { generateRunWorkout } from "@/lib/generator";
import type { ActivityInterval } from "@/lib/intervals/types";

const iv = (sec: number, pace?: number, type?: string): ActivityInterval => ({
  label: "x",
  type,
  movingTimeSec: sec,
  avgPaceSecPerKm: pace,
});

describe("skala tinggi", () => {
  it("min-max bila selisih pace ≥ 60 dtk: tercepat = 1, terlambat = minimum", () => {
    const h = speedHeights([270, 480, 300]);
    expect(h[0]).toBeCloseTo(1);
    expect(h[1]).toBeCloseTo(MIN_HEIGHT);
    expect(h[2]).toBeGreaterThan(MIN_HEIGHT);
    expect(h[2]).toBeLessThan(1);
  });

  it("lari steady (selisih < 60 dtk): relatif dari nol, selisih kecil tidak didramatisir", () => {
    const h = speedHeights([480, 500, 510]);
    expect(h[0]).toBeCloseTo(1);
    expect(h[2]).toBeCloseTo(480 / 510);
    expect(Math.min(...h)).toBeGreaterThan(0.9);
  });

  it("pace kosong & tier rendah tetap punya tinggi minimum", () => {
    expect(speedHeights([undefined, undefined])).toEqual([MIN_HEIGHT, MIN_HEIGHT]);
    expect(speedHeights([300, undefined])[1]).toBe(MIN_HEIGHT);
    expect(tierHeights([1, 2, 4, 0])).toEqual([0.25, 0.5, 1, MIN_HEIGHT]);
  });
});

describe("deteksi segmen kerja", () => {
  it("memakai type WORK dari intervals.icu bila ada", () => {
    expect(detectWork([{ type: "WARMUP", paceSecPerKm: 300 }, { type: "WORK", paceSecPerKm: 500 }, { type: "RECOVERY" }])).toEqual([false, true, false]);
  });

  it("semua WORK (lap otomatis) tidak informatif; lari steady tidak punya segmen kerja", () => {
    expect(detectWork([{ type: "WORK", paceSecPerKm: 480 }, { type: "WORK", paceSecPerKm: 470 }, { type: "WORK", paceSecPerKm: 490 }])).toEqual([false, false, false]);
    expect(detectWork([{ type: "WORK", paceSecPerKm: 480 }, { type: "WORK", paceSecPerKm: 300 }, { type: "WORK", paceSecPerKm: 490 }])).toEqual([false, true, false]);
  });

  it("tanpa tipe WORK: lebih cepat dari median sesi", () => {
    expect(detectWork([{ paceSecPerKm: 480 }, { paceSecPerKm: 270 }, { paceSecPerKm: 490 }, { paceSecPerKm: 280 }, { paceSecPerKm: 485 }])).toEqual([
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it("segmen < 10 dtk dibuang; kerja oranye, sisanya track", () => {
    const segs = doneSegments([iv(600, 505), iv(60, 385), iv(60, 531), iv(7, 600), iv(60, 392), iv(300, 555)]);
    expect(segs).toHaveLength(5);
    expect(segs.map((s) => s.tone)).toEqual(["track", "work", "track", "work", "track"]);
  });
});

describe("tata letak & label", () => {
  it("lebar ∝ durasi dan total tidak melebihi lebar", () => {
    const { bars, gap } = layoutBars([60, 120, 60], 300);
    expect(bars[1].w / bars[0].w).toBeCloseTo(2);
    expect(bars[2].x + bars[2].w).toBeLessThanOrEqual(300 + 1e-6);
    expect(gap).toBeGreaterThan(0);
  });

  it("banyak segmen (15/15): jarak mengecil, bar tetap ≥ 1px", () => {
    const { bars, gap } = layoutBars(Array.from({ length: 130 }, () => 15), 300);
    expect(gap).toBeLessThan(1);
    expect(Math.min(...bars.map((b) => b.w))).toBeGreaterThanOrEqual(1);
  });

  it("label pace hanya bila jarak antar pusat ≥ lebar label + 6", () => {
    expect(labelsFit([20, 70, 120], 40)).toBe(true);
    expect(labelsFit([20, 60, 120], 40)).toBe(false);
  });

  it("stagger total ≤ 60ms (240 + 60 ≤ 300ms)", () => {
    expect(staggerDelays(3)).toEqual([0, 30, 60]);
    expect(Math.max(...staggerDelays(130))).toBe(60);
    expect(staggerDelays(1)).toEqual([0]);
  });
});

describe("rencana & ringkasan", () => {
  it("rencana High 45: interval merah tier 4, jalan/jog track, total = durasi", () => {
    const segs = planSegments(generateRunWorkout({ duration: 45, difficulty: "high", seed: 1 }));
    const total = segs.reduce((a, s) => a + s.durationSec, 0);
    expect(total).toBe(45 * 60);
    expect(segs.some((s) => s.tone === "danger" && s.tier === 4)).toBe(true);
    expect(segs.every((s) => s.tone !== "work")).toBe(true);
  });

  it("struktur interval & rep tercepat", () => {
    const segs = doneSegments([iv(600, 505), iv(60, 385), iv(60, 531), iv(60, 392), iv(60, 540), iv(60, 395), iv(300, 555)]);
    const s = summarizeDone(segs);
    expect(s.structure).toBe("WU 10' · 3× 1' / 1' · CD 5'");
    expect(s.bestPace).toBe(385);
    expect(formatPaceTag(s.bestPace)).toBe(`6'25"`);
  });

  it("format pace tag", () => {
    expect(formatPaceTag(350)).toBe(`5'50"`);
    expect(formatPaceTag(undefined)).toBe("·");
  });
});
