import "server-only";

/**
 * Versi terpasang dan rilis terbaru upstream (1.0, server). Versi dibaca dari package.json saat build.
 * Cek rilis: GitHub Releases tanpa token (60 permintaan/jam per IP), di-cache 6 jam oleh Next, batas waktu 3 detik.
 * Gagal apa pun (offline, 404 tanpa rilis, batas tercapai) → undefined: tampilan diam saja.
 */
import pkg from "@/package.json";
import { parseLatestRelease, UPSTREAM_SLUG } from "./app-info";

export const APP_VERSION: string = pkg.version;

export const LATEST_RELEASE_REVALIDATE_SEC = 6 * 60 * 60;

export async function fetchLatestRelease(fetchImpl: typeof fetch = fetch, repo = UPSTREAM_SLUG): Promise<string | undefined> {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: LATEST_RELEASE_REVALIDATE_SEC },
    } as RequestInit);
    if (!res.ok) return undefined;
    return parseLatestRelease(await res.json());
  } catch {
    return undefined;
  }
}
