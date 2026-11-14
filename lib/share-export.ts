/**
 * Gambar SVG kartu mingguan ke PNG transparan di browser (1.1.0). Tanpa library.
 *
 * Font: SVG yang digambar ke canvas lewat <img> tidak bisa memakai font halaman, jadi file Archivo dan Geist Mono
 * (sudah di-self-host next/font, same-origin) dibaca dari @font-face halaman lalu disematkan sebagai data URL.
 * Hanya subset latin yang dipakai (angka, huruf besar, "·").
 */

let fontCache: Promise<string> | null = null;

const firstFamily = (v: string) => v.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "") ?? "";

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** CSS @font-face berkeluarga "HA Archivo" dan "HA Geist Mono" dengan file tersemat. Gagal = string kosong (font cadangan). */
export function embeddedFontCss(): Promise<string> {
  fontCache ??= (async () => {
    const root = getComputedStyle(document.documentElement);
    const alias = new Map([
      [firstFamily(root.getPropertyValue("--font-archivo")), "HA Archivo"],
      [firstFamily(root.getPropertyValue("--font-geist-mono")), "HA Geist Mono"],
    ]);
    const out: string[] = [];
    for (const sheet of [...document.styleSheets]) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const r of [...rules]) {
        if (!(r instanceof CSSFontFaceRule)) continue;
        const name = alias.get(firstFamily(r.style.getPropertyValue("font-family")));
        const range = r.style.getPropertyValue("unicode-range");
        if (!name || (range && !/U\+0+-0*FF\b/i.test(range))) continue;
        const src = /url\(["']?([^"')]+)["']?\)/.exec(r.style.getPropertyValue("src"))?.[1];
        if (!src) continue;
        const data = await toDataUrl(new URL(src, sheet.href ?? location.href).href);
        const style = r.style.getPropertyValue("font-style") || "normal";
        const weight = r.style.getPropertyValue("font-weight") || "100 900";
        const stretch = r.style.getPropertyValue("font-stretch");
        out.push(`@font-face{font-family:'${name}';font-style:${style};font-weight:${weight};${stretch ? `font-stretch:${stretch};` : ""}src:url(${data}) format('woff2');}`);
      }
    }
    return out.join("");
  })().catch(() => {
    fontCache = null;
    return "";
  });
  return fontCache;
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** SVG → PNG Blob dengan latar transparan. */
export async function renderPng(svg: string, w: number, h: number): Promise<Blob> {
  const img = new Image(w, h);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas tidak tersedia");
  // Safari kadang menggambar SVG sebelum font tersematnya siap: tunggu satu frame lalu gambar ulang.
  ctx.drawImage(img, 0, 0, w, h);
  await frame();
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG gagal dibuat"))), "image/png"));
}
