"use client";

/**
 * Pengaturan atlet di perangkat (localStorage). JSON profil = default;
 * `useResolvedProfile` menggabungkan keduanya untuk generator & halaman.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseSettings, resolveProfile, type AthleteSettings } from "./athlete-settings";
import { todayWib } from "./date";
import { blockContext, type BlockContext } from "./generator/block";
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

const noopSubscribe = () => () => {};

/** false saat render server & hidrasi pertama, true setelah di browser (localStorage sudah terbaca). */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Mode blok mingguan. Nilai tersimpan "1"/"0" menang; tanpa nilai tersimpan, blok aktif hanya
 * bila profil punya tanggal mulai blok (fork baru mulai di mode bebas).
 */
export function useBlockMode(): [boolean, (v: boolean) => void] {
  const [raw, set] = useStoredString(PREF_KEYS.blockEnabled, "");
  const p = useResolvedProfile();
  const update = useCallback((v: boolean) => set(v ? "1" : "0"), [set]);
  const enabled = raw === "1" ? true : raw === "0" ? false : Boolean(p.training?.blockStart);
  return [enabled, update];
}

/** Posisi blok hari ini dari tanggal mulai blok di profil efektif (perangkat). */
export function useBlockContext(): BlockContext {
  const p = useResolvedProfile();
  const start = p.training?.blockStart;
  const weeks = p.training?.blockWeeks;
  return useMemo(() => blockContext(todayWib(), start, weeks), [start, weeks]);
}
