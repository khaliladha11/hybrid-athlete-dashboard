#!/usr/bin/env node
/**
 * Catatan rilis dari CHANGELOG.md (1.0, murni + CLI). Dipakai `.github/workflows/release.yml` (badan GitHub Release)
 * dan `scripts/upstream-update.mjs` (badan PR pembaruan).
 *
 * Konvensi CHANGELOG: setiap rilis = heading `## [versi] · tanggal · judul`; tindakan yang harus dilakukan pemilik
 * deploy (env baru, versi disclaimer naik, setelan GitHub) ditulis di bawah `### Langkah manual` pada rilis itu.
 *
 * Pakai: node scripts/release-notes.mjs v1.0.0
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const TAG_RE = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
export const MANUAL_HEADING = "### Langkah manual";

/** semver `a` vs `b` (dengan atau tanpa "v"): -1, 0, 1. Prarilis lebih rendah dari rilis (1.0.0-rc.1 < 1.0.0). Tidak valid → null. */
export function compareSemver(a, b) {
  const pa = TAG_RE.exec(a.startsWith("v") ? a : `v${a}`);
  const pb = TAG_RE.exec(b.startsWith("v") ? b : `v${b}`);
  if (!pa || !pb) return null;
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d) return d > 0 ? 1 : -1;
  }
  const [ra, rb] = [pa[4], pb[4]];
  if (ra === rb) return 0;
  if (ra === undefined) return 1;
  if (rb === undefined) return -1;
  const xa = ra.split(".");
  const xb = rb.split(".");
  for (let i = 0; i < Math.max(xa.length, xb.length); i++) {
    if (xa[i] === undefined) return -1;
    if (xb[i] === undefined) return 1;
    const na = /^\d+$/.test(xa[i]);
    const nb = /^\d+$/.test(xb[i]);
    if (na && nb && Number(xa[i]) !== Number(xb[i])) return Number(xa[i]) > Number(xb[i]) ? 1 : -1;
    if (na !== nb) return na ? -1 : 1;
    if (xa[i] !== xb[i]) return xa[i] > xb[i] ? 1 : -1;
  }
  return 0;
}

/** Bagian CHANGELOG per versi, urut seperti di file: `{ version, heading, body }`. */
export function changelogSections(md) {
  const out = [];
  const re = /^## \[([^\]]+)\][^\n]*$/gm;
  const heads = [...md.matchAll(re)];
  heads.forEach((m, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : md.length;
    out.push({ version: m[1], heading: m[0].slice(3).trim(), body: md.slice(m.index + m[0].length, end).trim() });
  });
  return out.filter((s) => s.version !== "Unreleased");
}

/** Isi rilis satu versi (tanpa heading), atau null. */
export function changelogSection(md, version) {
  const v = version.replace(/^v/, "");
  return changelogSections(md).find((s) => s.version === v) ?? null;
}

/** Butir di bawah `### Langkah manual` pada satu badan rilis. */
export function manualSteps(body) {
  const i = body.indexOf(MANUAL_HEADING);
  if (i < 0) return [];
  const rest = body.slice(i + MANUAL_HEADING.length);
  const end = rest.search(/^#{2,3} /m);
  return (end < 0 ? rest : rest.slice(0, end))
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

/** Rilis yang lebih baru dari `base` sampai `target` (inklusif), terbaru dulu. */
export function sectionsBetween(md, base, target) {
  return changelogSections(md).filter((s) => {
    const above = base ? compareSemver(s.version, base) : 1;
    const upto = compareSemver(s.version, target);
    return above !== null && upto !== null && above > 0 && upto <= 0;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const tag = process.argv[2] ?? "";
  const section = changelogSection(readFileSync("CHANGELOG.md", "utf-8"), tag);
  if (!section) {
    console.error(`Versi ${tag} tidak ada di CHANGELOG.md.`);
    process.exit(1);
  }
  console.log(`## ${section.heading}\n\n${section.body}\n`);
}
