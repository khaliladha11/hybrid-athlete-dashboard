/**
 * Ekspor kartu "Minggu ini · lari" ke PNG transparan (1.1.0). Murni: ukuran, opsi, nama file, dan string SVG dari
 * layout yang sama dengan kartu di Profil (`cardElements`). Gambar di canvas ada di `lib/share-export.ts`.
 *
 * Privasi: gambar hanya berisi km, jumlah lari, dan tanggal minggu itu. Tanpa nama orang, tanpa alamat deploy.
 */
import { CARD_W, STORY_H, cardElements, type CardElement, type CardFont, type CardLang, type CardRole, type WeekRunModel } from "./week-run-card";

export type ExportFormat = "story" | "feed";
export type InkOption = "light" | "dark";

export const EXPORT_SIZES: Record<ExportFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1350 },
};

/** Oranye tetap #FC4C02 di kedua pilihan tinta. */
export const BRAND_HEX = "#FC4C02";

/** "Teks terang" untuk foto gelap (bawaan), "Teks gelap" untuk foto terang. Bayangan lembut menjaga keterbacaan. */
export const INKS: Record<InkOption, { ink: string; shadow: string; shadowOpacity: number }> = {
  light: { ink: "#F5F4F1", shadow: "#000000", shadowOpacity: 0.35 },
  dark: { ink: "#141414", shadow: "#FFFFFF", shadowOpacity: 0.45 },
};

export interface ShareOptions {
  format: ExportFormat;
  ink: InkOption;
  /** Bahasa teks kartu. 1.1.0: bawaan EN; rencana 1.2.0: mengikuti bahasa app. */
  lang: CardLang;
  watermark: boolean;
}

export const DEFAULT_SHARE: ShareOptions = { format: "story", ink: "light", lang: "en", watermark: true };

/** Baca opsi tersimpan; nilai tidak dikenal diganti bawaan. */
/** `fallbackLang`: bahasa kartu bila belum pernah dipilih di sheet (1.2: mengikuti bahasa app). */
export function parseShareOptions(raw: string | null, fallbackLang: ShareOptions["lang"] = "en"): ShareOptions {
  let v: Partial<ShareOptions> = {};
  try {
    v = raw ? (JSON.parse(raw) as Partial<ShareOptions>) : {};
  } catch {}
  return {
    format: v.format === "feed" ? "feed" : "story",
    ink: v.ink === "dark" ? "dark" : "light",
    lang: v.lang === "id" || v.lang === "en" ? v.lang : fallbackLang,
    watermark: typeof v.watermark === "boolean" ? v.watermark : DEFAULT_SHARE.watermark,
  };
}

/** Nama file dari tanggal Minggu minggu itu: hybrid-athlete-minggu-2026-11-15.png. */
export const shareFileName = (weekEnd: string) => `hybrid-athlete-minggu-${weekEnd}.png`;

/** Blok konten story digeser supaya tetap di tengah untuk feed 1080×1350 (ukuran dan margin sama). */
export const offsetY = (format: ExportFormat) => (EXPORT_SIZES[format].h - STORY_H) / 2;

/** Nama keluarga font yang disematkan (`embeddedFontCss`), dengan cadangan sistem. */
export const EXPORT_FONT: Record<CardFont, string> = {
  display: "'HA Archivo', Arial, sans-serif",
  sans: "'HA Archivo', Arial, sans-serif",
  mono: "'HA Geist Mono', ui-monospace, Menlo, monospace",
};

const OPACITY: Record<CardRole, number> = { ink: 1, brand: 1, dim: 0.5, faint: 0.3, rule: 0.28 };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fontStyle(font: CardFont): string {
  const base = `font-family:${EXPORT_FONT[font]}`;
  if (font === "display") return `${base};font-style:italic;font-stretch:75%;font-variation-settings:'wdth' 75;font-variant-numeric:tabular-nums`;
  // Span di dalam angka miring (mis. "KM") tidak boleh mewarisi italic/condensed.
  const upright = "font-style:normal;font-stretch:100%;font-variation-settings:normal";
  if (font === "sans") return `${base};${upright};font-variant-numeric:tabular-nums`;
  return `${base};${upright}`;
}

/** Atribut `fill` (+ `fill-opacity` untuk peran redup). */
function paint(role: CardRole, ink: string): string {
  const color = role === "brand" ? BRAND_HEX : ink;
  return OPACITY[role] === 1 ? `fill="${color}"` : `fill="${color}" fill-opacity="${OPACITY[role]}"`;
}

function element(e: CardElement, ink: string): string {
  switch (e.kind) {
    case "rect":
      return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.rx}" ${paint(e.role, ink)}/>`;
    case "circle":
      return `<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" ${paint(e.role, ink)}/>`;
    case "line":
      return `<rect x="${e.x1}" y="${e.y - e.width / 2}" width="${e.x2 - e.x1}" height="${e.width}" ${paint(e.role, ink)}/>`;
    case "text": {
      const spacing = e.spacing ? ` letter-spacing="${+(e.spacing * e.size).toFixed(2)}"` : "";
      const spans = e.spans
        .map((s) => {
          const attrs = [
            s.dx ? `dx="${s.dx}"` : "",
            s.role ? paint(s.role, ink) : "",
            s.size ? `font-size="${s.size}"` : "",
            s.weight ? `font-weight="${s.weight}"` : "",
            s.font ? `style="${fontStyle(s.font)}"` : "",
          ].filter(Boolean);
          return `<tspan${attrs.length ? ` ${attrs.join(" ")}` : ""}>${esc(s.text)}</tspan>`;
        })
        .join("");
      return `<text x="${e.x}" y="${e.y}" font-size="${e.size}" font-weight="${e.weight}" text-anchor="${e.anchor ?? "start"}"${spacing} ${paint(e.role, ink)} style="${fontStyle(e.font)}">${spans}</text>`;
    }
  }
}

/** SVG lengkap berlatar transparan (tanpa rect latar). `fontCss` = @font-face data URL; kosong = font cadangan. */
export function cardSvg(model: WeekRunModel, opts: ShareOptions, fontCss = ""): string {
  const { w, h } = EXPORT_SIZES[opts.format];
  const ink = INKS[opts.ink];
  const body = cardElements(model, opts.lang, { watermark: opts.watermark })
    .map((e) => element(e, ink.ink))
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (fontCss ? `<style>${fontCss}</style>` : "") +
    `<defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
    `<feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${ink.shadow}" flood-opacity="${ink.shadowOpacity}"/></filter></defs>` +
    `<g filter="url(#shadow)" transform="translate(${(w - CARD_W) / 2} ${offsetY(opts.format)})">${body}</g>` +
    `</svg>`
  );
}
