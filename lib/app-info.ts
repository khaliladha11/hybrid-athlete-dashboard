/**
 * Setting › Tentang & versi (1.0, murni; aman dipakai di klien). Versi terpasang dibaca server dari package.json
 * (`lib/app-release.ts`) dan dikirim sebagai prop, supaya package.json tidak ikut bundel klien.
 *
 * "Ada versi baru" membandingkan versi terpasang dengan rilis stabil terbaru repo upstream (GitHub Releases).
 * Semver sama dengan `scripts/release-notes.mjs` (dijaga test dengan tabel yang sama).
 */
import { DOCS } from "./docs-links";
import { UPSTREAM_REPO } from "./env-schema";

/** Tanggal rilis versi terpasang (YYYY-MM-DD). Naik bersama `version` di package.json; dijaga test terhadap CHANGELOG. */
export const RELEASE_DATE = "2026-11-01";

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/** `a` vs `b`: -1, 0, 1; prarilis lebih rendah dari rilisnya (1.0.0-rc.1 < 1.0.0). Tidak valid → null. */
export function compareSemver(a: string, b: string): -1 | 0 | 1 | null {
  const pa = SEMVER_RE.exec(a);
  const pb = SEMVER_RE.exec(b);
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

/** Ada versi lebih baru dari yang terpasang? Nilai tidak valid → false (tidak pernah menampilkan info yang salah). */
export const isNewer = (latest: string | undefined, installed: string) => !!latest && compareSemver(latest, installed) === 1;

/** Respons GitHub `releases/latest` → tag, atau undefined bila tidak sesuai (draft, prarilis, tag bukan versi). */
export function parseLatestRelease(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  if (r.draft === true || r.prerelease === true || typeof r.tag_name !== "string") return undefined;
  return SEMVER_RE.test(r.tag_name) ? r.tag_name : undefined;
}

export const releaseUrl = (tag: string) => `${UPSTREAM_REPO}/releases/tag/${encodeURIComponent(tag)}`;

/** Pemilik/nama repo upstream (untuk API GitHub). */
export const UPSTREAM_SLUG = UPSTREAM_REPO.replace(/^https:\/\/github\.com\//, "");

export const ABOUT_LINKS: readonly { label: string; href: string }[] = [
  { label: "Kode sumber di GitHub", href: UPSTREAM_REPO },
  { label: "Catatan rilis (CHANGELOG)", href: `${UPSTREAM_REPO}/blob/main/CHANGELOG.md` },
  { label: "Lisensi (MIT)", href: `${UPSTREAM_REPO}/blob/main/LICENSE` },
  { label: "Kredit & atribusi", href: DOCS.notice },
  { label: "Referensi ilmiah", href: `${UPSTREAM_REPO}/blob/main/docs/TRAINING-LOGIC.md` },
];

const LONG_DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-11-01" → "1 November 2026". */
export const formatReleaseDate = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "·" : LONG_DATE.format(d);
};

export const newVersionText = (tag: string) => `Ada versi baru · ${tag}`;
export const UPDATE_HINT = "Pemilik deploy menerimanya lewat pull request pembaruan di GitHub.";
