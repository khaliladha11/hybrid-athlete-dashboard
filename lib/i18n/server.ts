import "server-only";
import { cookies, headers } from "next/headers";
import type { Dict } from "./dict";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locale";

/** Bahasa permintaan ini: cookie `ha-lang` → `Accept-Language` → Indonesia. */
export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return resolveLocale(stored, (await headers()).get("accept-language"));
}

/** Teks satu kamus untuk server component. */
export async function getT<T>(d: Dict<T>): Promise<T> {
  return d[await getLocale()];
}
