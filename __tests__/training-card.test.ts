import { describe, expect, it } from "vitest";
import { normalizeActivity } from "@/lib/intervals/normalize";
import type { Activity } from "@/lib/intervals/types";
import { EXPORT_SIZES, INKS, parseShareOptions, shareFileName, trainingCardSvg, trainingOffsetY } from "@/lib/share-card";
import type { StSession } from "@/lib/st-session";
import {
  SEG_MIN,
  SUMMARY_BOTTOM,
  TRAINING_BLOCK,
  T_BAR_BASE,
  T_BAR_MAX,
  columnText,
  durationWords,
  segmentStyle,
  stackHeights,
  trainingAriaLabel,
  trainingCardElements,
  trainingCardText,
  trainingFooter,
  trainingTableRows,
} from "@/lib/weekly/training-card";
import { summaryColumns, trainingWeek } from "@/lib/weekly/training-week";

// Data fiktif. Minggu Senin 2 Maret sampai Minggu 8 Maret 2026.
const TODAY = "2026-03-05";
let n = 0;
const act = (type: string, date: string, min: number, over: Partial<Activity> = {}): Activity => ({
  ...normalizeActivity({ id: `a${++n}`, type, start_date_local: `${date}T06:00:00`, moving_time: min * 60 })!,
  ...over,
});
const ses = (date: string, durationMin: number): StSession => ({
  id: `s-${date}-${durationMin}`,
  date,
  startedAt: `${date}T12:00:00.000Z`,
  type: "lower",
  title: "Lower",
  difficulty: "moderate",
  durationMin,
  rpe: 6,
  setsDone: 12,
  setsPlanned: 12,
  movements: [],
  updatedAt: `${date}T13:00:00.000Z`,
});

/** Seperti acuan: lari 3×, sepeda outdoor + trainer, strength 3×. */
const reference = () =>
  trainingWeek(
    [
      act("Run", "2026-03-03", 40, { distanceKm: 6.2 }),
      act("VirtualRide", "2026-03-04", 45),
      act("Run", "2026-03-05", 38, { distanceKm: 4.4 }),
      act("Run", "2026-03-07", 64, { distanceKm: 4 }),
      act("Ride", "2026-03-07", 41, { distanceKm: 18.4 }),
    ],
    [ses("2026-03-02", 45), ses("2026-03-03", 34), ses("2026-03-07", 45)],
    TODAY,
  );

describe("teks kartu", () => {
  it("acuan dalam bahasa Inggris", () => {
    const t = trainingCardText(reference(), "en");
    expect(t.label).toEqual(["THIS WEEK", "TRAINING"]);
    expect([t.total, t.unit]).toEqual(["5:52", "HRS"]);
    expect(t.columns).toEqual([
      { sport: "run", label: "RUN", value: "14.6", unit: "KM", sub: "3x · 2:22" },
      { sport: "ride", label: "RIDE", value: "18.4", unit: "KM", sub: "+ 45' INDOOR" },
      { sport: "strength", label: "STRENGTH", value: "2:04", unit: "H", sub: "3x · INDOOR" },
    ]);
    expect(t.letters).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(t.footer).toEqual(["8 SESSIONS", "MAR 2 TO 8"]);
  });

  it("acuan dalam bahasa Indonesia", () => {
    const t = trainingCardText(reference(), "id");
    expect(t.label).toEqual(["MINGGU INI", "LATIHAN"]);
    expect(t.unit).toBe("JAM");
    expect(t.columns.map((c) => `${c.label} ${c.value} ${c.unit} ${c.sub}`)).toEqual(["LARI 14.6 KM 3x · 2:22", "SEPEDA 18.4 KM + 45' INDOOR", "STRENGTH 2:04 J 3x · INDOOR"]);
    expect(t.letters).toEqual(["S", "S", "R", "K", "J", "S", "M"]);
    expect(trainingFooter(reference(), "id")).toBe("8 SESI · 2 SAMPAI 8 MAR");
  });

  it("tunggal dan jamak", () => {
    const one = trainingWeek([act("Run", "2026-03-03", 30, { distanceKm: 5 })], [], TODAY);
    expect(trainingCardText(one, "en").footer[0]).toBe("1 SESSION");
    expect(trainingCardText(one, "id").footer[0]).toBe("1 SESI");
    expect(durationWords(60, "en")).toBe("1 hour");
    expect(durationWords(61, "en")).toBe("1 hour 1 minute");
    expect(durationWords(0, "id")).toBe("0 menit");
    expect(durationWords(352, "id")).toBe("5 jam 52 menit");
  });

  it("sub-baris: sepeda hanya trainer, campuran, tambahan indoor ≥ 1 jam", () => {
    const col = (acts: Activity[], lang: "en" | "id" = "en") => columnText(summaryColumns(trainingWeek(acts, [], TODAY))[0], lang);
    expect(col([act("VirtualRide", "2026-03-03", 45)])).toMatchObject({ value: "0:45", unit: "H", sub: "1x · INDOOR" });
    expect(col([act("Ride", "2026-03-03", 60, { distanceKm: 20 }), act("Ride", "2026-03-04", 70, { indoor: true })])).toMatchObject({ value: "20.0", sub: "+ 1:10 INDOOR" });
    // Treadmill dengan jarak: km dihitung, tanpa tambahan.
    expect(col([act("Run", "2026-03-03", 30, { distanceKm: 5, indoor: true })])).toMatchObject({ value: "5.0", sub: "1x · 0:30" });
    expect(col([act("Yoga", "2026-03-03", 50)], "id")).toMatchObject({ label: "LAINNYA", value: "0:50", unit: "J", sub: "1x" });
    expect(col([act("Walk", "2026-03-03", 50, { distanceKm: 4 })])).toMatchObject({ label: "OTHER", value: "4.0", unit: "KM" });
  });

  it("4 olahraga: kolom ketiga OTHER gabungan", () => {
    const w = trainingWeek([act("Run", "2026-03-03", 30, { distanceKm: 5 }), act("Ride", "2026-03-03", 30, { distanceKm: 10 }), act("Yoga", "2026-03-04", 20)], [ses("2026-03-04", 40)], TODAY);
    const cols = trainingCardText(w, "en").columns;
    expect(cols.map((c) => c.label)).toEqual(["RUN", "RIDE", "OTHER"]);
    expect(cols[2]).toMatchObject({ value: "1:00", unit: "H", sub: "2x" });
  });

  it("minggu kosong", () => {
    const w = trainingWeek([], [], TODAY);
    const t = trainingCardText(w, "en");
    expect([t.total, t.columns, t.footer[0]]).toEqual(["0:00", [], "0 SESSIONS"]);
    const els = trainingCardElements(w, "en");
    expect(els.filter((e) => e.kind === "circle")).toHaveLength(7);
    expect(els.some((e) => e.key.startsWith("seg-"))).toBe(false);
  });
});

describe("kalimat aksesibel", () => {
  it("indoor ditulis dengan kata, angka sesuai bahasa", () => {
    expect(trainingAriaLabel(reference(), "id")).toBe(
      "Minggu ini 5 jam 52 menit, 8 sesi: lari 14,6 km, sepeda 18,4 km (45 menit indoor), strength 2 jam 4 menit (indoor). 2 sampai 8 mar.",
    );
    expect(trainingAriaLabel(reference(), "en")).toBe(
      "This week 5 hours 52 minutes, 8 sessions: run 14.6 km, ride 18.4 km (45 minutes indoor), strength 2 hours 4 minutes (indoor). mar 2 to 8.",
    );
    expect(trainingAriaLabel(trainingWeek([], [], TODAY), "en")).toBe("No training yet this week. mar 2 to 8.");
  });
});

describe("tabel per hari", () => {
  it("satu baris per segmen, indoor tertulis, hari kosong satu baris", () => {
    const rows = trainingTableRows(reference(), "id");
    expect(rows.filter((r) => r[0] === "Sabtu")).toEqual([
      ["Sabtu", "Lari", "64", "Outdoor"],
      ["Sabtu", "Sepeda", "41", "Outdoor"],
      ["Sabtu", "Strength", "45", "Indoor"],
    ]);
    expect(rows.find((r) => r[0] === "Rabu")).toEqual(["Rabu", "Sepeda", "45", "Indoor"]);
    expect(rows.find((r) => r[0] === "Jumat")).toEqual(["Jumat", "Tidak ada latihan", "·", "·"]);
    expect(trainingTableRows(reference(), "en")[0]).toEqual(["Monday", "Strength", "45", "Indoor"]);
  });
});

describe("layout", () => {
  it("segmen: urutan tumpukan, celah, warna dan arsir", () => {
    const els = trainingCardElements(reference(), "en");
    const sat = els.filter((e) => e.key.startsWith("seg-5-"));
    expect(sat.map((e) => e.kind === "rect" && [e.role, e.hatch ?? "", e.outline ?? false])).toEqual([
      ["brand", "", false],
      ["ride", "", false],
      ["ink", "ink", true],
    ]);
    const wed = els.find((e) => e.key === "seg-2-0");
    expect(wed).toMatchObject({ role: "ride", hatch: "light" });
    expect(segmentStyle({ sport: "run", indoor: true })).toEqual({ role: "brand", hatch: "light" });
    expect(segmentStyle({ sport: "other", indoor: false })).toEqual({ role: "dim" });
  });

  it("hari terpanjang setinggi maksimum; label menit di atas bar tertinggi", () => {
    const els = trainingCardElements(reference(), "en");
    const segs = els.filter((e) => e.kind === "rect" && e.key.startsWith("seg-5-"));
    const top = Math.min(...segs.map((e) => (e.kind === "rect" ? e.y : 0)));
    expect(T_BAR_BASE - top).toBeCloseTo(T_BAR_MAX);
    expect(els.find((e) => e.key === "value-5")).toMatchObject({ spans: [{ text: "150'" }] });
  });

  it("hari 3 jam: label tidak menabrak kolom ringkasan; sesi pendek tetap terlihat", () => {
    const w = trainingWeek([act("Run", "2026-03-07", 180, { distanceKm: 30 }), act("Run", "2026-03-03", 3, { distanceKm: 0.5 }), act("Yoga", "2026-03-07", 2)], [], TODAY);
    const heights = stackHeights(w.days);
    expect(Math.min(...heights.flat())).toBeGreaterThanOrEqual(SEG_MIN - 0.01);
    expect(heights[5].reduce((a, b) => a + b, 0) + 8).toBeLessThanOrEqual(T_BAR_MAX + 0.01);
    const label = trainingCardElements(w, "en").find((e) => e.key === "value-5");
    expect(label?.kind === "text" && label.y - 40).toBeGreaterThan(SUMMARY_BOTTOM);
  });
});

describe("ekspor", () => {
  it("opsi lama tanpa jenis kartu = semua latihan; nama file per jenis", () => {
    expect(parseShareOptions(JSON.stringify({ format: "feed" })).kind).toBe("training");
    expect(parseShareOptions(JSON.stringify({ kind: "run" })).kind).toBe("run");
    expect(shareFileName("2026-03-08", "training")).toBe("hybrid-athlete-latihan-2026-03-08.png");
    expect(shareFileName("2026-03-08", "run")).toBe("hybrid-athlete-minggu-2026-03-08.png");
  });

  it("SVG: transparan, pola arsir, biru sepeda per tinta, story dan feed", () => {
    for (const ink of ["light", "dark"] as const)
      for (const format of ["story", "feed"] as const) {
        const svg = trainingCardSvg(reference(), { kind: "training", format, ink, lang: "en", watermark: true });
        const { w, h } = EXPORT_SIZES[format];
        expect(svg).toContain(`width="${w}" height="${h}"`);
        expect(svg).toContain('<pattern id="hatch-light"');
        expect(svg).toContain('fill="url(#hatch-ink)"');
        expect(svg).toContain(`fill="${INKS[ink].ride}"`);
        expect(svg).toContain("THIS WEEK");
        expect(svg).not.toMatch(/<rect x="0" y="0" width="1080"/);
      }
  });

  it("feed: blok kartu tetap di dalam 1080×1350", () => {
    const dy = trainingOffsetY("feed");
    expect(TRAINING_BLOCK.y + dy).toBeGreaterThanOrEqual(0);
    expect(TRAINING_BLOCK.y + TRAINING_BLOCK.h + dy).toBeLessThanOrEqual(1350);
    expect(trainingOffsetY("story")).toBe(0);
  });
});
