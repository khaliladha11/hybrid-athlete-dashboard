import "server-only";
import { isRequestUnlocked } from "@/lib/auth/guard";
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
      return { code: "UNAUTHORIZED", status, title: "API key ditolak (401)", message: "Periksa INTERVALS_API_KEY di .env.local. Kemungkinan salah ketik atau sudah di-reset." };
    case 403:
      return { code: "FORBIDDEN", status, title: "Akses ditolak (403)", message: "API key valid tapi tidak punya akses ke atlet ini. Periksa INTERVALS_ATHLETE_ID." };
    case 404:
      return { code: "NOT_FOUND", status, title: "Data tidak ditemukan (404)", message: "Atlet atau aktivitas tidak ditemukan di intervals.icu." };
    case 429:
      return { code: "RATE_LIMITED", status, title: "Batas permintaan intervals.icu tercapai (429)", message: "Tunggu beberapa menit lalu coba lagi." };
    default:
      if (status >= 500) {
        return { code: "SERVER_ERROR", status, title: `intervals.icu sedang bermasalah (${status})`, message: "Coba lagi beberapa menit lagi." };
      }
      return { code: "UNKNOWN", status, title: `Permintaan gagal (${status})`, message: "Terjadi kesalahan saat mengambil data dari intervals.icu." };
  }
}

/** Path untuk log: ID atlet dan ID aktivitas diganti placeholder. */
export const redactPath = (path: string) =>
  path.replace(/\/athlete\/[^/?]+/, "/athlete/:id").replace(/\/activity\/[^/?]+/, "/activity/:id").replace(/\/events\/\d+/, "/events/:id");

/** Detik dari header `Retry-After` (angka detik atau tanggal HTTP). */
export function retryAfterSec(value: string | null, nowMs = Date.now()): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) return Math.ceil(n);
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : Math.max(0, Math.ceil((t - nowMs) / 1000));
}

export type IntervalsMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Request ke intervals.icu. Hanya dijalankan di server — API key tidak pernah dikirim ke browser.
 * Error dikembalikan sebagai objek terstruktur (tanpa stack trace / API key). 0.17: juga POST/PUT/DELETE (kalender).
 */
export async function intervalsRequest<T = unknown>(
  method: IntervalsMethod,
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {},
): Promise<FetchResult<T>> {
  // Sandi aplikasi aktif: periksa sesi sebelum data apa pun diambil (lapisan kedua di belakang proxy).
  if (!(await isRequestUnlocked())) {
    return { ok: false, error: { code: "LOCKED", status: 401, title: "Aplikasi terkunci", message: "Buka dengan sandi aplikasi." } };
  }
  const { apiKey } = getIntervalsConfig();
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from("API_KEY:" + apiKey).toString("base64")}`,
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const error = errorFromStatus(res.status);
      const retry = res.status === 429 ? retryAfterSec(res.headers.get("retry-after")) : undefined;
      return { ok: false, error: retry !== undefined ? { ...error, retryAfterSec: retry } : error };
    }
    const text = await res.text();
    return { ok: true, data: (text ? JSON.parse(text) : null) as T, source: "live" };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    // Tanpa ID atlet, key, atau isi respons di log (0.16): hanya pola path dan pesan error jaringan.
    console.error(`[intervals] ${method} ${redactPath(path)} gagal:`, err instanceof Error ? err.message : "unknown error");
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

/** GET ke intervals.icu (lihat `intervalsRequest`). */
export function intervalsGet<T = unknown>(path: string, query?: Record<string, string>): Promise<FetchResult<T>> {
  return intervalsRequest<T>("GET", path, { query });
}
