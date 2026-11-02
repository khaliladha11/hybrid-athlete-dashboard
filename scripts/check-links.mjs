#!/usr/bin/env node
/**
 * Pemeriksa tautan dokumen (1.0.0-rc.2). Tanpa jaringan secara bawaan, jadi aman di CI (dijalankan lewat
 * `__tests__/install-docs.test.ts`):
 * - tautan relatif ke file dan anchor `#…` di semua `*.md` (root, `docs/`, `.github/`);
 * - tautan ke repo ini di GitHub (`…/blob/main/<path>#anchor` dan `…#anchor` = README) dicek ke file lokal.
 *
 * `--external` juga membuka setiap tautan http(s) lain (GET, ikut redirect) dan melaporkan statusnya. Penerbit
 * jurnal sering menolak bot (403/429): itu dilaporkan sebagai "perlu dicek manual", bukan rusak.
 *
 * Pakai: npm run check:links            (lokal saja)
 *        node scripts/check-links.mjs --external
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

export const REPO_URL = "https://github.com/khaliladha11/hybrid-athlete-dashboard";

const FENCE = /^(`{3,})[^\n]*\n[\s\S]*?\n\1\s*$/gm;
const stripCode = (md) => md.replace(FENCE, "").replace(/`[^`\n]*`/g, "");

/** Slug heading ala GitHub: huruf kecil, tanda baca dibuang, spasi jadi "-", duplikat diberi akhiran -1, -2. */
export function anchors(md) {
  const out = new Set();
  const seen = new Map();
  for (const line of md.replace(FENCE, "").split(/\r?\n/)) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const base = m[1]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .replace(/ /g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n ? `${base}-${n}` : base);
  }
  // Anchor eksplisit: <a id="…"> / <a name="…">.
  for (const m of md.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) out.add(m[1]);
  return out;
}

/** Tautan Markdown `[teks](href)` dan HTML `href="…"`/`src="…"`, di luar blok kode. */
export function links(md) {
  const text = stripCode(md);
  return [...text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g), ...text.matchAll(/(?:href|src|srcset)="([^"]+)"/g)].map((m) => m[1]);
}

/** Semua dokumen yang diperiksa. */
export function docFiles(root = ".") {
  const out = readdirSync(root).filter((f) => f.endsWith(".md"));
  const walk = (dir) => {
    if (!existsSync(join(root, dir))) return;
    for (const e of readdirSync(join(root, dir))) {
      const p = join(dir, e);
      if (statSync(join(root, p)).isDirectory()) walk(p);
      else if (e.endsWith(".md")) out.push(p.replace(/\\/g, "/"));
    }
  };
  walk("docs");
  walk(".github");
  return out;
}

/** href → file lokal + anchor, atau null bila bukan tautan lokal/repo. */
function resolveLocal(file, href) {
  if (href.startsWith(`${REPO_URL}/blob/main/`)) {
    const [path, hash] = href.slice(`${REPO_URL}/blob/main/`.length).split("#");
    return { target: normalize(decodeURIComponent(path)), hash };
  }
  if (href === REPO_URL || href.startsWith(`${REPO_URL}#`)) return { target: "README.md", hash: href.split("#")[1] };
  if (/^(https?:|mailto:|data:)/.test(href)) return null;
  const [path, hash] = href.split("#");
  return { target: path ? normalize(join(dirname(file), decodeURIComponent(path))) : file, hash };
}

/** Tautan rusak: daftar "file: href (alasan)". */
export function brokenLinks(files = docFiles(), root = ".") {
  const broken = [];
  const cache = new Map();
  const anchorsOf = (f) => {
    if (!cache.has(f)) cache.set(f, anchors(readFileSync(join(root, f), "utf-8")));
    return cache.get(f);
  };
  for (const file of files) {
    for (const href of links(readFileSync(join(root, file), "utf-8"))) {
      const r = resolveLocal(file, href.split(" ")[0]);
      if (!r) continue;
      if (!existsSync(join(root, r.target))) {
        broken.push(`${file}: ${href} (file tidak ada)`);
        continue;
      }
      if (r.hash && r.target.endsWith(".md") && !anchorsOf(r.target).has(r.hash.toLowerCase())) broken.push(`${file}: ${href} (anchor tidak ada)`);
    }
  }
  return broken;
}

/** Semua tautan http(s) eksternal unik (bukan repo ini). */
export function externalLinks(files = docFiles(), root = ".") {
  const set = new Set();
  for (const f of files) for (const h of links(readFileSync(join(root, f), "utf-8"))) if (/^https?:/.test(h) && !h.startsWith(REPO_URL)) set.add(h);
  return [...set].sort();
}

async function checkExternal(urls) {
  const rows = [];
  for (const u of urls) {
    let status = "error";
    try {
      const res = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "User-Agent": "Mozilla/5.0 (link check)" } });
      status = String(res.status);
    } catch (e) {
      status = e?.name === "TimeoutError" ? "timeout" : "error";
    }
    rows.push([status, u]);
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const broken = brokenLinks();
  for (const b of broken) console.log(`RUSAK  ${b}`);
  console.log(`${docFiles().length} dokumen, ${broken.length} tautan lokal rusak.`);
  if (process.argv.includes("--external")) {
    const rows = await checkExternal(externalLinks());
    for (const [s, u] of rows) if (s !== "200") console.log(`${/^(403|429)$/.test(s) ? "CEK    " : "GAGAL  "}${s} ${u}`);
    console.log(`${rows.length} tautan eksternal, ${rows.filter(([s]) => s === "200").length} OK.`);
  }
  process.exit(broken.length ? 1 : 0);
}

