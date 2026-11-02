/**
 * Lapisan grafis video (1080×1920) sebagai HTML ber-token "Tag", dirender Playwright ke PNG transparan:
 * bingkai HP (layar berlubang transparan), caption per adegan, serta kartu pembuka dan penutup.
 * Font diambil dari build app (`appFontCss`), jadi sama persis dengan Archivo + Geist Mono di app.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

/** Token tema gelap dari `app/globals.css`. Oranye teks selalu brand-ink. */
export const T = {
  bg: "#0b0b0c",
  surface: "#161616",
  raised: "#1f1f20",
  line: "#2a2a2c",
  ink: "#f5f4f1",
  muted: "#a8a7a3",
  faint: "#8c8b88",
  brand: "#fc4c02",
  brandInk: "#ff6a2b",
};

export const W = 1080;
export const H = 1920;
/** Layar HP: viewport 390×720 CSS px, ditampilkan 2× di kanvas. */
export const VIEWPORT = { width: 390, height: 720 };
export const SCREEN = { x: 150, y: 420, w: 780, h: 1440, r: 52 };

const mark = () => readFileSync(join(ROOT, "docs/brand/mark-on-dark.svg"), "utf8");

/** `*kata*` → kata oranye (satu per caption). Tanpa em/en dash (CLAUDE.md). */
const emph = (s) => s.replace(/\*([^*]+)\*/g, `<em>$1</em>`);

function page(fonts, body, { bg = "transparent" } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts.faces}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;background:${bg};overflow:hidden}
body{font-family:${fonts.sans};color:${T.ink};-webkit-font-smoothing:antialiased}
.label{font-family:${fonts.mono};font-size:30px;line-height:1.2;letter-spacing:.12em;text-transform:uppercase;color:${T.faint}}
.display{font-style:italic;font-weight:800;font-variation-settings:"wdth" 75;font-stretch:75%;text-transform:uppercase;letter-spacing:-.01em;line-height:.95;padding-bottom:.08em}
.display em{font-style:italic;color:${T.brandInk}}
.dot{display:inline-block;width:18px;height:18px;border-radius:50%;background:${T.brand};margin-right:18px;vertical-align:middle}
</style></head><body>${body}</body></html>`;
}

/** Bingkai HP: semua di luar layar berwarna latar, layar transparan (video ditaruh di bawahnya). */
export function frameHtml(fonts) {
  const s = SCREEN;
  return page(
    fonts,
    `<div style="position:absolute;left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px;border-radius:${s.r}px;box-shadow:0 0 0 14px ${T.raised},0 0 0 16px ${T.line},0 0 0 2000px ${T.bg}"></div>`,
  );
}

/** Caption atas: label mono + display (maks. 2 baris). */
export function captionHtml(fonts, { label, text }) {
  return page(
    fonts,
    `<div style="position:absolute;left:96px;right:96px;top:92px">
      <p class="label"><span class="dot"></span>${label}</p>
      <h1 class="display" style="font-size:104px;margin-top:26px">${emph(text)}</h1>
    </div>`,
  );
}

/** Kartu penuh untuk pembuka/penutup (satu display per layar). */
export function cardHtml(fonts, { label, text, sub, foot }) {
  return page(
    fonts,
    `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 96px">
      <div style="width:150px;height:150px">${mark().replace("<svg", '<svg width="150" height="150"')}</div>
      <p class="label" style="margin-top:72px"><span class="dot"></span>${label}</p>
      <h1 class="display" style="font-size:150px;margin-top:30px">${emph(text)}</h1>
      ${sub ? `<p style="font-size:44px;line-height:1.3;color:${T.muted};margin-top:44px;max-width:820px">${sub}</p>` : ""}
    </div>
    ${foot ? `<p class="label" style="position:absolute;left:96px;right:96px;bottom:110px">${foot}</p>` : ""}`,
    { bg: T.bg },
  );
}

/** Render HTML ke PNG (transparan bila latar transparan). */
export async function renderPng(browser, html, path) {
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path, omitBackground: true });
  await p.close();
}
