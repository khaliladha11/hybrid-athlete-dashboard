#!/usr/bin/env node
/**
 * Post media sosial (1.0.0-rc.2), selalu Demo Mode. `npm run media:posts`.
 *
 * 1. Tangkap screenshot Demo Mode (viewport HP 390×720, tema gelap, 3×) ke marketing/out/shots/.
 * 2. Tulis @font-face app (Archivo + Geist Mono dari build) ke marketing/out/fonts.css.
 * 3. Render tiap post di marketing/posts/index.html#<id> ke marketing/out/posts/<id>.png.
 *
 * `--og` (`npm run media:og`, 1.0.x): social preview GitHub dari marketing/og/index.html#<varian> ke
 * marketing/out/og/: social-preview-<varian>.png/.jpg, -check.png (640×320), dan social-preview.png/.jpg
 * untuk varian yang direkomendasikan. Kontras teks (≥ 4.5:1) dan safe area (64 px) diperiksa.
 *
 * Tidak butuh ffmpeg. Opsi: --build (paksa next build), --only=<id,id> (render sebagian).
 */
import { copyFileSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { appFontCss, BASE, launchBrowser, MARKETING, OUT, scrollToEl, seed, startDemoServer } from "./lib.mjs";

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const SHOTS = join(OUT, "shots");
const OG = args.includes("--og");
const SET = OG
  ? { dir: "og", global: "OG", out: join(OUT, "og"), shots: ["otot"] }
  : { dir: "posts", global: "POSTS", out: join(OUT, "posts"), shots: null };
const SAFE = 64;

/** Gulir instan: atas elemen di `offset` px dari atas viewport. */
async function scrollTo(page, locator, offset = 70) {
  await scrollToEl(locator, { offset });
  await page.waitForTimeout(300);
}

/** Layar yang ditangkap: rute + langkah menuju keadaan yang ingin ditampilkan. */
const SCREENS = {
  async profil(page) {
    await page.goto(`${BASE}/`);
    await scrollTo(page, page.getByText(/Saran Gita/i), 24);
  },
  async lari(page) {
    await page.goto(`${BASE}/run`);
    await page.getByRole("radio", { name: /60/ }).or(page.getByRole("button", { name: /^60/ })).first().click();
    await page.getByRole("radio", { name: /Moderate/ }).or(page.getByRole("button", { name: /Moderate/ })).first().click();
    await page.waitForTimeout(400);
    await scrollTo(page, page.locator("main h1, main h2").filter({ hasText: /\S/ }).nth(1), 40);
  },
  async strength(page) {
    await page.goto(`${BASE}/strength`);
    await page.getByRole("button", { name: "Mulai sesi", exact: true }).click();
    await page.waitForURL(/\/strength\/sesi/);
    for (let i = 0; i < 8 && (await page.getByText(/^Pemanasan/i).first().isVisible().catch(() => false)); i++) {
      await page.getByRole("button", { name: /Berikutnya/ }).click();
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => scrollTo(0, 0));
  },
  async otot(page) {
    await SCREENS.strength(page);
    const muscles = page.locator("summary", { hasText: "Otot yang dilatih" });
    await muscles.click();
    await scrollTo(page, muscles, 24);
  },
  async program(page) {
    await page.goto(`${BASE}/program`);
    await page.getByRole("radio", { name: "HM" }).click();
    const grid = page.getByRole("grid", { name: "Pilih Hari H" });
    let cell = grid.locator("button.bg-success-soft:not([disabled])").first();
    for (let i = 0; i < 8 && !(await cell.count()); i++) {
      await page.getByRole("button", { name: "Bulan berikutnya" }).click();
      cell = grid.locator("button.bg-success-soft:not([disabled])").first();
    }
    if (!(await cell.count())) cell = grid.locator("button:not([disabled])").first();
    await cell.click();
    const ack = page.getByRole("checkbox");
    if (await ack.first().isVisible().catch(() => false)) await ack.first().check();
    await page.getByRole("button", { name: /^Buat program/ }).click();
    await page.waitForTimeout(400);
    await scrollTo(page, page.getByText(/^Hari lomba$/i), 72);
  },
  async insight(page) {
    await page.goto(`${BASE}/insight`);
    await scrollTo(page, page.getByRole("heading", { name: "Heatmap otot" }), 24);
  },
};

async function captureShots(browser, names) {
  mkdirSync(SHOTS, { recursive: true });
  for (const [name, go] of Object.entries(SCREENS)) {
    if (names && !names.includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 720 }, deviceScaleFactor: 3, colorScheme: "dark", locale: "id-ID", timezoneId: "Asia/Jakarta", isMobile: true, hasTouch: true });
    await seed(ctx);
    const page = await ctx.newPage();
    await go(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, `${name}.png`) });
    await ctx.close();
    console.log(`· shot ${name}`);
  }
}

/** Luminans relatif WCAG dari "rgb(r, g, b)". */
function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** Periksa teks social preview: kontras ≥ 4.5:1 terhadap latar terdekat, ukuran, dan safe area. */
async function auditOg(page, id) {
  const items = await page.evaluate((safe) => {
    const root = document.getElementById(location.hash.slice(1));
    const box = root.getBoundingClientRect();
    const bgOf = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && c !== "transparent" && !/,\s*0\)$/.test(c)) return c;
      }
      return "rgb(255, 255, 255)";
    };
    const inSafe = (r) => r.left - box.left >= safe && r.top - box.top >= safe && box.right - r.right >= safe && box.bottom - r.bottom >= safe;
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      const range = document.createRange();
      range.selectNodeContents(n);
      const st = getComputedStyle(el);
      out.push({ text: n.textContent.trim().slice(0, 40), color: st.color, bg: bgOf(el), size: parseFloat(st.fontSize), inSafe: inSafe(range.getBoundingClientRect()) });
    }
    out.push({ text: "(logo)", inSafe: inSafe(root.querySelector(".og-lockup").getBoundingClientRect()) });
    return out;
  }, SAFE);
  let ok = true;
  for (const t of items) {
    const ratio = t.color ? contrast(t.color, t.bg) : null;
    const bad = (ratio !== null && ratio < 4.5) || !t.inSafe;
    if (bad) ok = false;
    console.log(`  ${bad ? "✗" : "·"} ${t.text.padEnd(42)} ${t.size ? `${t.size}px` : ""} ${ratio ? `${ratio.toFixed(1)}:1` : ""}${t.inSafe ? "" : " di luar safe area"}`);
  }
  if (!ok) throw new Error(`social preview ${id}: kontras atau safe area tidak lolos`);
}

const kb = (p) => `${(statSync(p).size / 1024).toFixed(0)} KB`;

async function main() {
  mkdirSync(SET.out, { recursive: true });
  const stop = await startDemoServer({ build: args.includes("--build") });
  const browser = await launchBrowser();
  try {
    const fonts = await appFontCss(browser);
    const family = (s) => s.split(",")[0].trim();
    writeFileSync(join(OUT, "fonts.css"), `${fonts.faces}\n:root{--font-archivo:${family(fonts.sans)};--font-geist-mono:${family(fonts.mono)}}\n`);
    await captureShots(browser, SET.shots);

    // Baca daftar dari template itu sendiri (posts.js / og.js).
    const url = pathToFileURL(join(MARKETING, SET.dir, "index.html")).href;
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(url);
    const list = await page.evaluate((g) => Object.fromEntries(Object.entries(window[g]).map(([k, v]) => [k, v.size])), SET.global);
    const recommended = OG ? await page.evaluate(() => window.OG_RECOMMENDED) : null;
    for (const [id, [w, h]] of Object.entries(list)) {
      if (only && !only.includes(id)) continue;
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${url}#${id}`);
      await page.reload();
      await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]));
      const section = page.locator(`section[id="${id}"]`);
      if (!OG) {
        const out = join(SET.out, `${id}.png`);
        await section.screenshot({ path: out });
        console.log(`✓ ${out}  ${kb(out)}`);
        continue;
      }
      console.log(`· varian ${id}`);
      const png = join(SET.out, `social-preview-${id}.png`);
      const jpg = join(SET.out, `social-preview-${id}.jpg`);
      await section.screenshot({ path: png });
      // Audit setelah PNG tersimpan, supaya hasil yang gagal tetap bisa dilihat.
      await auditOg(page, id);
      await section.screenshot({ path: jpg, type: "jpeg", quality: 90 });
      // Cek keterbacaan: PNG diperkecil browser ke 640×320, seperti kartu tautan.
      const check = join(SET.out, `social-preview-${id}-check.png`);
      const small = await browser.newPage({ viewport: { width: 640, height: 320 }, deviceScaleFactor: 1 });
      // Halaman file:// supaya boleh memuat PNG lokal (about:blank dari setContent tidak boleh).
      const html = join(SET.out, "_check.html");
      writeFileSync(html, `<body style="margin:0"><img src="social-preview-${id}.png" style="width:640px;height:320px;display:block"></body>`);
      await small.goto(pathToFileURL(html).href);
      await small.screenshot({ path: check });
      await small.close();
      rmSync(html);
      console.log(`✓ ${png}  ${kb(png)}\n✓ ${jpg}  ${kb(jpg)}\n✓ ${check}  ${kb(check)}`);
      if (statSync(png).size > 1024 * 1024) console.warn(`  ! ${png} > 1 MB, pakai JPG`);
      if (id === recommended) {
        copyFileSync(png, join(SET.out, "social-preview.png"));
        copyFileSync(jpg, join(SET.out, "social-preview.jpg"));
        console.log(`✓ social-preview.png/.jpg = varian ${id} (rekomendasi)`);
      }
    }
  } finally {
    await browser.close();
    stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
