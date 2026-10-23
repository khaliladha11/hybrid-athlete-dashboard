"use client";

/**
 * Preferensi pengguna di perangkat (localStorage), sinkron antar komponen & tab.
 * Semua akses dibungkus try/catch: mode privat / storage diblokir → pakai default.
 */
import { useCallback, useSyncExternalStore } from "react";
import { emitLocalChange } from "./local-change";
import { PREF_KEYS } from "./preference-keys";

export type ThemePreference = "system" | "light" | "dark";

export interface Preferences {
  theme: ThemePreference;
}

export { PREF_KEYS };

/** Mode blok mingguan ada di `useBlockMode` (settings-store) karena bergantung pada profil. */
const DEFAULTS: Preferences = { theme: "system" };

const listeners = new Set<() => void>();

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Tulis langsung (di luar hook); semua `useStoredString` yang terkait ikut diperbarui. */
export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Penyimpanan tidak tersedia: preferensi hanya berlaku di sesi ini.
  }
  listeners.forEach((l) => l());
  emitLocalChange(key);
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
    () => readStored(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback((v: string | null) => writeStored(key, v), [key]);
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
