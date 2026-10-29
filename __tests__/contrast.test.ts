import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Kontras non-teks (WCAG 1.4.11, 0.16): garis input/tombol sekunder, track, dan warna data ≥ 3:1 di kedua tema.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf-8").split("\r\n").join("\n");
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return start < 0 ? "" : css.slice(start, css.indexOf("\n}", start));
};
const light = block(':root[data-theme="light"]');
const dark = block(':root[data-theme="dark"]');
const token = (b: string, name: string) => b.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("kontras non-teks ≥ 3:1", () => {
  for (const [theme, b] of [
    ["terang", light],
    ["gelap", dark],
  ] as const) {
    it(`tema ${theme}: line-strong & track di bg, surface, subtle; warna data di surface`, () => {
      const surfaces = ["bg", "surface", "subtle"].map((n) => token(b, n)!);
      expect(surfaces.every(Boolean)).toBe(true);
      for (const fg of ["line-strong", "track"]) for (const s of surfaces) expect(ratio(token(b, fg)!, s), `${fg} di ${s}`).toBeGreaterThanOrEqual(3);
      for (const fg of ["brand", "success", "warning", "danger"]) expect(ratio(token(b, fg)!, token(b, "surface")!), fg).toBeGreaterThanOrEqual(3);
    });
  }
});
