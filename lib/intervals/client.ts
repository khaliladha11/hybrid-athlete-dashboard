import "server-only";
import type { FetchResult, IntervalsError } from "./types";

const BASE_URL = "https://intervals.icu/api/v1";
const TIMEOUT_MS = 10_000;

export function getIntervalsConfig() {
  const apiKey = process.env.INTERVALS_API_KEY?.trim() ?? "";
  const athleteId = process.env.INTERVALS_ATHLETE_ID?.trim() || "0";
  return { apiKey, athleteId, hasKey: apiKey.length > 0 };
}

export function errorFromStatus(status: number): IntervalsError {
  switch (status) {
    case 401:
      return { code: "UNAUTHORIZED", status, title: "API key ditolak (401)", message: "Periksa INTERVALS_API_KEY di .env.local — kemungkinan salah ketik atau sudah di-reset." };
    case 403:
      return { code: "FORBIDDEN", status, title: "Akses ditolak (403)", message: "API key valid tapi tidak punya akses ke atlet ini. Periksa INTERVALS_ATHLETE_ID." };
    case 404:
      return { code: "NOT_FOUND", status, title: "Data tidak ditemukan (404)", message: "Atlet atau aktivitas tidak ditemukan di intervals.icu." };
    default:
      if (status >= 500) {
        return { code: "SERVER_ERROR", status, title: `intervals.icu sedang bermasalah (${status})`, message: "Coba lagi beberapa menit lagi." };
      }
      return { code: "UNKNOWN", status, title: `Permintaan gagal (${status})`, message: "Terjadi kesalahan saat mengambil data dari intervals.icu." };
  }
}

/**
 * GET ke intervals.icu. Hanya dijalankan di server — API key tidak pernah dikirim ke browser.
 * Error dikembalikan sebagai objek terstruktur (tanpa stack trace / API key).
 */
export async function intervalsGet<T = unknown>(path: string, query?: Record<string, string>): Promise<FetchResult<T>> {
  const { apiKey } = getIntervalsConfig();
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from("API_KEY:" + apiKey).toString("base64")}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, error: errorFromStatus(res.status) };
    return { ok: true, data: (await res.json()) as T, source: "live" };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error(`[intervals] ${path} gagal:`, err instanceof Error ? err.message : "unknown error");
    return {
      ok: false,
      error: {
        code: "NETWORK",
        title: timeout ? "Koneksi timeout" : "Tidak bisa terhubung ke intervals.icu",
        message: "Periksa koneksi internet server lalu muat ulang halaman.",
      },
    };
  }
}
