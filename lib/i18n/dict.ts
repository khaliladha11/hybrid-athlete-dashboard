/**
 * Kamus bertipe (1.2.0). Bahasa Indonesia adalah sumber; terjemahan Inggris diketik terhadap bentuknya, jadi kunci
 * yang hilang, kunci yang berlebih, atau parameter yang berbeda gagal di `tsc` (dan dicek lagi di
 * `__tests__/i18n-keys.test.ts`).
 *
 * Bentuk nilai:
 * - string biasa;
 * - fungsi bertipe untuk teks berparameter dan jamak Inggris, mis. `(n: number) => string`;
 * - array string (urutan tetap, mis. nama hari);
 * - objek bersarang.
 *
 * Pakai: `const M = dict({ judul: "Minggu ini" }, { judul: "This week" })`, lalu `M[locale].judul`, atau lewat
 * `useT(M)` (client) / `await getT(M)` (server).
 */
import type { Locale } from "./locale";

export type Messages<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : T extends readonly (infer U)[]
      ? readonly Messages<U>[]
      : T extends object
        ? { [K in keyof T]: Messages<T[K]> }
        : T;

export type Dict<T> = { readonly [L in Locale]: T } & { readonly __dict: true };

export function dict<T>(id: T, en: Messages<T>): Dict<T> {
  return { id, en: en as unknown as T, __dict: true };
}

export const isDict = (v: unknown): v is Dict<unknown> => !!v && typeof v === "object" && (v as { __dict?: unknown }).__dict === true;
