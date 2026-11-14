import { describe, expect, it } from "vitest";
import { BRAND_HEX, DEFAULT_SHARE, EXPORT_SIZES, INKS, cardSvg, offsetY, parseShareOptions, shareFileName } from "@/lib/share-card";
import { weekRunModel } from "@/lib/week-run-card";

// Data fiktif.
const model = weekRunModel(
  [
    { category: "run", date: "2026-11-10", distanceKm: 3.5 },
    { category: "run", date: "2026-11-12", distanceKm: 3.9 },
    { category: "run", date: "2026-11-14", distanceKm: 7.28 },
  ],
  "2026-11-14",
);

describe("ukuran & opsi ekspor", () => {
  it("story 1080×1920, feed 1080×1350", () => {
    expect(EXPORT_SIZES.story).toEqual({ w: 1080, h: 1920 });
    expect(EXPORT_SIZES.feed).toEqual({ w: 1080, h: 1350 });
  });
  it("feed: blok yang sama digeser ke tengah", () => {
    expect(offsetY("story")).toBe(0);
    expect(offsetY("feed")).toBe(-285);
  });
  it("bawaan: story, teks terang, EN, watermark; nilai tidak dikenal kembali ke bawaan", () => {
    expect(DEFAULT_SHARE).toEqual({ format: "story", ink: "light", lang: "en", watermark: true });
    expect(parseShareOptions(null)).toEqual(DEFAULT_SHARE);
    expect(parseShareOptions("{rusak")).toEqual(DEFAULT_SHARE);
    expect(parseShareOptions(JSON.stringify({ format: "feed", ink: "dark", lang: "id", watermark: false }))).toEqual({ format: "feed", ink: "dark", lang: "id", watermark: false });
    expect(parseShareOptions(JSON.stringify({ format: "square", ink: "neon", lang: "fr" }))).toEqual(DEFAULT_SHARE);
  });
  it("nama file dari tanggal Minggu", () => {
    expect(shareFileName(model.to)).toBe("hybrid-athlete-minggu-2026-11-15.png");
  });
});

describe("cardSvg", () => {
  it("ukuran sesuai format, tanpa latar", () => {
    const story = cardSvg(model, DEFAULT_SHARE);
    expect(story).toContain('width="1080" height="1920" viewBox="0 0 1080 1920"');
    const feed = cardSvg(model, { ...DEFAULT_SHARE, format: "feed" });
    expect(feed).toContain('width="1080" height="1350"');
    expect(feed).toContain("translate(0 -285)");
    expect(story).not.toMatch(/<rect[^>]*width="1080"/);
    expect(story).not.toMatch(/background/);
  });
  it("tinta terang/gelap, oranye tetap #FC4C02", () => {
    const light = cardSvg(model, DEFAULT_SHARE);
    const dark = cardSvg(model, { ...DEFAULT_SHARE, ink: "dark" });
    expect(light).toContain(`fill="${INKS.light.ink}"`);
    expect(dark).toContain(`fill="${INKS.dark.ink}"`);
    expect(dark).not.toContain(INKS.light.ink);
    for (const s of [light, dark]) expect(s).toContain(`fill="${BRAND_HEX}"`);
    expect(light).toContain('flood-color="#000000"');
  });
  it("teks EN/ID dan total 2 desimal", () => {
    const en = cardSvg(model, DEFAULT_SHARE);
    for (const t of [">THIS WEEK<", ">14.68<", ">3 RUNS<", ">NOV 9 TO 15<", ">M<"]) expect(en).toContain(t);
    const id = cardSvg(model, { ...DEFAULT_SHARE, lang: "id" });
    for (const t of [">MINGGU INI<", ">3 LARI<", ">9 SAMPAI 15 NOV<", ">R<"]) expect(id).toContain(t);
  });
  it("watermark opsional; tanpa nama orang atau alamat", () => {
    expect(cardSvg(model, DEFAULT_SHARE)).toContain("HYBRID ATHLETE");
    const plain = cardSvg(model, { ...DEFAULT_SHARE, watermark: false });
    expect(plain).not.toContain("HYBRID ATHLETE");
    expect(plain).not.toMatch(/https?:\/\/(?!www\.w3\.org)|vercel|\.app\b/i);
  });
  it("font tersemat disisipkan bila ada", () => {
    expect(cardSvg(model, DEFAULT_SHARE, "@font-face{font-family:'HA Archivo'}")).toContain("<style>@font-face{font-family:'HA Archivo'}</style>");
    expect(cardSvg(model, DEFAULT_SHARE)).not.toContain("<style>");
  });
});
