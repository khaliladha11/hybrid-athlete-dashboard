/**
 * Ekspor kartu mingguan ke PNG transparan: "Minggu ini · lari" (1.1.0) dan "Minggu ini · latihan" (1.3.0). Murni:
 * ukuran, opsi, nama file, dan string SVG dari layout yang sama dengan kartu di Profil (`cardElements`,
 * `trainingCardElements`). Gambar di canvas ada di `lib/share-export.ts`.
 *
 * Privasi: gambar hanya berisi waktu, km, jumlah sesi, dan tanggal minggu itu. Tanpa nama orang, tanpa alamat deploy.
 */
import { CARD_BLOCK, CARD_W, STORY_H, cardElements, type CardElement, type CardFont, type CardLang, type CardRole, type WeekRunModel } from "./week-run-card";
import { TRAINING_BLOCK, trainingCardElements } from "./weekly/training-card";
import type { TrainingWeek } from "./weekly/training-week";

export type ExportFormat = "story" | "feed";
export type InkOption = "light" | "dark";
/** Jenis kartu (1.3.0): semua latihan (bawaan) atau lari saja (kartu 1.1.0). */
export type CardKind = "training" | "run";

export const EXPORT_SIZES: Record<ExportFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1350 },
};

/** Oranye tetap #FC4C02 di kedua pilihan tinta. */
export const BRAND_HEX = "#FC4C02";

/**
 * "Teks terang" untuk foto gelap (bawaan), "Teks gelap" untuk foto terang. Bayangan lembut menjaga keterbacaan.
 * `ride` = biru data sepeda (token `--info` tema gelap / terang), dipilih supaya kontras dengan foto di bawahnya.
 */
export const INKS: Record<InkOption, { ink: string; shadow: string; shadowOpacity: number; ride: string }> = {
  light: { ink: "#F5F4F1", shadow: "#000000", shadowOpacity: 0.35, ride: "#5AA2FF" },
  dark: { ink: "#141414", shadow: "#FFFFFF", shadowOpacity: 0.45, ride: "#0060D0" },
};

export interface ShareOptions {
  /** 1.3.0; nilai tersimpan lama tanpa `kind` = `training`. */
  kind: CardKind;
  format: ExportFormat;
  ink: InkOption;
  /** Bahasa teks kartu. Sejak 1.2.0 bawaan mengikuti bahasa app; pilihan di sheet menimpa. */
  lang: CardLang;
  watermark: boolean;
}

export const DEFAULT_SHARE: ShareOptions = { kind: "training", format: "story", ink: "light", lang: "en", watermark: true };

/** Baca opsi tersimpan; nilai tidak dikenal diganti bawaan. */
/** `fallbackLang`: bahasa kartu bila belum pernah dipilih di sheet (1.2: mengikuti bahasa app). */
export function parseShareOptions(raw: string | null, fallbackLang: ShareOptions["lang"] = "en"): ShareOptions {
  let v: Partial<ShareOptions> = {};
  try {
    v = raw ? (JSON.parse(raw) as Partial<ShareOptions>) : {};
  } catch {}
  return {
    kind: v.kind === "run" ? "run" : "training",
    format: v.format === "feed" ? "feed" : "story",
    ink: v.ink === "dark" ? "dark" : "light",
    lang: v.lang === "id" || v.lang === "en" ? v.lang : fallbackLang,
    watermark: typeof v.watermark === "boolean" ? v.watermark : DEFAULT_SHARE.watermark,
  };
}

/** Nama file dari tanggal Minggu minggu itu: hybrid-athlete-minggu-2026-11-15.png (lari), hybrid-athlete-latihan-… (semua). */
export const shareFileName = (weekEnd: string, kind: CardKind = "run") => `hybrid-athlete-${kind === "run" ? "minggu" : "latihan"}-${weekEnd}.png`;

/** Blok konten story digeser supaya tetap di tengah untuk feed 1080×1350 (ukuran dan margin sama). */
export const offsetY = (format: ExportFormat) => (EXPORT_SIZES[format].h - STORY_H) / 2;

/** Kartu latihan (1.3.0): bloknya lebih tinggi, jadi feed memusatkan blok itu sendiri; story tidak digeser. */
export const trainingOffsetY = (format: ExportFormat) =>
  format === "story" ? 0 : Math.round(EXPORT_SIZES.feed.h / 2 - (TRAINING_BLOCK.y + TRAINING_BLOCK.h / 2));

/** Blok konten untuk viewBox kartu di layar, per jenis. */
export const BLOCKS = { run: CARD_BLOCK, training: TRAINING_BLOCK } as const;

/** Nama keluarga font yang disematkan (`embeddedFontCss`), dengan cadangan sistem. */
export const EXPORT_FONT: Record<CardFont, string> = {
  display: "'HA Archivo', Arial, sans-serif",
  sans: "'HA Archivo', Arial, sans-serif",
  mono: "'HA Geist Mono', ui-monospace, Menlo, monospace",
};

const OPACITY: Record<CardRole, number> = { ink: 1, brand: 1, ride: 1, dim: 0.5, faint: 0.3, rule: 0.28 };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fontStyle(font: CardFont): string {
  const base = `font-family:${EXPORT_FONT[font]}`;
  if (font === "display") return `${base};font-style:italic;font-stretch:75%;font-variation-settings:'wdth' 75;font-variant-numeric:tabular-nums`;
  // Span di dalam angka miring (mis. "KM") tidak boleh mewarisi italic/condensed.
  const upright = "font-style:normal;font-stretch:100%;font-variation-settings:normal";
  if (font === "sans") return `${base};${upright};font-variant-numeric:tabular-nums`;
  return `${base};${upright}`;
}

type Ink = (typeof INKS)[InkOption];

const colorOf = (role: CardRole, ink: Ink) => (role === "brand" ? BRAND_HEX : role === "ride" ? ink.ride : ink.ink);

/** Atribut `fill` (+ `fill-opacity` untuk peran redup). */
function paint(role: CardRole, ink: Ink): string {
  const c = colorOf(role, ink);
  return OPACITY[role] === 1 ? `fill="${c}"` : `fill="${c}" fill-opacity="${OPACITY[role]}"`;
}

const r2 = (v: number) => +v.toFixed(2);

/** Pola arsir indoor (1.3.0): garis diagonal 45°, terang di atas warna olahraga, atau warna tinta (strength). */
export function hatchDefs(ink: Ink): string {
  const p = (id: string, fill: string, opacity: number, w: number) =>
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="18" height="18" patternTransform="rotate(45)"><rect width="${w}" height="18" fill="${fill}" fill-opacity="${opacity}"/></pattern>`;
  return p("hatch-light", "#FFFFFF", 0.5, 7) + p("hatch-ink", ink.ink, 0.7, 5);
}

function element(e: CardElement, ink: Ink): string {
  switch (e.kind) {
    case "rect": {
      if (e.outline) {
        // Garis tepi di dalam kotak (inset 2) supaya ukuran luar sama dengan segmen lain.
        const g = `x="${r2(e.x + 2)}" y="${r2(e.y + 2)}" width="${r2(e.w - 4)}" height="${r2(e.h - 4)}" rx="${e.rx - 2}"`;
        const hatch = e.hatch ? `<rect ${g} fill="url(#hatch-${e.hatch})"/>` : "";
        return `${hatch}<rect ${g} fill="none" stroke="${colorOf(e.role, ink)}" stroke-width="4"/>`;
      }
      const g = `x="${r2(e.x)}" y="${r2(e.y)}" width="${r2(e.w)}" height="${r2(e.h)}" rx="${e.rx}"`;
      return `<rect ${g} ${paint(e.role, ink)}/>` + (e.hatch ? `<rect ${g} fill="url(#hatch-${e.hatch})"/>` : "");
    }
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
      return `<text x="${e.x}" y="${r2(e.y)}" font-size="${e.size}" font-weight="${e.weight}" text-anchor="${e.anchor ?? "start"}"${spacing} ${paint(e.role, ink)} style="${fontStyle(e.font)}">${spans}</text>`;
    }
  }
}

function svgDocument(elements: CardElement[], opts: ShareOptions, dy: number, fontCss: string): string {
  const { w, h } = EXPORT_SIZES[opts.format];
  const ink = INKS[opts.ink];
  const body = elements.map((e) => element(e, ink)).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (fontCss ? `<style>${fontCss}</style>` : "") +
    `<defs>${hatchDefs(ink)}<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
    `<feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${ink.shadow}" flood-opacity="${ink.shadowOpacity}"/></filter></defs>` +
    `<g filter="url(#shadow)" transform="translate(${(w - CARD_W) / 2} ${dy})">${body}</g>` +
    `</svg>`
  );
}

/** SVG lengkap berlatar transparan (tanpa rect latar). `fontCss` = @font-face data URL; kosong = font cadangan. */
export function cardSvg(model: WeekRunModel, opts: ShareOptions, fontCss = ""): string {
  return svgDocument(cardElements(model, opts.lang, { watermark: opts.watermark }), opts, offsetY(opts.format), fontCss);
}

/** Kartu "Minggu ini · latihan" (1.3.0) sebagai SVG transparan. */
export function trainingCardSvg(week: TrainingWeek, opts: ShareOptions, fontCss = ""): string {
  return svgDocument(trainingCardElements(week, opts.lang, { watermark: opts.watermark }), opts, trainingOffsetY(opts.format), fontCss);
}
