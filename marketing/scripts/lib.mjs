/**
 * Bagian bersama untuk media marketing (1.0.0-rc.2): server Demo Mode, browser, seed localStorage, font app,
 * dan pencarian ffmpeg. Semua di luar `app/`, tidak pernah di-import app, jadi tidak masuk bundle.
 *
 * Privasi (CLAUDE.md): selalu Demo Mode. Env rahasia dikosongkan supaya `.env.local` di mesin pengembang
 * tidak terbaca, dan data yang tampil hanya data fiktif `lib/mock-data.ts`.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const MARKETING = join(ROOT, "marketing");
export const OUT = join(MARKETING, "out");
export const PORT = Number(process.env.MEDIA_PORT ?? 3302);
export const BASE = `http://localhost:${PORT}`;

/** Kosong = Demo Mode, sama seperti `playwright.config.ts`. */
export const DEMO_ENV = {
  INTERVALS_API_KEY: "",
  APP_PASSCODE: "",
  SESSION_SECRET: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  KV_REST_API_URL: "",
  KV_REST_API_TOKEN: "",
};

/** Onboarding selesai dan alat fiktif (seperti `e2e/helpers.ts`), tanpa nama orang. */
export const SEED = {
  "hybrid-athlete.onboarding.v1": {
    version: 1,
    currentStep: "summary",
    completed: ["welcome", "terms", "connection", "protect", "profile", "conditions", "zones", "equipment", "install", "summary"],
    skipped: [],
    termsVersion: 2,
    termsAcceptedAt: "2026-10-26T00:00:00.000Z",
    completedAt: "2026-10-26T00:00:00.000Z",
    tourCompletedAt: "2026-10-26T00:00:00.000Z",
    conditionsChoice: "none",
    zonePath: "estimate",
  },
  "hybrid-athlete.settings.v1": {
    version: 1,
    profile: { name: "" },
    // Layar sekali "Perubahan batas beban" sudah disetujui, supaya Strength langsung tampil.
    loadRule: { acceptedAt: "2026-10-26T00:00:00.000Z", limitToLibrary: false },
    equipment: {
      dumbbell: { enabled: true, handleKg: 2, handles: 2 },
      barbell: { enabled: false },
      plates: [{ kg: 1.25, count: 4 }, { kg: 2, count: 4 }],
      bands: ["Light", "Medium"],
      pullUpBar: true,
      bench: true,
      bandAnchor: true,
      other: [],
      items: [],
    },
  },
  "hybrid-athlete.theme": "dark",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isUp() {
  try {
    return (await fetch(`${BASE}/offline`)).ok;
  } catch {
    return false;
  }
}

/** Jalankan `next start` Demo Mode (build dulu bila belum ada). Mengembalikan fungsi untuk mematikannya. */
export async function startDemoServer({ build = false } = {}) {
  if (await isUp()) {
    console.log(`· memakai server yang sudah jalan di ${BASE} (pastikan Demo Mode)`);
    return () => {};
  }
  const env = { ...process.env, ...DEMO_ENV, NEXT_TELEMETRY_DISABLED: "1" };
  if (build || !existsSync(join(ROOT, ".next", "BUILD_ID"))) {
    console.log("· next build");
    const r = spawnSync("npx", ["next", "build"], { cwd: ROOT, env, stdio: "inherit", shell: true });
    if (r.status !== 0) throw new Error("next build gagal");
  }
  console.log(`· next start -p ${PORT} (Demo Mode)`);
  const child = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: ROOT, env, stdio: "ignore", shell: true });
  for (let i = 0; i < 120 && !(await isUp()); i++) await sleep(500);
  if (!(await isUp())) throw new Error(`server tidak menjawab di ${BASE}`);
  return () => {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  };
}

/** Lokal memakai Edge yang terpasang seperti e2e; `MEDIA_BROWSER=chromium` memakai Chromium Playwright. */
export function launchBrowser() {
  const channel = process.env.MEDIA_BROWSER === "chromium" || process.env.CI ? undefined : "msedge";
  return chromium.launch({ channel });
}

/** Isi localStorage sebelum skrip halaman pertama berjalan (sekali per context). */
export async function seed(context, extra = {}) {
  await context.addInitScript((entries) => {
    if (sessionStorage.getItem("media-seeded")) return;
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    sessionStorage.setItem("media-seeded", "1");
  }, { ...SEED, ...extra });
}

/**
 * Gulir ke elemen sampai atasnya `offset` px dari atas layar, dengan ease-out selama `ms` (0 = instan).
 * Memakai kontainer scroll terdekat (mode latihan punya kontainer sendiri), selain itu dokumen.
 */
export async function scrollToEl(locator, { offset = 70, ms = 0 } = {}) {
  await locator.first().evaluate(
    (el, [offset, ms]) =>
      new Promise((done) => {
        let box = el.parentElement;
        while (box && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
        const sc = box ?? document.scrollingElement;
        const top = box ? box.getBoundingClientRect().top : 0;
        const from = sc.scrollTop;
        const to = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, from + el.getBoundingClientRect().top - top - offset));
        if (!ms) {
          sc.scrollTop = to;
          return done();
        }
        const t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          sc.scrollTop = from + (to - from) * (1 - Math.pow(1 - t, 3));
          t < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [offset, ms],
  );
}

/**
 * `@font-face` app (Archivo + Geist Mono dari next/font, sudah di-self-host oleh build) dengan URL absolut,
 * supaya template post dan caption memakai font yang persis sama tanpa jaringan.
 */
export async function appFontCss(browser) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/offline`);
  const css = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const r of rules) {
        if (!(r instanceof CSSFontFaceRule)) continue;
        const base = sheet.href ?? location.href;
        out.push(r.cssText.replace(/url\("?([^")]+)"?\)/g, (_, u) => `url("${new URL(u, base).href}")`));
      }
    }
    // Nama keluarga next/font berhash (mis. "Archivo", "Archivo Fallback"): pakai yang dipakai variabel CSS.
    const s = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return { faces: out.join("\n"), sans: body.fontFamily, mono: s.getPropertyValue("--font-geist-mono") || "monospace" };
  });
  await page.close();
  // Halaman `setContent` beda origin dari server, jadi font (butuh CORS) disisipkan sebagai data URL.
  const urls = [...new Set([...css.faces.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]))];
  for (const u of urls) {
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    css.faces = css.faces.replaceAll(`url("${u}")`, `url("data:font/woff2;base64,${buf.toString("base64")}")`);
  }
  if (!urls.length) console.warn("  ! @font-face app tidak ditemukan, memakai font cadangan");
  return css;
}

/** ffmpeg lengkap (butuh libx264 + overlay). `FFMPEG` env > PATH > lokasi winget/choco umum. Null bila tidak ada. */
export function findFfmpeg() {
  const candidates = [process.env.FFMPEG, "ffmpeg"].filter(Boolean);
  const local = process.env.LOCALAPPDATA;
  if (local) {
    const pkgs = join(local, "Microsoft", "WinGet", "Packages");
    if (existsSync(pkgs)) {
      for (const d of readdirSync(pkgs).filter((n) => /ffmpeg/i.test(n))) {
        const root = join(pkgs, d);
        for (const sub of readdirSync(root)) candidates.push(join(root, sub, "bin", "ffmpeg.exe"));
      }
    }
  }
  candidates.push("C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe");
  for (const c of candidates) {
    const r = spawnSync(c, ["-hide_banner", "-encoders"], { encoding: "utf8" });
    if (r.status === 0 && /libx264/.test(r.stdout)) return { bin: c, webp: /libwebp_anim|libwebp/.test(r.stdout) };
  }
  return null;
}

/** Jalankan ffmpeg dan lempar galat dengan ekor log bila gagal. */
export function ffmpeg(bin, args) {
  const r = spawnSync(bin, ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg gagal:\n${(r.stderr ?? "").slice(-2000)}`);
}
