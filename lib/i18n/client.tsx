"use client";

/**
 * Bahasa di client (1.2.0). Layout root mengisi `LocaleProvider` dengan bahasa yang dipakai server, jadi HTML awal
 * dan hydrate sama.
 *
 * Ganti bahasa = tulis localStorage (`PREF_KEYS.lang`, ikut sinkron & cadangan). Provider memantau nilai itu, jadi
 * perubahan dari tombol, dari Setting, dari tab lain, atau dari sinkron perangkat lain lewat jalur yang sama:
 * cookie diperbarui, `<html lang>` diganti, client component langsung ikut, dan `router.refresh()` merender ulang
 * server component.
 */
import { useRouter } from "next/navigation";
import { createContext, startTransition, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString, writeStored } from "@/lib/preferences";
import type { Dict } from "./dict";
import { isLocale, localeCookie, type Locale } from "./locale";

const LocaleContext = createContext<Locale>("id");

export function LocaleProvider({ locale: serverLocale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [stored] = useStoredString(PREF_KEYS.lang, "");
  const [locale, setLocale] = useState<Locale>(serverLocale);

  // Server merender bahasa baru (mis. setelah refresh): ikut.
  useEffect(() => setLocale(serverLocale), [serverLocale]);

  useEffect(() => {
    if (!isLocale(stored) || stored === locale) return;
    document.cookie = localeCookie(stored);
    document.documentElement.lang = stored;
    setLocale(stored);
    startTransition(() => router.refresh());
  }, [stored]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

/** Teks satu kamus dalam bahasa aktif. */
export function useT<T>(d: Dict<T>): T {
  return d[useContext(LocaleContext)];
}

/** Simpan pilihan bahasa (Provider yang menerapkannya). */
export function useSetLocale(): (l: Locale) => void {
  return useCallback((l: Locale) => writeStored(PREF_KEYS.lang, l), []);
}
