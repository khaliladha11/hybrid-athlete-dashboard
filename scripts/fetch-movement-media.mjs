#!/usr/bin/env node
/**
 * Unduh gambar gerakan dari free-exercise-db (Unlicense) → WebP (lebar maks 600 px)
 * di public/movements/<slug>/{0,1}.webp. Fitur 0.9.
 *
 *   node scripts/fetch-movement-media.mjs           # unduh yang belum ada
 *   node scripts/fetch-movement-media.mjs --force   # unduh ulang semua
 *
 * - Sumber kebenaran: lib/movements/media.ts (dibaca langsung — Node ≥ 22.18 bisa
 *   mengimpor TypeScript). Hanya gerakan dengan `source: "free-exercise-db"` yang diunduh.
 * - Folder di public/movements yang tidak lagi dirujuk dilaporkan (tidak dihapus otomatis).
 * - Konversi memakai `sharp` (sudah terpasang sebagai dependensi Next.js).
 */
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { MOVEMENT_MEDIA } from "../lib/movements/media.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "movements");
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const MAX_WIDTH = 600;
const force = process.argv.includes("--force");

const exists = (p) =>
  stat(p).then(
    () => true,
    () => false,
  );

async function convert(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} untuk ${url}`);
  const input = Buffer.from(await res.arrayBuffer());
  const output = await sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  await writeFile(dest, output);
  return output.length;
}

async function main() {
  const entries = Object.entries(MOVEMENT_MEDIA).filter(([, m]) => m.source === "free-exercise-db" && m.images);
  let fetched = 0;
  let skipped = 0;
  let bytes = 0;
  for (const [name, m] of entries) {
    const dir = path.join(OUT_DIR, m.slug);
    await mkdir(dir, { recursive: true });
    for (const n of [0, 1]) {
      const dest = path.join(dir, `${n}.webp`);
      if (!force && (await exists(dest))) {
        skipped++;
        continue;
      }
      // `reversed`: posisi awal kita = gambar akhir sumber (mis. Negative Pull-Up).
      const src = m.reversed ? 1 - n : n;
      const size = await convert(`${IMAGE_BASE}${m.sourceId}/${src}.jpg`, dest);
      bytes += size;
      fetched++;
      console.log(`✓ ${name} → movements/${m.slug}/${n}.webp (${Math.round(size / 1024)} KB)`);
    }
  }

  const used = new Set(entries.map(([, m]) => m.slug));
  const stale = (await readdir(OUT_DIR)).filter((d) => !used.has(d));
  console.log(`\n${fetched} gambar diunduh (${Math.round(bytes / 1024)} KB), ${skipped} sudah ada, ${entries.length} gerakan bergambar.`);
  if (stale.length) console.log(`⚠ Folder tidak dirujuk lagi (hapus manual bila perlu): ${stale.join(", ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
