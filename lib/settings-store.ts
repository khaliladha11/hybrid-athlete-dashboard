"use client";

/**
 * Pengaturan atlet di perangkat (localStorage). JSON profil = default;
 * `useResolvedProfile` menggabungkan keduanya untuk generator & halaman.
 */
import { useCallback, useMemo } from "react";
import { parseSettings, resolveProfile, type AthleteSettings } from "./athlete-settings";
import { PREF_KEYS } from "./preference-keys";
import { useStoredString } from "./preferences";
import { baseProfile, profile, type ResolvedProfile } from "./profile";

export function useAthleteSettings(): [AthleteSettings, (next: AthleteSettings | null) => void] {
  const [raw, setRaw] = useStoredString(PREF_KEYS.settings, "");
  const settings = useMemo(() => parseSettings(raw, baseProfile), [raw]);
  const save = useCallback((next: AthleteSettings | null) => setRaw(next ? JSON.stringify(next) : null), [setRaw]);
  return [settings, save];
}

/** Profil efektif (default JSON + pengaturan perangkat). */
export function useResolvedProfile(): ResolvedProfile {
  const [raw] = useStoredString(PREF_KEYS.settings, "");
  return useMemo(() => (raw ? resolveProfile(baseProfile, parseSettings(raw, baseProfile)) : profile), [raw]);
}
