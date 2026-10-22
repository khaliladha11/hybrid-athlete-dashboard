/**
 * Cadangan data perangkat (murni; penyimpanan disuntikkan lewat `BackupStore`).
 *
 * Format:
 * - v1: array log saja.
 * - v2: `{ log, settings, program, preferences }`.
 * - v3: v2 + profil dasar di `settings.profile` + `onboarding`, dan `kind`:
 *   - `"backup"` (ekspor biasa): bagian yang ada di file **menimpa** perangkat.
 *   - `"defaults"` (mis. `owner-settings.local.json` hasil migrasi): hanya **mengisi yang masih
 *     kosong** di perangkat; kustomisasi yang sudah ada tidak ditimpa.
 *
 * Log selalu digabung (`mergeLog`), tidak pernah dihapus: file tanpa log tidak menyentuh log.
 */
import { parseProfileSettings, parseSettings, type AthleteSettings } from "./athlete-settings";
import { parseOnboardingState, type OnboardingState } from "./onboarding";
import type { AthleteProfile } from "./profile";
import { ZONE_KEYS } from "./run-zones";

export const BACKUP_APP = "hybrid-athlete";
export const BACKUP_VERSION = 3;

export type ThemeValue = "system" | "light" | "dark";
export type BackupKind = "backup" | "defaults";

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  kind: BackupKind;
  exportedAt: string;
  log: unknown[];
  settings: AthleteSettings | null;
  program: string | null;
  preferences: { theme?: ThemeValue; blockEnabled?: boolean };
  onboarding: OnboardingState | null;
}

/** Isi file cadangan yang sudah dibaca; bagian yang tidak ada = undefined. */
export interface ParsedBackup {
  version: 1 | 2 | 3;
  kind: BackupKind;
  log?: unknown[];
  /** Objek mentah: dipakai untuk tahu field mana yang benar-benar ada di file. */
  settings?: Record<string, unknown>;
  program?: string;
  theme?: ThemeValue;
  blockEnabled?: boolean;
  onboarding?: OnboardingState;
}

/** Akses ke penyimpanan perangkat. Nilai string kosong = belum pernah disimpan. */
export interface BackupStore {
  getSettingsRaw(): string;
  setSettingsRaw(v: string): void;
  getProgramRaw(): string;
  setProgramRaw(v: string): void;
  getThemeRaw(): string;
  setTheme(v: ThemeValue): void;
  getBlockRaw(): string;
  setBlockEnabled(v: boolean): void;
  setOnboarding(v: OnboardingState): void;
  mergeLog(entries: unknown[]): { added: number; skipped: number };
}

const isTheme = (v: unknown): v is ThemeValue => v === "system" || v === "light" || v === "dark";

export function buildBackup(input: {
  log: unknown[];
  settings: AthleteSettings | null;
  program: string | null;
  theme?: ThemeValue;
  blockEnabled?: boolean;
  onboarding: OnboardingState | null;
  now: string;
}): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    kind: "backup",
    exportedAt: input.now,
    log: input.log,
    settings: input.settings,
    program: input.program,
    preferences: { theme: input.theme, blockEnabled: input.blockEnabled },
    onboarding: input.onboarding,
  };
}

/** File JSON (sudah di-parse) → isi cadangan, atau null bila tidak dikenali. */
export function parseBackup(data: unknown): ParsedBackup | null {
  if (Array.isArray(data)) return { version: 1, kind: "backup", log: data };
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const version = d.version === 3 ? 3 : 2;
  const out: ParsedBackup = { version, kind: version === 3 && d.kind === "defaults" ? "defaults" : "backup" };
  if (Array.isArray(d.log)) out.log = d.log;
  if (d.settings && typeof d.settings === "object" && !Array.isArray(d.settings)) out.settings = d.settings as Record<string, unknown>;
  if (typeof d.program === "string") out.program = d.program;
  const prefs = d.preferences && typeof d.preferences === "object" ? (d.preferences as Record<string, unknown>) : {};
  if (isTheme(prefs.theme)) out.theme = prefs.theme;
  if (typeof prefs.blockEnabled === "boolean") out.blockEnabled = prefs.blockEnabled;
  const ob = parseOnboardingState(d.onboarding);
  if (ob) out.onboarding = ob;
  const known = out.log || out.settings || out.program !== undefined || out.theme || out.blockEnabled !== undefined || out.onboarding;
  return known ? out : null;
}

/** Gabungkan pengaturan "defaults": isi hanya yang kosong di perangkat. */
export function fillSettings(current: AthleteSettings, fileRaw: Record<string, unknown>, deviceHadSettings: boolean, base: AthleteProfile): AthleteSettings {
  const file = parseSettings(fileRaw, base);
  const next: AthleteSettings = { ...current, profile: { ...current.profile }, runZones: { ...current.runZones }, movements: { ...current.movements } };
  const fileProfile = parseProfileSettings(fileRaw.profile);
  for (const k of Object.keys(fileProfile) as (keyof typeof fileProfile)[]) {
    if (next.profile[k] === undefined) (next.profile as Record<string, unknown>)[k] = fileProfile[k];
  }
  for (const k of ZONE_KEYS) if (!next.runZones[k] && file.runZones[k]) next.runZones[k] = file.runZones[k];
  for (const [name, on] of Object.entries(file.movements)) if (!(name in next.movements)) next.movements[name] = on;
  if (!deviceHadSettings) {
    if ("conditions" in fileRaw) next.conditions = file.conditions;
    if ("customConditions" in fileRaw) next.customConditions = file.customConditions;
    if ("equipment" in fileRaw) next.equipment = file.equipment;
  }
  return next;
}

/** Terapkan cadangan ke perangkat. Mengembalikan ringkasan untuk ditampilkan. */
export function applyBackup(b: ParsedBackup, store: BackupStore, base: AthleteProfile): string[] {
  const parts: string[] = [];
  if (b.log) {
    const r = store.mergeLog(b.log);
    parts.push(`${r.added} entri log baru, ${r.skipped} dilewati`);
  }
  const fill = b.kind === "defaults";
  if (b.settings) {
    const raw = store.getSettingsRaw();
    if (fill) {
      const current = parseSettings(raw, base);
      store.setSettingsRaw(JSON.stringify(fillSettings(current, b.settings, Boolean(raw), base)));
      parts.push("profil & pengaturan yang masih kosong diisi");
    } else {
      store.setSettingsRaw(JSON.stringify(parseSettings(b.settings, base)));
      parts.push("pengaturan atlet dipulihkan");
    }
  }
  if (b.program !== undefined && (!fill || !store.getProgramRaw())) {
    store.setProgramRaw(b.program);
    parts.push("program target dipulihkan");
  }
  if (b.theme && (!fill || !store.getThemeRaw())) store.setTheme(b.theme);
  if (b.blockEnabled !== undefined && (!fill || !store.getBlockRaw())) store.setBlockEnabled(b.blockEnabled);
  if (b.onboarding && !fill) store.setOnboarding(b.onboarding);
  return parts;
}
