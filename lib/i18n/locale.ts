/**
 * Bahasa tampilan (1.2.0). Murni, dipakai server dan client.
 *
 * Urutan: pilihan tersimpan (cookie `ha-lang`, cermin dari localStorage) → bahasa browser bila id/en → Indonesia.
 * Cookie dipakai supaya server component merender bahasa yang benar sejak HTML pertama (tanpa kedipan).
 * Cookie ini hanya berisi "id" atau "en", bukan data pribadi.
 */
export type Locale = "id" | "en";

export const LOCALES: readonly Locale[] = ["id", "en"];
export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "ha-lang";

export const isLocale = (v: unknown): v is Locale => v === "id" || v === "en";

/**
 * Bahasa pertama yang didukung dari header `Accept-Language` (urut nilai q). "in" adalah kode lama Indonesia.
 * Tidak ada yang cocok → null.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], weight: Number.isFinite(weight) ? weight : 0, i };
    })
    .filter((t) => t.lang && t.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.i - b.i);
  for (const t of tags) {
    if (t.lang === "id" || t.lang === "in") return "id";
    if (t.lang === "en") return "en";
  }
  return null;
}

/** Bahasa efektif: tersimpan → browser → Indonesia. */
export function resolveLocale(stored: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(stored)) return stored;
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/** Nilai `document.cookie` untuk menyimpan bahasa (1 tahun). */
export const localeCookie = (l: Locale) => `${LOCALE_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
