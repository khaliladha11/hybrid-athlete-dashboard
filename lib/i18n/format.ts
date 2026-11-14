/**
 * Format tanggal & angka per bahasa (1.2.0). Murni.
 *
 * - Tanggal kalender (YYYY-MM-DD, sudah tanggal lokal WIB) diformat di zona UTC supaya harinya tidak bergeser.
 * - Indonesia memakai `id-ID` persis seperti sebelum 1.2.0 (tampilan ID tidak berubah). Inggris memakai `en-GB`
 *   (urutan "14 Nov", desimal titik).
 * - Angka yang selama ini ditulis dengan `toFixed` tetap bertitik di kedua bahasa (keputusan pemilik, 1.2.0).
 */
import type { Locale } from "./locale";

export const intlLocale = (l: Locale) => (l === "id" ? "id-ID" : "en-GB");

const DATE_CACHE = new Map<string, Intl.DateTimeFormat>();
const NUM_CACHE = new Map<string, Intl.NumberFormat>();

/** Formatter tanggal yang di-cache. Zona bawaan UTC (untuk tanggal kalender). */
export function dateFormat(l: Locale, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const o = { timeZone: "UTC", ...opts };
  const key = `${l}|${JSON.stringify(o)}`;
  let f = DATE_CACHE.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(l), o);
    DATE_CACHE.set(key, f);
  }
  return f;
}

/** en-GB terbaru menulis "Sept"; disamakan dengan bulan lain jadi tiga huruf. */
const tidy = (l: Locale, s: string) => (l === "en" ? s.replace(/\bSept\b/g, "Sep") : s);

/** Tanggal kalender "YYYY-MM-DD" (boleh diikuti jam) → teks. Tidak valid → "·". */
export function formatDay(l: Locale, date: string | undefined, opts: Intl.DateTimeFormatOptions): string {
  if (!date) return "·";
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "·" : tidy(l, dateFormat(l, opts).format(d));
}

/** Instan waktu (Date/ISO) → teks dengan zona tertentu (bawaan UTC). */
export function formatInstant(l: Locale, at: Date | string, opts: Intl.DateTimeFormatOptions): string {
  const d = typeof at === "string" ? new Date(at) : at;
  return Number.isNaN(d.getTime()) ? "·" : tidy(l, dateFormat(l, opts).format(d));
}

/** Gaya tanggal yang sering dipakai. */
export const DAY_MONTH: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
export const WEEKDAY_LONG: Intl.DateTimeFormatOptions = { weekday: "long" };
export const WEEKDAY_SHORT: Intl.DateTimeFormatOptions = { weekday: "short" };
export const MONTH_YEAR: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
export const MONTH_SHORT: Intl.DateTimeFormatOptions = { month: "short" };
export const LONG_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
export const WEEKDAY_DAY_MONTH: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
export const DAY_TITLE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

/** Angka per bahasa (pengganti `toLocaleString("id-ID")`). */
export function formatNumber(l: Locale, v: number, opts: Intl.NumberFormatOptions = {}): string {
  const key = `${l}|${JSON.stringify(opts)}`;
  let f = NUM_CACHE.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale(l), opts);
    NUM_CACHE.set(key, f);
  }
  return f.format(v);
}

/** Tanda minus tipografis (−) untuk angka di kalimat dan sumbu. */
export const minus = (s: string) => s.replace("-", "−");
