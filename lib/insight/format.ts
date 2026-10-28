/** Angka untuk kalimat ringkasan & tabel Insight. Murni. */

const ONE = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const INT = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Satu desimal gaya Indonesia, tanda minus tipografis: −9,4. */
export const num1 = (v: number) => ONE.format(v).replace("-", "−");
export const int = (v: number) => INT.format(v).replace("-", "−");

/** Pace detik/km → `m:ss` untuk kalimat ("selisih 0:12/km"). */
export function clock(sec: number): string {
  const s = Math.round(Math.abs(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
