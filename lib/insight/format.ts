/** Angka untuk kalimat ringkasan & tabel Insight. Murni. */
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";

const ONE = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const INT = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Satu desimal gaya Indonesia, tanda minus tipografis: −9,4. */
export const num1 = (v: number, l: Locale = "id") =>
  (l === "id" ? ONE.format(v) : formatNumber(l, v, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).replace("-", "−");
export const int = (v: number, l: Locale = "id") => (l === "id" ? INT.format(v) : formatNumber(l, v, { maximumFractionDigits: 0 })).replace("-", "−");
/** "12,5 kg" / "12 kg" tanpa ",0" (EN "12.5 kg"). */
export const kgText = (v: number, l: Locale = "id") => `${num1(v, l).replace(l === "id" ? ",0" : ".0", "")} kg`;

/** Pace detik/km → `m:ss` untuk kalimat ("selisih 0:12/km"). */
export function clock(sec: number): string {
  const s = Math.round(Math.abs(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Pace detik/km → `5'50"` (sama dengan `formatPaceTag` di UI, untuk kalimat ringkasan dari lib). */
export function paceTag(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, "0")}"`;
}

export function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
