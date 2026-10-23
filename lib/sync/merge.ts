/**
 * Gabungan sinkron per bagian (murni, docs/SYNC.md §4). Pemenang tidak ditentukan oleh jam perangkat:
 * klien mencatat kunci yang ia ubah sejak `rev` terakhir dari server (`dirty`), lalu
 * - profile & program: utuh; lokal menang bila dirty, selain itu server;
 * - settings & preferences: per sub-bagian / kunci dengan aturan yang sama;
 * - onboarding: gabungan simetris (langkah selesai = gabungan, versi disclaimer = maksimum);
 * - log: per entri lewat `mergeLogs` (tombstone menang, komutatif & idempoten).
 * Aktivasi pertama (perangkat belum pernah sinkron): server menang untuk bagian utuh & per kunci,
 * lokal hanya mengisi yang kosong; log & onboarding tetap digabung.
 */
import { mergeLogs } from "@/lib/log-entries";
import { STEPS, type OnboardingState } from "@/lib/onboarding";
import { PREFERENCE_KEYS, SETTINGS_KEYS, type PartData, type PartName } from "./parts";

export const WHOLE = "*";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Kunci yang berubah antara dua versi lokal (untuk menandai dirty). */
export function changedKeys<K extends PartName>(name: K, prev: PartData[K], next: PartData[K]): string[] {
  if (same(prev, next)) return [];
  if (prev === null || next === null) return [WHOLE];
  if (name === "settings" || name === "preferences") {
    const keys = name === "settings" ? SETTINGS_KEYS : PREFERENCE_KEYS;
    const p = prev as Record<string, unknown>;
    const n = next as Record<string, unknown>;
    return keys.filter((k) => !same(p[k], n[k]));
  }
  return [WHOLE];
}

const minIso = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : a ?? b);
const maxStr = <T extends string>(a?: T, b?: T) => (a && b ? (a > b ? a : b) : a ?? b);

/** Gabungan onboarding yang simetris & idempoten: kemajuan di perangkat mana pun tidak hilang. */
export function mergeOnboarding(a: OnboardingState | null, b: OnboardingState | null): OnboardingState | null {
  if (!a || !b) return a ?? b;
  const completed = STEPS.filter((s) => a.completed.includes(s) || b.completed.includes(s));
  const skipped = STEPS.filter((s) => (a.skipped.includes(s) || b.skipped.includes(s)) && !completed.includes(s));
  const va = a.termsVersion ?? 0;
  const vb = b.termsVersion ?? 0;
  const out: OnboardingState = {
    version: 1,
    currentStep: STEPS[Math.max(STEPS.indexOf(a.currentStep), STEPS.indexOf(b.currentStep))],
    completed,
    skipped,
  };
  const termsVersion = Math.max(va, vb);
  if (termsVersion > 0) {
    out.termsVersion = termsVersion;
    const accepted = va === vb ? minIso(a.termsAcceptedAt, b.termsAcceptedAt) : va > vb ? a.termsAcceptedAt : b.termsAcceptedAt;
    if (accepted) out.termsAcceptedAt = accepted;
  }
  for (const k of ["protectionConfirmedAt", "completedAt", "tourCompletedAt"] as const) {
    const v = minIso(a[k], b[k]);
    if (v) out[k] = v;
  }
  if (out.completedAt) out.currentStep = "summary";
  if (a.migrated || b.migrated) out.migrated = true;
  const choice = maxStr(a.conditionsChoice, b.conditionsChoice);
  if (choice) out.conditionsChoice = choice;
  const zone = maxStr(a.zonePath, b.zonePath);
  if (zone) out.zonePath = zone;
  return out;
}

function mergeKeyed<T extends Record<string, unknown>>(server: T | null, local: T | null, keys: readonly string[], dirty: string[], first: boolean): T | null {
  if (server === null) return local;
  if (local === null) return !first && dirty.length ? null : server;
  if (!first && dirty.includes(WHOLE)) return local;
  const out: Record<string, unknown> = { ...server };
  for (const k of keys) {
    const useLocal = first ? server[k] === undefined : dirty.includes(k);
    if (useLocal) {
      if (local[k] === undefined) delete out[k];
      else out[k] = local[k];
    }
  }
  return out as T;
}

export function mergePart<K extends PartName>(name: K, server: PartData[K], local: PartData[K], dirty: string[], first = false): PartData[K] {
  switch (name) {
    case "log":
      return mergeLogs(server as PartData["log"], local as PartData["log"]) as PartData[K];
    case "onboarding":
      return mergeOnboarding(server as OnboardingState | null, local as OnboardingState | null) as PartData[K];
    case "settings":
      return mergeKeyed(server as Record<string, unknown> | null, local as Record<string, unknown> | null, SETTINGS_KEYS, dirty, first) as PartData[K];
    case "preferences":
      return (mergeKeyed(server as Record<string, unknown>, local as Record<string, unknown>, PREFERENCE_KEYS, dirty, first) ?? {}) as PartData[K];
    default:
      // profile & program: bagian utuh.
      if (first) return (server ?? local) as PartData[K];
      return (dirty.length ? local : server) as PartData[K];
  }
}
