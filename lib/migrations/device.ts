/**
 * Migrasi data perangkat (1.0). Bagian murni (`deviceToParts`, `partsToDevice`, `migrateDevice`) diuji tanpa
 * browser; `ensureDeviceMigrated` menjalankannya sekali per halaman sebelum penyimpanan lain membaca localStorage.
 *
 * Sebelum menulis apa pun, isi mentah semua kunci data disimpan ke `hybrid-athlete.pre-migration`
 * (`{ from, to, at, raw }`, satu yang terbaru, tidak disinkron). Bila menulis gagal, versi tidak dinaikkan,
 * jadi migrasi dicoba lagi saat halaman berikutnya dibuka; snapshot tetap ada.
 */
import { parseSettings } from "@/lib/athlete-settings";
import { todayWib } from "@/lib/date";
import { PREF_KEYS } from "@/lib/preference-keys";
import { baseProfile, type AthleteProfile } from "@/lib/profile";
import { DATA_SCHEMA_VERSION, migrate, parseSchemaVersion, type DataParts, type MigrationContext } from "./schema";

export const SCHEMA_KEY = "hybrid-athlete.schema";
export const PRE_MIGRATION_KEY = "hybrid-athlete.pre-migration";

/** Kunci localStorage yang dimigrasi (sama dengan data sinkron). */
export const DEVICE_DATA_KEYS = {
  settings: PREF_KEYS.settings,
  program: PREF_KEYS.program,
  theme: PREF_KEYS.theme,
  blockEnabled: PREF_KEYS.blockEnabled,
  onboarding: PREF_KEYS.onboarding,
  log: PREF_KEYS.log,
  prs: PREF_KEYS.prs,
  sessions: PREF_KEYS.sessions,
  checkins: PREF_KEYS.checkins,
} as const;
type DeviceField = keyof typeof DEVICE_DATA_KEYS;

/** Isi mentah localStorage; null = kunci tidak ada. */
export type DeviceRaw = Record<DeviceField, string | null>;

export interface PreMigrationSnapshot {
  from: number;
  to: number;
  /** ISO. */
  at: string;
  raw: Partial<DeviceRaw>;
}

const json = (s: string | null): unknown => {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const LIST_FIELDS = ["log", "prs", "sessions", "checkins"] as const;

/** localStorage → bagian data. Nilai rusak tidak dibawa (dan karena itu tidak pernah ditimpa). */
export function deviceToParts(raw: DeviceRaw): DataParts {
  const out: DataParts = {};
  const settings = json(raw.settings);
  if (isObj(settings)) {
    const { profile, version: _v, ...rest } = settings;
    out.profile = isObj(profile) ? profile : {};
    out.settings = rest;
  }
  if (raw.program) out.program = raw.program;
  const onboarding = json(raw.onboarding);
  if (isObj(onboarding)) out.onboarding = onboarding;
  for (const f of LIST_FIELDS) {
    const v = json(raw[f]);
    if (Array.isArray(v)) out[f] = v;
  }
  return out;
}

/** Bagian hasil migrasi → nilai localStorage, hanya untuk kunci yang dibaca `deviceToParts`. Tema & blok tidak disentuh. */
export function partsToDevice(parts: DataParts, raw: DeviceRaw, base: AthleteProfile): Partial<DeviceRaw> {
  const out: Partial<DeviceRaw> = {};
  if ("settings" in parts) {
    out.settings = JSON.stringify(parseSettings({ ...(isObj(parts.settings) ? parts.settings : {}), version: 1, profile: isObj(parts.profile) ? parts.profile : {} }, base));
  }
  if ("program" in parts && typeof parts.program === "string") out.program = parts.program;
  if ("onboarding" in parts && isObj(parts.onboarding)) out.onboarding = JSON.stringify(parts.onboarding);
  for (const f of LIST_FIELDS) if (Array.isArray(parts[f])) out[f] = JSON.stringify(parts[f]);
  // Hanya kunci yang benar-benar berubah yang ditulis.
  for (const k of Object.keys(out) as DeviceField[]) if (out[k] === raw[k]) delete out[k];
  return out;
}

export type DeviceMigration =
  | { kind: "current" }
  | { kind: "newer"; version: number }
  | { kind: "migrate"; from: number; to: number; writes: Partial<DeviceRaw>; snapshot: PreMigrationSnapshot | null; applied: string[] };

/** Rencana migrasi perangkat (murni). Snapshot hanya dibuat bila ada data dan ada yang berubah. */
export function migrateDevice(raw: DeviceRaw, storedVersion: string | null, ctx: MigrationContext, nowIso: string): DeviceMigration {
  const from = parseSchemaVersion(storedVersion);
  if (from === DATA_SCHEMA_VERSION) return { kind: "current" };
  if (from > DATA_SCHEMA_VERSION) return { kind: "newer", version: from };
  const r = migrate(deviceToParts(raw), from, ctx);
  const writes = partsToDevice(r.parts, raw, ctx.base);
  const present = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null)) as Partial<DeviceRaw>;
  const snapshot = Object.keys(writes).length ? { from, to: r.to, at: nowIso, raw: present } : null;
  return { kind: "migrate", from, to: r.to, writes, snapshot, applied: r.applied };
}

/** Snapshot pra-migrasi dari localStorage; rusak → null. */
export function parsePreMigration(s: string | null): PreMigrationSnapshot | null {
  const v = json(s);
  if (!isObj(v) || !isObj(v.raw) || typeof v.at !== "string") return null;
  return { from: parseSchemaVersion(v.from), to: parseSchemaVersion(v.to), at: v.at, raw: v.raw as Partial<DeviceRaw> };
}

let done = false;

/**
 * Jalankan migrasi perangkat sekali per halaman (browser saja). Dipanggil oleh semua pembaca localStorage
 * data (`readStored`, penyimpanan log/PR/sesi/check-in) sebelum membaca. Tidak memicu sinkron: server
 * memigrasi datanya sendiri dan parser sinkron sudah menerima bentuk lama.
 */
export function ensureDeviceMigrated(): void {
  if (done || typeof window === "undefined") return;
  done = true;
  try {
    const raw = Object.fromEntries(Object.entries(DEVICE_DATA_KEYS).map(([f, k]) => [f, localStorage.getItem(k)])) as DeviceRaw;
    const plan = migrateDevice(raw, localStorage.getItem(SCHEMA_KEY), { base: baseProfile, today: todayWib() }, new Date().toISOString());
    if (plan.kind !== "migrate") return;
    if (plan.snapshot) localStorage.setItem(PRE_MIGRATION_KEY, JSON.stringify(plan.snapshot));
    for (const [f, v] of Object.entries(plan.writes) as [DeviceField, string | null][]) {
      if (v === null) localStorage.removeItem(DEVICE_DATA_KEYS[f]);
      else localStorage.setItem(DEVICE_DATA_KEYS[f], v);
    }
    localStorage.setItem(SCHEMA_KEY, String(plan.to));
  } catch {
    // Penyimpanan penuh/diblokir: data tetap dalam bentuk lama (parser menerimanya); dicoba lagi lain kali.
  }
}

/** Untuk test. */
export const resetDeviceMigrationForTest = () => {
  done = false;
};

/**
 * Snapshot pra-migrasi → file cadangan v7 yang bisa diimpor lewat Setting › Data & cadangan. `schema` = versi
 * lama, jadi impor menjalankan migrasi yang sama lagi (idempoten). Bagian yang rusak dikosongkan.
 */
export function preMigrationBackup(s: PreMigrationSnapshot): Record<string, unknown> {
  const list = (v: string | null | undefined) => {
    const x = json(v ?? null);
    return Array.isArray(x) ? x : [];
  };
  const settings = json(s.raw.settings ?? null);
  const onboarding = json(s.raw.onboarding ?? null);
  const theme = s.raw.theme;
  return {
    app: "hybrid-athlete",
    version: 7,
    schema: s.from,
    kind: "backup",
    exportedAt: s.at,
    log: list(s.raw.log),
    settings: isObj(settings) ? settings : null,
    program: s.raw.program ?? null,
    preferences: {
      ...(theme === "light" || theme === "dark" ? { theme } : {}),
      ...(s.raw.blockEnabled === "1" || s.raw.blockEnabled === "0" ? { blockEnabled: s.raw.blockEnabled === "1" } : {}),
    },
    onboarding: isObj(onboarding) ? onboarding : null,
    prs: list(s.raw.prs),
    sessions: list(s.raw.sessions),
    checkins: list(s.raw.checkins),
  };
}
