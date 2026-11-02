#!/usr/bin/env node
/**
 * Video pratinjau app (1.0.0-rc.2), selalu Demo Mode. `npm run media:video`.
 *
 * 1. Playwright menjalankan app di viewport HP (390×720, tema gelap) dan merekam tiap adegan dengan waktu asli
 *    per frame. Bawaan `shots`: screenshot CDP berulang pada 2× (tajam). `--recorder=cdp`: screencast (lebih
 *    halus, lebih lembut). `--recorder=video`: `recordVideo` Playwright (cadangan, paling buram).
 * 2. Lapisan grafis (bingkai HP, caption, kartu pembuka/penutup) dirender dari HTML ber-token "Tag" ke PNG.
 * 3. ffmpeg menyusun: preview-vertical.mp4 (1080×1920, H.264, caption tertanam), preview-readme.webp (hero
 *    README, < 5 MB), dan poster.png.
 *
 * Butuh ffmpeg lengkap (libx264, libwebp): `winget install Gyan.FFmpeg`, atau set env `FFMPEG` ke path-nya.
 * Tanpa ffmpeg, frame dan lapisan tetap dibuat di marketing/out/video/work lalu skrip berhenti dengan pesan.
 *
 * Opsi: --build (paksa next build), --recorder=shots|cdp|video, --keep (simpan folder kerja).
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appFontCss, BASE, ffmpeg, findFfmpeg, launchBrowser, OUT, ROOT, scrollToEl, seed, startDemoServer } from "./lib.mjs";
import { captionHtml, cardHtml, frameHtml, H, renderPng, SCREEN, T, VIEWPORT, W } from "./stage.mjs";

const args = new Set(process.argv.slice(2));
const RECORDER = args.has("--recorder=video") ? "video" : args.has("--recorder=cdp") ? "cdp" : "shots";
const DIR = join(OUT, "video");
const WORK = join(DIR, "work");
const README_MEDIA = join(ROOT, "docs", "media");
const FPS = 30;
const XFADE = 0.3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Indikator ketukan oranye (hanya untuk rekaman), supaya penonton tahu apa yang ditekan. */
const TAP_SCRIPT = `
addEventListener("pointerdown", (e) => {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid ${T.brand};background:rgba(252,76,2,.25);left:" + e.clientX + "px;top:" + e.clientY + "px;transition:transform .45s cubic-bezier(.23,1,.32,1),opacity .45s;";
  document.documentElement.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = "scale(1.6)"; d.style.opacity = "0"; });
  setTimeout(() => d.remove(), 600);
}, true);`;

/** Gulir halus ke elemen (atas elemen di `offset` px dari atas layar). */
const scrollTo = (page, locator, { offset = 70, ms = 700 } = {}) => scrollToEl(locator, { offset, ms });

/** Ketuk elemen yang terlihat (gulir dulu bila perlu, tanpa lompatan mendadak). */
async function tap(page, locator) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  await el.click();
}

/**
 * Storyboard. `prepare` jalan sebelum rekaman (tidak terlihat), `play` direkam. `dur` = panjang adegan (detik),
 * caption `at` relatif terhadap awal adegan.
 */
const SCENES = [
  {
    id: "profil",
    path: "/",
    dur: 4.6,
    captions: [{ at: 0, label: "01 · Profil", text: "Saran harian dari *Gita*" }],
    async play(page) {
      await sleep(500);
      await scrollTo(page, page.getByText(/Saran Gita/i), { ms: 1100 });
      await sleep(1800);
      await scrollTo(page, page.getByText(/^Generate lari/), { offset: 420, ms: 700 });
    },
  },
  {
    id: "lari",
    path: "/run",
    dur: 6,
    captions: [
      { at: 0, label: "02 · Lari", text: "Lari dengan pace *zonamu*" },
      { at: 3.1, label: "02 · Lari", text: "Kirim ke *jam*, satu ketuk" },
    ],
    async play(page) {
      await sleep(400);
      await tap(page, page.getByRole("radio", { name: /60/ }).or(page.getByRole("button", { name: /^60/ })));
      await sleep(350);
      await tap(page, page.getByRole("radio", { name: /Moderate/ }).or(page.getByRole("button", { name: /Moderate/ })));
      await sleep(500);
      await scrollTo(page, page.locator("main h1, main h2").filter({ hasText: /\S/ }).nth(1), { ms: 900 });
      await sleep(900);
      const card = page.getByRole("region", { name: "Kirim ke jam" });
      await scrollTo(page, card, { offset: 200, ms: 800 });
      await sleep(250);
      await card.getByRole("button", { name: "Kirim ke jam" }).click();
      await sleep(1200);
    },
  },
  {
    id: "strength",
    path: "/strength",
    dur: 5.4,
    captions: [
      { at: 0, label: "03 · Strength", text: "Dari *alat* di rumahmu" },
      { at: 2.6, label: "03 · Strength", text: "Lihat *otot* yang dilatih" },
    ],
    async prepare(page) {
      await page.getByRole("button", { name: "Mulai sesi", exact: true }).click();
      await page.waitForURL(/\/strength\/sesi/);
      // Lewati pemanasan supaya yang tampil gerakan inti berbeban.
      for (let i = 0; i < 8 && (await page.getByText(/^Pemanasan/i).first().isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: /Berikutnya/ }).click();
        await sleep(150);
      }
      await page.evaluate(() => scrollTo(0, 0));
    },
    async play(page) {
      await sleep(700);
      const done = page.getByRole("button", { name: /^Selesai set/ });
      if (await done.isVisible().catch(() => false)) await done.click();
      await sleep(1300);
      const muscles = page.locator("summary", { hasText: "Otot yang dilatih" });
      await scrollTo(page, muscles, { offset: 300, ms: 500 });
      await muscles.click();
      await sleep(150);
      await scrollTo(page, muscles, { offset: 90, ms: 600 });
      await sleep(1300);
    },
  },
  {
    id: "program",
    path: "/program",
    dur: 4.6,
    captions: [{ at: 0, label: "04 · Program", text: "Menuju *Hari H*-mu" }],
    async play(page) {
      await sleep(300);
      await tap(page, page.getByRole("radio", { name: "HM" }));
      const grid = page.getByRole("grid", { name: "Pilih Hari H" });
      await scrollTo(page, grid, { offset: 140, ms: 600 });
      let cell = grid.locator("button.bg-success-soft:not([disabled])").first();
      for (let i = 0; i < 8 && !(await cell.count()); i++) {
        await page.getByRole("button", { name: "Bulan berikutnya" }).click();
        await sleep(150);
        cell = grid.locator("button.bg-success-soft:not([disabled])").first();
      }
      if (!(await cell.count())) cell = grid.locator("button:not([disabled])").first();
      await cell.click();
      await sleep(500);
      const ack = page.getByRole("checkbox");
      if (await ack.first().isVisible().catch(() => false)) await ack.first().check();
      await tap(page, page.getByRole("button", { name: /^Buat program/ }));
      await sleep(400);
      await scrollTo(page, page.getByText(/^Semua minggu$/), { offset: 70, ms: 900 });
      await sleep(600);
    },
  },
  {
    id: "insight",
    path: "/insight",
    dur: 4.2,
    captions: [{ at: 0, label: "05 · Insight", text: "Beban tiap *otot*, sekilas" }],
    async prepare(page) {
      await page.getByRole("heading", { name: "Heatmap otot" }).waitFor();
      const y = await page.getByRole("heading", { name: "Heatmap otot" }).evaluate((el) => el.getBoundingClientRect().top + scrollY);
      await page.evaluate((y) => scrollTo(0, y - 380), y);
    },
    async play(page) {
      await sleep(300);
      const heading = page.getByRole("heading", { name: "Heatmap otot" });
      await scrollTo(page, heading, { offset: 60, ms: 800 });
      await sleep(900);
      const card = page.locator("section", { has: heading });
      const thirty = card.getByRole("radio", { name: /30 hari/ });
      if (await thirty.count()) await thirty.first().click();
      await sleep(1400);
    },
  },
];

const INTRO = { label: "Hybrid Athlete", text: "Hari ini latihan *apa*?", sub: "Saran lari dan strength dari data jammu, dengan aturan cedera berbasis riset.", dur: 2.6 };
const OUTRO = { label: "Open source · MIT", text: "Gratis. Pasang *sendiri*.", sub: "Deploy ke Vercel dengan satu tombol. Data tetap di akunmu.", foot: "GitHub · hybrid-athlete-dashboard", dur: 2.8 };

async function newContext(browser, extra = {}) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    colorScheme: "dark",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    isMobile: true,
    hasTouch: true,
    ...extra,
  });
  await seed(ctx);
  await ctx.addInitScript(TAP_SCRIPT);
  return ctx;
}

/**
 * Rekam satu adegan jadi deretan JPEG + daftar concat ffmpeg (durasi asli tiap frame).
 * - `shots` (bawaan): `Page.captureScreenshot` berulang pada skala 2 (780×1440, pas dengan layar di kanvas),
 *   tajam, ±12–18 fps.
 * - `cdp`: screencast CDP, lebih halus (±30 fps) tetapi headless hanya mengirim frame seukuran CSS px (390×720),
 *   jadi lebih lembut setelah diperbesar.
 */
async function recordFrames(browser, scene, dir, mode) {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await page.goto(BASE + scene.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (scene.prepare) await scene.prepare(page);
  await sleep(600);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let stopLoop = false;
  let loop = Promise.resolve();
  const t0 = Date.now() / 1000;
  if (mode === "cdp") {
    cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
      frames.push({ data, t: metadata.timestamp });
      await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });
    // Paksa satu frame awal: screencast hanya mengirim frame saat ada perubahan.
    await page.evaluate(() => document.body.style.setProperty("--media-nudge", "1"));
  } else {
    loop = (async () => {
      while (!stopLoop) {
        const t = Date.now() / 1000;
        // Clip memakai koordinat dokumen: ikut posisi gulir supaya yang terekam = yang terlihat.
        const pos = await cdp.send("Runtime.evaluate", { expression: "[scrollX, scrollY]", returnByValue: true }).catch(() => null);
        const [x, y] = pos?.result?.value ?? [0, 0];
        const clip = { x, y, ...VIEWPORT, scale: SCREEN.w / VIEWPORT.width };
        const r = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90, optimizeForSpeed: true, clip }).catch(() => null);
        if (r) frames.push({ data: r.data, t });
      }
    })();
  }
  await scene.play(page);
  const left = scene.dur - (Date.now() / 1000 - t0);
  if (left > 0) await sleep(left * 1000);
  else console.warn(`  ! adegan ${scene.id} ${(-left).toFixed(1)} dtk lebih panjang dari ${scene.dur} dtk (dipotong)`);
  const tEnd = Date.now() / 1000;
  stopLoop = true;
  await loop;
  if (mode === "cdp") await cdp.send("Page.stopScreencast");
  await ctx.close();
  if (!frames.length) throw new Error(`adegan ${scene.id}: tidak ada frame`);

  mkdirSync(dir, { recursive: true });
  const start = frames[0].t;
  // Waktu screencast memakai jam browser; geser ke jam Node supaya akhir adegan tepat.
  const end = mode === "cdp" ? start + (tEnd - t0) : tEnd;
  let list = "";
  frames.forEach((f, i) => {
    const name = `${String(i).padStart(4, "0")}.jpg`;
    writeFileSync(join(dir, name), Buffer.from(f.data, "base64"));
    const next = i + 1 < frames.length ? frames[i + 1].t : end;
    list += `file '${name}'
duration ${Math.max(0.001, next - f.t).toFixed(4)}
`;
  });
  list += `file '${String(frames.length - 1).padStart(4, "0")}.jpg'
`;
  writeFileSync(join(dir, "frames.txt"), list);
  console.log(`  ${frames.length} frame (${(frames.length / (end - start)).toFixed(1)} fps)`);
  return { kind: "concat", path: join(dir, "frames.txt"), frames: frames.length };
}

/** Cadangan: recordVideo Playwright (WebM VP8 pada ukuran viewport). */
async function recordVideo(browser, scene, dir) {
  mkdirSync(dir, { recursive: true });
  const ctx = await newContext(browser, { deviceScaleFactor: 1, recordVideo: { dir, size: VIEWPORT } });
  const page = await ctx.newPage();
  const t0 = Date.now() / 1000;
  await page.goto(BASE + scene.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (scene.prepare) await scene.prepare(page);
  await sleep(600);
  const skip = Date.now() / 1000 - t0;
  await scene.play(page);
  const left = scene.dur - (Date.now() / 1000 - t0 - skip);
  if (left > 0) await sleep(left * 1000);
  await ctx.close();
  const file = readdirSync(dir).find((f) => f.endsWith(".webm"));
  return { kind: "video", path: join(dir, file), skip };
}

/** Satu adegan → MP4 1080×1920: latar, rekaman di posisi layar, bingkai, caption (fade-in 0,25 dtk). */
function composeScene(bin, scene, src, layers, out) {
  const s = SCREEN;
  const input = src.kind === "concat" ? ["-f", "concat", "-safe", "0", "-i", src.path] : ["-ss", src.skip.toFixed(2), "-i", src.path];
  const capInputs = scene.captions.flatMap((_, i) => ["-loop", "1", "-i", layers.captions[i]]);
  let f = `color=c=${T.bg}:s=${W}x${H}:r=${FPS}:d=${scene.dur}[bg];`;
  f += `[0:v]fps=${FPS},scale=${s.w}:${s.h}:flags=lanczos,setsar=1[app];`;
  f += `[bg][app]overlay=${s.x}:${s.y}:shortest=1[v0];`;
  f += `[v0][1:v]overlay=0:0[v1];`;
  let last = "v1";
  scene.captions.forEach((c, i) => {
    const until = scene.captions[i + 1]?.at ?? scene.dur;
    const st = c.at;
    f += `[${i + 2}:v]format=rgba,trim=duration=${scene.dur},fade=in:st=${st}:d=0.25:alpha=1[c${i}];`;
    f += `[${last}][c${i}]overlay=0:0:enable='between(t,${st},${until - 0.001})'[w${i}];`;
    last = `w${i}`;
  });
  f += `[${last}]scale=out_range=tv,format=yuv420p[out]`;
  ffmpeg(bin, [...input, "-loop", "1", "-i", layers.frame, ...capInputs, "-filter_complex", f, "-map", "[out]", "-t", String(scene.dur), "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", out]);
}

function composeCard(bin, png, dur, out) {
  ffmpeg(bin, ["-loop", "1", "-i", png, "-vf", `fps=${FPS},scale=out_range=tv,format=yuv420p`, "-t", String(dur), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-tune", "stillimage", out]);
}

/** Gabungkan segmen dengan crossfade, lalu encode akhir (faststart, tanpa audio). */
function joinSegments(bin, segs, out) {
  const inputs = segs.flatMap((s) => ["-i", s.path]);
  let f = "";
  let offset = 0;
  let last = "0:v";
  for (let i = 1; i < segs.length; i++) {
    offset += segs[i - 1].dur - XFADE;
    f += `[${last}][${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}[x${i}];`;
    last = `x${i}`;
  }
  f += `[${last}]scale=out_range=tv,format=yuv420p[out]`;
  ffmpeg(bin, [...inputs, "-filter_complex", f, "-map", "[out]", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-profile:v", "high", "-pix_fmt", "yuv420p", "-color_range", "tv", "-movflags", "+faststart", "-an", out]);
}

const size = (p) => `${(statSync(p).size / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  const ff = findFfmpeg();
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  const stop = await startDemoServer({ build: args.has("--build") });
  const browser = await launchBrowser();
  try {
    console.log("· lapisan grafis");
    const fonts = await appFontCss(browser);
    const frame = join(WORK, "frame.png");
    await renderPng(browser, frameHtml(fonts), frame);
    const intro = join(WORK, "intro.png");
    const outro = join(WORK, "outro.png");
    await renderPng(browser, cardHtml(fonts, INTRO), intro);
    await renderPng(browser, cardHtml(fonts, OUTRO), outro);
    const layers = {};
    for (const sc of SCENES) {
      layers[sc.id] = { frame, captions: [] };
      for (const [i, c] of sc.captions.entries()) {
        const p = join(WORK, `cap-${sc.id}-${i}.png`);
        await renderPng(browser, captionHtml(fonts, c), p);
        layers[sc.id].captions.push(p);
      }
    }

    const sources = {};
    for (const sc of SCENES) {
      console.log(`· rekam ${sc.id} (${RECORDER})`);
      const dir = join(WORK, sc.id);
      sources[sc.id] = RECORDER === "video" ? await recordVideo(browser, sc, dir) : await recordFrames(browser, sc, dir, RECORDER);
    }

    if (!ff) {
      console.error(
        "\n✗ ffmpeg lengkap (libx264) tidak ditemukan. Frame dan lapisan sudah ada di marketing/out/video/work.\n" +
          "  Pasang: winget install Gyan.FFmpeg  (lalu buka terminal baru), atau set env FFMPEG=<path ffmpeg.exe>.\n" +
          "  ffmpeg bawaan Playwright hanya bisa VP8/WebM tanpa overlay, jadi tidak cukup untuk MP4 Reels.",
      );
      process.exitCode = 2;
      return;
    }

    console.log(`· susun video (${ff.bin})`);
    const segs = [{ path: join(WORK, "00-intro.mp4"), dur: INTRO.dur }];
    composeCard(ff.bin, intro, INTRO.dur, segs[0].path);
    SCENES.forEach((sc, i) => {
      const p = join(WORK, `${String(i + 1).padStart(2, "0")}-${sc.id}.mp4`);
      composeScene(ff.bin, sc, sources[sc.id], layers[sc.id], p);
      segs.push({ path: p, dur: sc.dur });
    });
    const outroSeg = { path: join(WORK, "99-outro.mp4"), dur: OUTRO.dur };
    composeCard(ff.bin, outro, OUTRO.dur, outroSeg.path);
    segs.push(outroSeg);

    mkdirSync(README_MEDIA, { recursive: true });
    const mp4 = join(DIR, "preview-vertical.mp4");
    joinSegments(ff.bin, segs, mp4);

    // Poster: adegan lari saat workout terlihat (detik ke-2 adegan 2).
    const poster = join(DIR, "poster.png");
    const posterAt = INTRO.dur - XFADE + SCENES[0].dur - XFADE + 2.2;
    ffmpeg(ff.bin, ["-ss", posterAt.toFixed(2), "-i", mp4, "-frames:v", "1", poster]);
    copyFileSync(poster, join(README_MEDIA, "preview-poster.png"));

    // Hero README: 360 px, 12 fps. WebP animasi bila ada libwebp, selain itu GIF dengan palet.
    let readme;
    if (ff.webp) {
      readme = join(README_MEDIA, "preview-readme.webp");
      ffmpeg(ff.bin, ["-i", mp4, "-vf", "fps=12,scale=360:-2:flags=lanczos", "-c:v", "libwebp_anim", "-quality", "62", "-compression_level", "6", "-loop", "0", "-an", readme]);
    } else {
      readme = join(README_MEDIA, "preview-readme.gif");
      const pal = join(WORK, "palette.png");
      ffmpeg(ff.bin, ["-i", mp4, "-vf", "fps=10,scale=300:-2:flags=lanczos,palettegen=max_colors=96", pal]);
      ffmpeg(ff.bin, ["-i", mp4, "-i", pal, "-lavfi", "fps=10,scale=300:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4", readme]);
    }
    if (statSync(readme).size > 5 * 1024 * 1024) console.warn(`  ! ${readme} > 5 MB`);

    console.log(`\n✓ ${mp4}  ${size(mp4)}\n✓ ${poster}  ${size(poster)}\n✓ ${readme}  ${size(readme)}`);
  } finally {
    await browser.close();
    stop();
    if (!args.has("--keep") && !process.exitCode) rmSync(WORK, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
