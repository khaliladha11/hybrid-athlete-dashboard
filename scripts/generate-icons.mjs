// Render ikon PWA & favicon. Jalankan: npm run icons
//  - public/icon.svg    → ikon app (oranye full-bleed, tanda di dalam safe zone maskable)
//  - public/favicon.svg → favicon 16 & 32 px (versi sederhana: lajur dilebur)
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(`../public/${name}`, import.meta.url));
const icon = await read("icon.svg");
const favicon = await read("favicon.svg");

const targets = [
  [icon, "icon-192.png", 192],
  [icon, "icon-512.png", 512],
  [icon, "apple-touch-icon.png", 180],
  [favicon, "favicon-32.png", 32],
  [favicon, "favicon-16.png", 16],
];

for (const [svg, name, size] of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  console.log(`✓ public/${name} (${size}×${size})`);
}
