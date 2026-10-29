#!/usr/bin/env node
/**
 * Pemeriksa bundle klien (0.16, docs/RELEASE-1.0.md #4): rahasia server tidak boleh ada di berkas yang dikirim ke
 * browser. Build dijalankan dengan NILAI SENTINEL untuk setiap rahasia (CI), lalu skrip ini gagal bila nilai itu, atau
 * akses `process.env.<RAHASIA>` yang ter-inline, muncul di `.next/static` atau di HTML/RSC prerender.
 *
 * Nama variabel boleh muncul sebagai teks petunjuk di UI (mis. "Isi INTERVALS_API_KEY"), jadi yang diperiksa adalah
 * nilainya, bukan namanya.
 *
 * Pakai: INTERVALS_API_KEY=sentinel-... APP_PASSCODE=... npm run build && node scripts/check-client-bundle.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const SECRET_ENV = ["INTERVALS_API_KEY", "APP_PASSCODE", "SESSION_SECRET", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN", "KV_REST_API_READ_ONLY_TOKEN"];

/** Temuan di satu teks: nilai rahasia atau `process.env.NAMA` rahasia. */
export function scanText(text, secrets) {
  const out = [];
  for (const [name, value] of Object.entries(secrets)) {
    if (value && value.length >= 8 && text.includes(value)) out.push(`nilai ${name}`);
    if (text.includes(`process.env.${name}`)) out.push(`process.env.${name}`);
  }
  return out;
}

function* files(dir) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}

export function scanBuild(root, secrets) {
  const findings = [];
  const targets = [join(root, ".next", "static"), join(root, ".next", "server", "app")];
  let scanned = 0;
  for (const dir of targets) {
    for (const f of files(dir)) {
      // Dari server/app hanya yang dikirim ke browser apa adanya (HTML & payload RSC prerender).
      if (dir.endsWith("app") && !/\.(html|rsc|body)$/.test(f)) continue;
      if (!/\.(js|css|html|rsc|body|json|txt|map)$/.test(f)) continue;
      scanned++;
      for (const hit of scanText(readFileSync(f, "utf-8"), secrets)) findings.push(`${f}: ${hit}`);
    }
  }
  return { scanned, findings };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const secrets = Object.fromEntries(SECRET_ENV.map((n) => [n, process.env[n] ?? ""]));
  const withValues = Object.values(secrets).filter((v) => v.length >= 8).length;
  const { scanned, findings } = scanBuild(process.cwd(), secrets);
  if (!scanned) {
    console.error("Tidak ada berkas build. Jalankan `npm run build` dulu.");
    process.exit(1);
  }
  if (findings.length) {
    console.error("Rahasia ditemukan di bundle klien:\n" + findings.join("\n"));
    process.exit(1);
  }
  console.log(`Bundle klien bersih: ${scanned} berkas diperiksa, ${withValues} nilai sentinel rahasia.`);
}
