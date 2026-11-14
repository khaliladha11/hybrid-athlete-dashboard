import { describe, expect, it } from "vitest";
import { BAR_MAX, BAR_MIN, BASELINE, barHeights, cardAriaLabel, cardElements, cardText, columnX, dayLetters, dayValue, footerText, rangeText, totalValue, weekRunModel } from "@/lib/week-run-card";

// Data fiktif (bukan aktivitas asli).
const run = (date: string, distanceKm?: number) => ({ category: "run" as const, date, distanceKm });

describe("weekRunModel · minggu kalender WIB, mulai Senin", () => {
  it("Sabtu 14 Nov 2026 → Senin 9 sampai Minggu 15", () => {
    const m = weekRunModel([], "2026-11-14");
    expect(m.from).toBe("2026-11-09");
    expect(m.to).toBe("2026-11-15");
    expect(m.days.map((d) => d.date)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  });
  it("hari Minggu masih minggu yang sama; Senin memulai minggu baru", () => {
    expect(weekRunModel([], "2026-11-15").from).toBe("2026-11-09");
    expect(weekRunModel([], "2026-11-16").from).toBe("2026-11-16");
  });
  it("hanya lari di minggu itu; dua lari sehari dijumlah; hari kosong tanpa km", () => {
    const m = weekRunModel(
      [run("2026-11-08", 9), run("2026-11-10", 3.5), run("2026-11-12", 2), run("2026-11-12", 1.9), run("2026-11-14", 7.2), { category: "strength", date: "2026-11-13" }, run("2026-11-16", 5)],
      "2026-11-14",
    );
    expect(m.runs).toBe(4);
    expect(m.days.map((d) => d.km)).toEqual([undefined, 3.5, undefined, 3.9, undefined, 7.2, undefined]);
    expect(totalValue(m.totalKm)).toBe("14.60");
  });
  it("Sabtu berada di bawah huruf ke-6", () => {
    const m = weekRunModel([run("2026-11-14", 7.2)], "2026-11-14");
    expect(m.days.findIndex((d) => d.km !== undefined)).toBe(5);
    expect(dayLetters("en")[5]).toBe("S");
    expect(dayLetters("id")[5]).toBe("S");
  });
  it("lari tanpa jarak tetap dihitung sebagai lari (0 km)", () => {
    const m = weekRunModel([run("2026-11-11")], "2026-11-14");
    expect(m.runs).toBe(1);
    expect(m.days[2].km).toBe(0);
  });
});

describe("pembulatan", () => {
  it("total mentah 2 desimal, per hari 1 desimal; selisih kecil dibiarkan", () => {
    const m = weekRunModel([run("2026-11-09", 3.33), run("2026-11-10", 3.33), run("2026-11-11", 3.34)], "2026-11-14");
    expect(totalValue(m.totalKm)).toBe("10.00");
    const days = m.days.filter((d) => d.km !== undefined).map((d) => dayValue(d.km!));
    expect(days).toEqual(["3.3", "3.3", "3.3"]);
  });
});

describe("teks per bahasa", () => {
  it("huruf hari mulai Senin", () => {
    expect(dayLetters("en")).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(dayLetters("id")).toEqual(["S", "S", "R", "K", "J", "S", "M"]);
  });
  it("rentang tanggal, termasuk lintas bulan", () => {
    expect(rangeText("2026-11-09", "2026-11-15", "en")).toBe("NOV 9 TO 15");
    expect(rangeText("2026-11-09", "2026-11-15", "id")).toBe("9 SAMPAI 15 NOV");
    expect(rangeText("2026-10-26", "2026-11-01", "en")).toBe("OCT 26 TO NOV 1");
    expect(rangeText("2026-10-26", "2026-11-01", "id")).toBe("26 OKT SAMPAI 1 NOV");
    expect(rangeText("2026-08-03", "2026-08-09", "id")).toBe("3 SAMPAI 9 AGU");
  });
  it("footer tunggal/jamak dan 0 lari", () => {
    const at = (n: number) => weekRunModel(Array.from({ length: n }, (_, i) => run(`2026-11-${String(9 + (i % 7)).padStart(2, "0")}`, 5)), "2026-11-14");
    expect(footerText(at(0), "en")).toBe("0 RUNS · NOV 9 TO 15");
    expect(footerText(at(1), "en")).toBe("1 RUN · NOV 9 TO 15");
    expect(footerText(at(5), "en")).toBe("5 RUNS · NOV 9 TO 15");
    expect(footerText(at(3), "id")).toBe("3 LARI · 9 SAMPAI 15 NOV");
    expect(footerText(at(1), "id")).toBe("1 LARI · 9 SAMPAI 15 NOV");
  });
  it("label kartu dan total kosong", () => {
    const m = weekRunModel([], "2026-11-14");
    expect(cardText(m, "en").label).toEqual(["THIS WEEK", "RUNNING"]);
    expect(cardText(m, "id").label).toEqual(["MINGGU INI", "LARI"]);
    expect(cardText(m, "id").total).toBe("0.00");
  });
  it("tanpa em dash/en dash di teks kartu", () => {
    const m = weekRunModel([run("2026-10-30", 4)], "2026-11-01");
    for (const lang of ["en", "id"] as const) expect(footerText(m, lang)).not.toMatch(/[—–]/);
    expect(cardAriaLabel(m)).not.toMatch(/[—–]/);
  });
});

describe("tinggi bar", () => {
  it("proporsional ke hari terbesar (maks 300)", () => {
    expect(barHeights([{ date: "a", km: 7.2 }, { date: "b", km: 3.6 }, { date: "c" }])).toEqual([BAR_MAX, BAR_MAX / 2, undefined]);
  });
  it("minimum 32 supaya sudut tetap bulat", () => {
    expect(barHeights([{ date: "a", km: 20 }, { date: "b", km: 0.5 }])[1]).toBe(BAR_MIN);
  });
  it("0 lari: semua titik; 1 lari: bar penuh", () => {
    expect(barHeights(weekRunModel([], "2026-11-14").days).every((x) => x === undefined)).toBe(true);
    const one = barHeights(weekRunModel([run("2026-11-12", 4)], "2026-11-14").days);
    expect(one.filter((x) => x !== undefined)).toEqual([BAR_MAX]);
  });
  it("lari 0 km tetap bar minimum", () => {
    expect(barHeights([{ date: "a", km: 0 }])).toEqual([BAR_MIN]);
  });
});

describe("layout", () => {
  const m = weekRunModel([run("2026-11-10", 3.5), run("2026-11-12", 3.9), run("2026-11-14", 7.2)], "2026-11-14");
  const els = cardElements(m, "en");
  it("7 kolom rata antara x 120 dan 960, bar 74 px, dasar sejajar", () => {
    expect(columnX(0)).toBe(180);
    expect(columnX(6)).toBe(900);
    const bars = els.filter((e) => e.kind === "rect" && e.key.startsWith("bar"));
    expect(bars).toHaveLength(3);
    for (const b of bars) if (b.kind === "rect") expect([b.w, b.rx, b.y + b.h]).toEqual([74, 16, BASELINE]);
  });
  it("hari kosong = titik tanpa angka", () => {
    expect(els.filter((e) => e.kind === "circle")).toHaveLength(4);
    expect(els.filter((e) => e.key.startsWith("value"))).toHaveLength(3);
  });
  it("blok konten di antara y 560 dan 1480; watermark hanya bila diminta", () => {
    const ys = els.map((e) => (e.kind === "circle" ? e.cy : e.y));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(560);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1480);
    expect(els.some((e) => e.key === "watermark")).toBe(false);
    expect(cardElements(m, "en", { watermark: true }).some((e) => e.key === "watermark")).toBe(true);
  });
});
