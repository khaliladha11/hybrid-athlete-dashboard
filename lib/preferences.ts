"use client";

/**
 * Preferensi pengguna di perangkat (localStorage), sinkron antar komponen & tab.
 * Semua akses dibungkus try/catch: mode privat / storage diblokir → pakai default.
 */
import { useCallback, useSyncExternalStore } from "react";
import { PREF_KEYS } from "./preference-keys";

export type ThemePreference = "system" | "light" | "dark";

export interface Preferences {
  theme: ThemePreference;
  /** Program blok mingguan (periodisasi 4 minggu). false = mode latihan bebas. */
  blockEnabled: boolean;
}

export { PREF_KEYS };

const DEFAULTS: Preferences = { theme: "system", blockEnabled: true };

const listeners = new Set<() => void>();

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Penyimpanan tidak tersedia: preferensi hanya berlaku di sesi ini.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = () => l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Hook untuk satu nilai string di localStorage. */
export function useStoredString(key: string, fallback: string): [string, (v: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readRaw(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback((v: string | null) => writeRaw(key, v), [key]);
  return [value, set];
}

// ---------- Tema ----------

const THEME_BG = { light: "#ffffff", dark: "#0f0f0e" } as const;

/** Pasang tema ke <html> + warna status bar. "system" menghapus pilihan manual. */
export function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  const resolved = pref === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (pref === "system") {
      const media = m.getAttribute("media") ?? "";
      m.setAttribute("content", media.includes("dark") ? THEME_BG.dark : THEME_BG.light);
    } else {
      m.setAttribute("content", THEME_BG[resolved]);
    }
  });
}

export function useThemePreference(): [ThemePreference, (t: ThemePreference) => void] {
  const [raw, set] = useStoredString(PREF_KEYS.theme, DEFAULTS.theme);
  const theme: ThemePreference = raw === "light" || raw === "dark" ? raw : "system";
  const update = useCallback(
    (t: ThemePreference) => {
      set(t === "system" ? null : t);
      applyTheme(t);
    },
    [set],
  );
  return [theme, update];
}

/** Tema yang benar-benar tampil sekarang (system → sesuai OS). */
export function useResolvedTheme(): "light" | "dark" {
  const [theme] = useThemePreference();
  const systemDark = useSyncExternalStore(
    (l) => {
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", l);
      return () => mq.removeEventListener("change", l);
    },
    () => matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

// ---------- Blok mingguan ----------

export function useBlockEnabled(): [boolean, (v: boolean) => void] {
  const [raw, set] = useStoredString(PREF_KEYS.blockEnabled, DEFAULTS.blockEnabled ? "1" : "0");
  const update = useCallback((v: boolean) => set(v ? null : "0"), [set]);
  return [raw !== "0", update];
}
