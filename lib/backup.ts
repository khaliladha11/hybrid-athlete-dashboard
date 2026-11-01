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
 * - v4 (0.14.0): v3 + `prs` (PR kemampuan).
 * - v5 (0.14.1): v4 + `sessions` (sesi ST mode latihan).
 * - v6 (0.15.2): v5 + `checkins` (check-in harian).
 * - v7 (1.0.0-rc.1): v6 + `schema` (versi skema data, `lib/migrations/schema.ts`).
 *
 * Impor (1.0): file dinaikkan berurutan v1 → v2 → … → v7 (`upgradeBackup`, satu langkah per versi), lalu isinya
 * dimigrasi dengan migrasi yang sama seperti perangkat dan server. File dengan `schema` lebih tinggi dari aplikasi
 * ini ditolak (`backupIsNewer`), tidak pernah diimpor sebagian.
 *
 * Log, PR, sesi, dan check-in selalu digabung (`mergeLog`, `mergePrs`, `mergeSessions`, `mergeCheckins`), tidak pernah dihapus: file tanpa
 * bagian itu tidak menyentuhnya.
 */
import { mergeRaceResults, parseProfileSettings, parseSettings, type AthleteSettings } from "./athlete-settings";
import { parseOnboardingState, type OnboardingState } from "./onboarding";
import { baseProfile, type AthleteProfile } from "./profile";
import { todayWib } from "./date";
import { DATA_SCHEMA_VERSION, migrate, parseSchemaVersion, type DataParts } from "./migrations/schema";
import { ZONE_KEYS } from "./run-zones";

export const BACKUP_APP = "hybrid-athlete";
export const BACKUP_VERSION = 7;

export type ThemeValue = "system" | "light" | "dark";
export type BackupKind = "backup" | "defaults";

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  /** Versi skema data saat ekspor (v7). */
  schema: number;
  kind: BackupKind;
  exportedAt: string;
  log: unknown[];
  settings: AthleteSettings | null;
  program: string | null;
  preferences: { theme?: ThemeValue; blockEnabled?: boolean };
  onboarding: OnboardingState | null;
  prs: unknown[];
  sessions: unknown[];
  checkins: unknown[];
}

/** Isi file cadangan yang sudah dibaca; bagian yang tidak ada = undefined. */
export interface ParsedBackup {
  /** Versi file asli (sebelum dinaikkan). */
  version: BackupFileVersion;
  kind: BackupKind;
  log?: unknown[];
  /** Objek mentah: dipakai untuk tahu field mana yang benar-benar ada di file. */
  settings?: Record<string, unknown>;
  program?: string;
  theme?: ThemeValue;
  blockEnabled?: boolean;
  onboarding?: OnboardingState;
  prs?: unknown[];
  sessions?: unknown[];
  checkins?: unknown[];
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
  mergePrs(entries: unknown[]): { added: number; skipped: number };
  mergeSessions(entries: unknown[]): { added: number; skipped: number };
  mergeCheckins(entries: unknown[]): { added: number; skipped: number };
}

const isTheme = (v: unknown): v is ThemeValue => v === "system" || v === "light" || v === "dark";

export function buildBackup(input: {
  log: unknown[];
  settings: AthleteSettings | null;
  program: string | null;
  theme?: ThemeValue;
  blockEnabled?: boolean;
  onboarding: OnboardingState | null;
  prs?: unknown[];
  sessions?: unknown[];
  checkins?: unknown[];
  now: string;
}): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    schema: DATA_SCHEMA_VERSION,
    kind: "backup",
    exportedAt: input.now,
    log: input.log,
    settings: input.settings,
    program: input.program,
    preferences: { theme: input.theme, blockEnabled: input.blockEnabled },
    onboarding: input.onboarding,
    prs: input.prs ?? [],
    sessions: input.sessions ?? [],
    checkins: input.checkins ?? [],
  };
}

export type BackupFileVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Doc = Record<string, unknown>;

/** Langkah naik versi file, berurutan. Setiap langkah hanya mengubah yang berbeda antara dua versi. */
const UPGRADES: Record<Exclude<BackupFileVersion, 7>, (d: Doc) => Doc> = {
  // v1: array log saja.
  1: (d) => ({ version: 2, log: d.log }),
  // v3 menambah `kind` dan `onboarding`; v2 selalu cadangan biasa tanpa onboarding.
  2: ({ kind: _k, onboarding: _o, ...d }) => ({ ...d, version: 3, kind: "backup" }),
  // `prs` baru ada sejak v4, `sessions` sejak v5, `checkins` sejak v6: field itu di file lama tidak dipercaya.
  3: ({ prs: _p, ...d }) => ({ ...d, version: 4 }),
  4: ({ sessions: _s, ...d }) => ({ ...d, version: 5 }),
  5: ({ checkins: _c, ...d }) => ({ ...d, version: 6 }),
  // v6 dan sebelumnya = data sebelum 1.0 (skema 0).
  6: (d) => ({ ...d, version: 7, schema: 0 }),
};

const fileVersion = (data: unknown): BackupFileVersion | null => {
  if (Array.isArray(data)) return 1;
  if (!data || typeof data !== "object") return null;
  const v = (data as Doc).version;
  return v === 7 || v === 6 || v === 5 || v === 4 || v === 3 ? v : 2;
};

/** File apa pun (v1–v7) → bentuk v7. */
export function upgradeBackup(data: unknown): Doc | null {
  const from = fileVersion(data);
  if (from === null) return null;
  let d: Doc = from === 1 ? { log: data } : { ...(data as Doc) };
  for (let v = from; v < 7; v++) d = UPGRADES[v as Exclude<BackupFileVersion, 7>](d);
  return d;
}

/** File dari versi aplikasi yang lebih baru (skema lebih tinggi)? Diperiksa sebelum `parseBackup`. */
export const backupIsNewer = (data: unknown) => fileVersion(data) === 7 && parseSchemaVersion((data as Doc).schema) > DATA_SCHEMA_VERSION;

const isDoc = (v: unknown): v is Doc => !!v && typeof v === "object" && !Array.isArray(v);

/** Isi file v7 → migrasi skema. Setting tetap hanya berisi kunci yang ada di file (penting untuk kind "defaults"). */
function migrateDoc(d: Doc, today: string, base: AthleteProfile): Doc {
  const parts: DataParts = {};
  for (const k of ["log", "prs", "sessions", "checkins"] as const) if (Array.isArray(d[k])) parts[k] = d[k];
  if (typeof d.program === "string") parts.program = d.program;
  if (isDoc(d.onboarding)) parts.onboarding = d.onboarding;
  const settings = isDoc(d.settings) ? d.settings : undefined;
  if (settings) {
    const { profile, ...rest } = settings;
    parts.settings = rest;
    if (isDoc(profile)) parts.profile = profile;
  }
  const r = migrate(parts, parseSchemaVersion(d.schema), { base, today });
  const out: Doc = { ...d, ...r.parts };
  delete out.profile;
  if (settings) {
    const migrated = isDoc(r.parts.settings) ? r.parts.settings : {};
    const kept = Object.fromEntries(Object.keys(settings).filter((k) => k !== "profile" && k in migrated).map((k) => [k, migrated[k]]));
    out.settings = { ...kept, ...("profile" in settings ? { profile: isDoc(r.parts.profile) ? r.parts.profile : settings.profile } : {}) };
  }
  return out;
}

/** File JSON (sudah di-parse) → isi cadangan, atau null bila tidak dikenali atau berasal dari versi yang lebih baru. */
export function parseBackup(data: unknown, base: AthleteProfile = baseProfile, today = todayWib()): ParsedBackup | null {
  const version = fileVersion(data);
  if (version === null || backupIsNewer(data)) return null;
  const d = migrateDoc(upgradeBackup(data)!, today, base);
  const out: ParsedBackup = { version, kind: d.kind === "defaults" ? "defaults" : "backup" };
  if (Array.isArray(d.log)) out.log = d.log;
  if (Array.isArray(d.prs)) out.prs = d.prs;
  if (Array.isArray(d.sessions)) out.sessions = d.sessions;
  if (Array.isArray(d.checkins)) out.checkins = d.checkins;
  if (isDoc(d.settings)) out.settings = d.settings;
  if (typeof d.program === "string") out.program = d.program;
  const prefs = d.preferences && typeof d.preferences === "object" ? (d.preferences as Record<string, unknown>) : {};
  if (isTheme(prefs.theme)) out.theme = prefs.theme;
  if (typeof prefs.blockEnabled === "boolean") out.blockEnabled = prefs.blockEnabled;
  const ob = parseOnboardingState(d.onboarding);
  if (ob) out.onboarding = ob;
  const known = out.log || out.prs || out.sessions || out.checkins || out.settings || out.program !== undefined || out.theme || out.blockEnabled !== undefined || out.onboarding;
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
  // Hasil lomba: gabungan; yang sudah ada di perangkat menang untuk jarak + tanggal yang sama.
  next.raceResults = mergeRaceResults(file.raceResults, current.raceResults);
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
  if (b.prs) {
    const r = store.mergePrs(b.prs);
    parts.push(`${r.added} PR baru, ${r.skipped} dilewati`);
  }
  if (b.sessions) {
    const r = store.mergeSessions(b.sessions);
    parts.push(`${r.added} sesi ST baru, ${r.skipped} dilewati`);
  }
  if (b.checkins) {
    const r = store.mergeCheckins(b.checkins);
    parts.push(`${r.added} check-in baru, ${r.skipped} dilewati`);
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
