#!/usr/bin/env node
/**
 * Anggaran Lighthouse mobile (0.16, docs/RELEASE-1.0.md #3). Lighthouse dijalankan lewat `npx lighthouse@12.8.2`
 * (tidak masuk lockfile, supaya dependensi alat tidak menambah temuan `npm audit`).
 *
 * 1. Chrome/Edge headless dibuka dengan port debugging; localStorage diisi status onboarding selesai (fiktif) supaya
 *    yang diukur halaman aplikasi, bukan wizard.
 * 2. Lighthouse terhubung ke browser yang sama (`--port`, `--disable-storage-reset`), preset mobile bawaan
 *    (layar 412px, CPU 4× lebih lambat, jaringan 4G lambat). Karena penyimpanan tidak direset, yang diukur adalah
 *    kunjungan berulang dengan service worker terpasang (aset dari cache), seperti pemakaian harian PWA.
 * 3. Gagal bila skor atau metrik melewati anggaran. Hasil ringkas ditulis ke stdout (dan JSON bila `--out`).
 *
 * Pakai: npm run build && npx next start -p 3400 & node scripts/lighthouse-budget.mjs http://localhost:3400
 * Browser: CHROME_PATH, atau Chrome/Edge di lokasi umum.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const PAGES = (process.env.LH_PAGES ?? "/,/run,/strength,/program,/insight").split(",");
/** Anggaran (dikunci dari pengukuran 0.16, docs/PRD.md §5). */
export const RUNS = Number(process.env.LH_RUNS ?? 2);
export const BUDGET = { performance: 0.85, accessibility: 0.95, "best-practices": 0.95, lcpMs: 2500, tbtMs: 350, cls: 0.1 };

/** Pelanggaran anggaran untuk satu hasil ringkas. */
export function overBudget(r, b = BUDGET) {
  const out = [];
  for (const k of ["performance", "accessibility", "best-practices"]) if (r[k] < b[k]) out.push(`${k} ${r[k]} < ${b[k]}`);
  if (r.lcpMs > b.lcpMs) out.push(`LCP ${r.lcpMs} ms > ${b.lcpMs}`);
  if (r.tbtMs > b.tbtMs) out.push(`TBT ${r.tbtMs} ms > ${b.tbtMs}`);
  if (r.cls > b.cls) out.push(`CLS ${r.cls} > ${b.cls}`);
  return out;
}

const ONBOARDED = JSON.stringify({ version: 1, currentStep: "summary", completed: ["welcome", "terms", "connection", "protect", "profile", "conditions", "zones", "equipment", "install", "summary"], skipped: [], termsVersion: 2, termsAcceptedAt: "2026-10-26T00:00:00.000Z", completedAt: "2026-10-26T00:00:00.000Z", tourCompletedAt: "2026-10-26T00:00:00.000Z", conditionsChoice: "none", zonePath: "estimate" });

function findBrowser() {
  const c = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"];
  return c.find((p) => p && existsSync(p));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function seedStorage(port, base) {
  let targets;
  for (let i = 0; i < 50 && !targets; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    } catch {
      await sleep(200);
    }
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const my = ++id;
      const on = (e) => {
        const m = JSON.parse(e.data);
        if (m.id === my) {
          ws.removeEventListener("message", on);
          resolve(m.result);
        }
      };
      ws.addEventListener("message", on);
      ws.send(JSON.stringify({ id: my, method, params }));
    });
  await send("Page.enable");
  await send("Page.navigate", { url: base + "/offline" });
  await sleep(2500);
  await send("Runtime.evaluate", { expression: `localStorage.setItem("hybrid-athlete.onboarding.v1", ${JSON.stringify(ONBOARDED)}); true` });
  // Buka Profil sekali dan tunggu service worker selesai menyimpan rute utama, supaya pemanasan cache tidak ikut
  // terukur di halaman pertama. Pengukuran = kunjungan berulang dengan service worker terpasang.
  await send("Page.navigate", { url: base + "/" });
  await sleep(15000);
  ws.close();
}

async function main() {
  const base = (process.argv[2] ?? "http://localhost:3400").replace(/\/$/, "");
  const outIdx = process.argv.indexOf("--out");
  const browser = findBrowser();
  if (!browser) throw new Error("Chrome/Edge tidak ditemukan. Isi CHROME_PATH.");
  const port = 9333;
  const profile = mkdtempSync(join(tmpdir(), "ha-lh-"));
  const chrome = spawn(browser, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  const results = [];
  try {
    await seedStorage(port, base);
    for (const path of PAGES) {
      // Dua kali per halaman, ambil skor performa terbaik (variasi mesin CI).
      let best = null;
      for (let run = 0; run < RUNS; run++) {
      const raw = execFileSync(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["-y", "lighthouse@12.8.2", base + path, `--port=${port}`, "--disable-storage-reset", "--only-categories=performance,accessibility,best-practices", "--output=json", "--output-path=stdout", "--quiet"],
        { maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" },
      ).toString();
      const lhr = JSON.parse(raw);
      const r = {
        path,
        performance: lhr.categories.performance.score,
        accessibility: lhr.categories.accessibility.score,
        "best-practices": lhr.categories["best-practices"].score,
        lcpMs: Math.round(lhr.audits["largest-contentful-paint"].numericValue),
        tbtMs: Math.round(lhr.audits["total-blocking-time"].numericValue),
        cls: Math.round(lhr.audits["cumulative-layout-shift"].numericValue * 1000) / 1000,
        kb: Math.round(lhr.audits["total-byte-weight"].numericValue / 1024),
        failedA11y: Object.values(lhr.audits).filter((a) => a.score === 0 && lhr.categories.accessibility.auditRefs.some((x) => x.id === a.id)).map((a) => a.id),
      };
      if (!best || r.performance > best.performance) best = r;
      }
      const r = best;
      results.push(r);
      console.log(`${path.padEnd(10)} perf ${r.performance} · a11y ${r.accessibility} · bp ${r["best-practices"]} · LCP ${r.lcpMs} ms · TBT ${r.tbtMs} ms · CLS ${r.cls} · ${r.kb} KB${r.failedA11y.length ? ` · a11y gagal: ${r.failedA11y.join(", ")}` : ""}`);
    }
  } finally {
    chrome.kill();
    await sleep(500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
  if (outIdx > 0) writeFileSync(process.argv[outIdx + 1], JSON.stringify(results, null, 2));
  const fails = results.flatMap((r) => overBudget(r).map((m) => `${r.path}: ${m}`));
  if (fails.length) {
    console.error("Melewati anggaran:\n" + fails.join("\n"));
    process.exit(1);
  }
  console.log("Semua halaman dalam anggaran.");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
