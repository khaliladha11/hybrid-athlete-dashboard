#!/usr/bin/env node
/**
 * Post media sosial (1.0.0-rc.2), selalu Demo Mode. `npm run media:posts`.
 *
 * 1. Tangkap screenshot Demo Mode (viewport HP 390×720, tema gelap, 3×) ke marketing/out/shots/.
 * 2. Tulis @font-face app (Archivo + Geist Mono dari build) ke marketing/out/fonts.css.
 * 3. Render tiap post di marketing/posts/index.html#<id> ke marketing/out/posts/<id>.png.
 *
 * Tidak butuh ffmpeg. Opsi: --build (paksa next build), --only=<id,id> (render sebagian).
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { appFontCss, BASE, launchBrowser, MARKETING, OUT, scrollToEl, seed, startDemoServer } from "./lib.mjs";

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const SHOTS = join(OUT, "shots");
const POSTS = join(OUT, "posts");

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

async function captureShots(browser) {
  mkdirSync(SHOTS, { recursive: true });
  for (const [name, go] of Object.entries(SCREENS)) {
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

async function main() {
  mkdirSync(POSTS, { recursive: true });
  const stop = await startDemoServer({ build: args.includes("--build") });
  const browser = await launchBrowser();
  try {
    const fonts = await appFontCss(browser);
    const family = (s) => s.split(",")[0].trim();
    writeFileSync(join(OUT, "fonts.css"), `${fonts.faces}\n:root{--font-archivo:${family(fonts.sans)};--font-geist-mono:${family(fonts.mono)}}\n`);
    await captureShots(browser);

    // Baca daftar post dari posts.js lewat halaman template itu sendiri.
    const url = pathToFileURL(join(MARKETING, "posts", "index.html")).href;
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(url);
    const posts = await page.evaluate(() => Object.fromEntries(Object.entries(window.POSTS).map(([k, v]) => [k, v.size])));
    for (const [id, [w, h]] of Object.entries(posts)) {
      if (only && !only.includes(id)) continue;
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${url}#${id}`);
      await page.reload();
      await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]));
      const out = join(POSTS, `${id}.png`);
      await page.locator(`section[id="${id}"]`).screenshot({ path: out });
      console.log(`✓ ${out}  ${(statSync(out).size / 1024).toFixed(0)} KB`);
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
