/**
 * Bagian data yang disinkron (docs/SYNC.md §4) dan pemetaannya ke isi localStorage (murni).
 * Dipakai klien (baca/tulis perangkat) dan server (validasi payload) dengan parser yang sama
 * seperti impor cadangan, sehingga data rusak tidak pernah tersimpan atau diterapkan.
 */
import { defaultSettings, parseProfileSettings, parseSettings, type AthleteSettings, type ProfileSettings } from "@/lib/athlete-settings";
import { normalizeLog } from "@/lib/log-entries";
import { parseOnboardingState, type OnboardingState } from "@/lib/onboarding";
import type { AthleteProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { MAX_PRS, normalizePrs, type PrEntry } from "@/lib/prs";

export const PART_NAMES = ["profile", "settings", "program", "preferences", "onboarding", "log", "prs"] as const;
export type PartName = (typeof PART_NAMES)[number];
export const isPartName = (x: unknown): x is PartName => typeof x === "string" && (PART_NAMES as readonly string[]).includes(x);

export const SETTINGS_KEYS = ["conditions", "customConditions", "runZones", "equipment", "movements", "raceResults", "zoneOfferDismissedVdot", "loadRule"] as const;
export type SettingsPart = Pick<AthleteSettings, (typeof SETTINGS_KEYS)[number]>;
export const PREFERENCE_KEYS = ["theme", "blockEnabled"] as const;
/** Kunci tidak ada = default (tema sistem; blok mengikuti profil). */
export type PreferencesPart = { theme?: "light" | "dark"; blockEnabled?: boolean };

export interface PartData {
  profile: ProfileSettings | null;
  settings: SettingsPart | null;
  program: string | null;
  preferences: PreferencesPart;
  onboarding: OnboardingState | null;
  log: LogEntry[];
  /** PR kemampuan (0.14.0), digabung per entri dengan tombstone seperti log. */
  prs: PrEntry[];
}

export const MAX_LOG_ENTRIES = 5000;
export const MAX_PROGRAM_CHARS = 64 * 1024;

/** Isi mentah localStorage yang relevan (string kosong / null = belum disimpan). */
export interface LocalRaw {
  settings: string | null;
  program: string | null;
  theme: string | null;
  blockEnabled: string | null;
  onboarding: string | null;
}

const pickSettings = (s: AthleteSettings): SettingsPart => ({
  conditions: s.conditions,
  customConditions: s.customConditions,
  runZones: s.runZones,
  equipment: s.equipment,
  movements: s.movements,
  raceResults: s.raceResults,
  ...(s.zoneOfferDismissedVdot !== undefined ? { zoneOfferDismissedVdot: s.zoneOfferDismissedVdot } : {}),
  ...(s.loadRule !== undefined ? { loadRule: s.loadRule } : {}),
});

export function partsFromLocal(raw: LocalRaw, log: LogEntry[], base: AthleteProfile, prs: PrEntry[] = []): PartData {
  const parsed = raw.settings ? parseSettings(raw.settings, base) : null;
  const preferences: PreferencesPart = {};
  if (raw.theme === "light" || raw.theme === "dark") preferences.theme = raw.theme;
  if (raw.blockEnabled === "1" || raw.blockEnabled === "0") preferences.blockEnabled = raw.blockEnabled === "1";
  return {
    profile: parsed ? parsed.profile : null,
    settings: parsed ? pickSettings(parsed) : null,
    program: raw.program || null,
    preferences,
    onboarding: parseOnboardingState(raw.onboarding ?? ""),
    log,
    prs,
  };
}

/** Kebalikan `partsFromLocal`: nilai localStorage (null = hapus key). */
export function localFromParts(p: PartData, base: AthleteProfile): LocalRaw {
  const settings: AthleteSettings | null =
    p.profile === null && p.settings === null ? null : { ...defaultSettings(base), ...(p.settings ?? {}), version: 1, profile: p.profile ?? {} };
  return {
    settings: settings ? JSON.stringify(settings) : null,
    program: p.program,
    theme: p.preferences.theme ?? null,
    blockEnabled: p.preferences.blockEnabled === undefined ? null : p.preferences.blockEnabled ? "1" : "0",
    onboarding: p.onboarding ? JSON.stringify(p.onboarding) : null,
  };
}

/** Validasi satu bagian dari jaringan. `undefined` = ditolak. */
export function validatePart<K extends PartName>(name: K, data: unknown, base: AthleteProfile): PartData[K] | undefined {
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  switch (name) {
    case "profile":
      return (data === null ? null : obj(data) ? parseProfileSettings(data) : undefined) as PartData[K] | undefined;
    case "settings":
      return (data === null ? null : obj(data) ? pickSettings(parseSettings({ ...data, version: 1, profile: {} }, base)) : undefined) as PartData[K] | undefined;
    case "program":
      return (data === null || (typeof data === "string" && data.length <= MAX_PROGRAM_CHARS) ? data || null : undefined) as PartData[K] | undefined;
    case "preferences": {
      if (!obj(data)) return undefined;
      const out: PreferencesPart = {};
      if (data.theme === "light" || data.theme === "dark") out.theme = data.theme;
      if (typeof data.blockEnabled === "boolean") out.blockEnabled = data.blockEnabled;
      return out as PartData[K];
    }
    case "onboarding": {
      if (data === null) return null as PartData[K];
      const s = parseOnboardingState(data);
      return (s ?? undefined) as PartData[K] | undefined;
    }
    case "log":
      return (Array.isArray(data) && data.length <= MAX_LOG_ENTRIES ? normalizeLog(data).entries : undefined) as PartData[K] | undefined;
    case "prs":
      return (Array.isArray(data) && data.length <= MAX_PRS ? normalizePrs(data) : undefined) as PartData[K] | undefined;
    default:
      return undefined;
  }
}

/** Nilai kosong per bagian (server belum pernah menerima bagian ini). */
export function emptyPart<K extends PartName>(name: K): PartData[K] {
  return (name === "log" || name === "prs" ? [] : name === "preferences" ? {} : null) as PartData[K];
}

/** Bagian ini berisi data (bukan kosong)? */
export function hasData(name: PartName, data: unknown): boolean {
  if (data === null || data === undefined) return false;
  if (name === "log" || name === "prs") return Array.isArray(data) && data.length > 0;
  if (name === "preferences") return Object.keys(data as object).length > 0;
  return true;
}
