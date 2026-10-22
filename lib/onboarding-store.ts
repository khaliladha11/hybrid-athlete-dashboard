"use client";

/** Status onboarding di localStorage perangkat (lihat `lib/onboarding.ts`). */
import { useCallback, useMemo } from "react";
import { parseOnboardingState, type OnboardingState } from "./onboarding";
import { PREF_KEYS } from "./preference-keys";
import { useStoredString } from "./preferences";

export function useOnboardingState(): [OnboardingState | null, (next: OnboardingState | null) => void] {
  const [raw, setRaw] = useStoredString(PREF_KEYS.onboarding, "");
  const state = useMemo(() => parseOnboardingState(raw), [raw]);
  const save = useCallback((next: OnboardingState | null) => setRaw(next ? JSON.stringify(next) : null), [setRaw]);
  return [state, save];
}

/** Ada data dari sebelum 0.11 (Setting, log, atau program) → pengguna lama, jangan paksa mengulang onboarding. */
export function useHasLegacyData(): boolean {
  const [settings] = useStoredString(PREF_KEYS.settings, "");
  const [program] = useStoredString(PREF_KEYS.program, "");
  const [log] = useStoredString(PREF_KEYS.log, "");
  return Boolean(settings || program || (log && log !== "[]"));
}
