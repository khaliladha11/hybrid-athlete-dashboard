import { describe, expect, it } from "vitest";
import { MAX_LABELS, areaPath, bandLayout, extent, linePath, linearScale, niceTicks, thinLabels } from "@/components/charts/chart-scale";

describe("extent", () => {
  it("abaikan nilai kosong, null bila semua kosong", () => {
    expect(extent([3, undefined, 7, 5])).toEqual([3, 7]);
    expect(extent([undefined, undefined])).toBeNull();
    expect(extent([])).toBeNull();
  });
});

describe("niceTicks", () => {
  it("domain rapi memuat data, tick ≤ batas", () => {
    const { domain, ticks } = niceTicks(23.4, 41.8);
    expect(domain[0]).toBeLessThanOrEqual(23.4);
    expect(domain[1]).toBeGreaterThanOrEqual(41.8);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks[0]).toBe(domain[0]);
    expect(ticks.at(-1)).toBe(domain[1]);
  });

  it("langkah 1/2/2,5/5 × 10ⁿ tanpa sisa floating point", () => {
    expect(niceTicks(0, 1).ticks).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(0, 37, { zero: true }).ticks).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(-12, 7).ticks).toEqual([-20, -10, 0, 10]);
  });

  it("tick tidak pernah lebih dari 6 label untuk 375px", () => {
    for (const [a, b] of [[0, 3], [1.2, 98.7], [-3, 3], [150, 420], [0.1, 0.13], [5, 7]]) {
      expect(niceTicks(a, b, { maxTicks: MAX_LABELS }).ticks.length).toBeLessThanOrEqual(MAX_LABELS);
    }
  });

  it("satu titik / nilai sama diberi jarak", () => {
    const { domain } = niceTicks(42, 42);
    expect(domain[0]).toBeLessThan(42);
    expect(domain[1]).toBeGreaterThan(42);
    expect(niceTicks(0, 0, { zero: true }).domain).toEqual([0, 1]);
  });

  it("zero memaksa domain dari 0", () => {
    expect(niceTicks(12, 30, { zero: true }).domain[0]).toBe(0);
  });
});

describe("linearScale", () => {
  it("memetakan domain ke rentang, termasuk terbalik untuk sumbu y", () => {
    const y = linearScale([0, 40], [100, 0]);
    expect(y(0)).toBe(100);
    expect(y(40)).toBe(0);
    expect(y(10)).toBe(75);
  });
  it("domain nol lebar → tengah", () => {
    expect(linearScale([5, 5], [0, 10])(5)).toBe(5);
  });
});

describe("thinLabels", () => {
  it("≤ 6 label, terakhir selalu ada", () => {
    expect(thinLabels(4)).toEqual([0, 1, 2, 3]);
    const twelve = thinLabels(12);
    expect(twelve.length).toBeLessThanOrEqual(6);
    expect(twelve.at(-1)).toBe(11);
    const days = thinLabels(84);
    expect(days.length).toBeLessThanOrEqual(6);
    expect(days.at(-1)).toBe(83);
    expect(thinLabels(0)).toEqual([]);
  });
});

describe("bandLayout", () => {
  it("batang sama lebar di dalam lebar grafik", () => {
    const bars = bandLayout(12, 300);
    expect(bars).toHaveLength(12);
    expect(bars[0].x).toBeGreaterThanOrEqual(0);
    expect(bars[11].x + bars[11].w).toBeLessThanOrEqual(300);
    expect(new Set(bars.map((b) => b.w.toFixed(3))).size).toBe(1);
    expect(bandLayout(1, 100)).toEqual([{ x: 0, w: 100 }]);
    expect(bandLayout(0, 100)).toEqual([]);
  });
});

describe("linePath / areaPath", () => {
  it("garis diputus di nilai kosong, titik tunggal tidak digambar", () => {
    const p = linePath([{ x: 0, y: 10 }, { x: 10, y: 20 }, null, { x: 30, y: 5 }, null, { x: 50, y: 1 }, { x: 60, y: 2 }]);
    expect(p).toBe("M0 10 L10 20 M50 1 L60 2");
    expect(linePath([null, { x: 1, y: 1 }])).toBe("");
  });
  it("area ditutup ke garis dasar per potongan", () => {
    expect(areaPath([{ x: 0, y: 10 }, { x: 10, y: 20 }], 50)).toBe("M0 10 L10 20 L10 50 L0 50 Z");
    expect(areaPath([{ x: 0, y: 10 }, null, { x: 5, y: 5 }], 50)).toBe("");
  });
});
