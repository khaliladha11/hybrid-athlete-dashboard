/**
 * Pengaturan atlet yang bisa diubah di halaman Setting (murni, tanpa I/O).
 *
 * `config/athlete-profile.json` = nilai default. Pengaturan pengguna disimpan
 * di perangkat (localStorage) dan digabung dengan default lewat `resolveProfile`
 * menjadi profil efektif yang dipakai semua generator & validator.
 */
import { combineRules, CONDITION_IDS, CONDITIONS, isConditionId, type ActiveRules, type ConditionId } from "./conditions";
import {
  BAND_OPTIONAL,
  feasibleLoads,
  missingNeeds,
  NEED_LABEL,
  normalizeEquipment,
  ownedBands,
  type Equipment,
} from "./equipment";
import { STABILITY_HIP } from "./generator/meta";
import { formatRange, parseRange, ZONE_KEYS, type ZoneKey } from "./run-zones";
import type { AthleteProfile, Movement, MovementCategory, MovementLibrary } from "./profile";

export const MOVEMENT_CATEGORIES: MovementCategory[] = ["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"];

/**
 * Profil dasar yang diisi di perangkat (Setting › Profil / onboarding). Field yang ada menimpa
 * JSON; field yang tidak ada ikut JSON (yang sejak 0.11 netral).
 */
export interface ProfileSettings {
  name?: string;
  age?: number;
  /** Gaya hidup, mis. "Kerja kantoran". */
  occupation?: string;
  /** Fokus latihan, mis. "Lari 10K + strength di rumah". */
  category?: string;
  goals?: string[];
  /** Format yang dibaca `goalFromProfile`: "Sub-30m 5K", "Sub-1h 10K", "Sub-2.5h Half Marathon". */
  raceTargets?: string[];
  /** Senin awal blok (YYYY-MM-DD). */
  blockStart?: string;
}

export interface AthleteSettings {
  version: 1;
  profile: ProfileSettings;
  /** Kondisi aktif dari katalog. */
  conditions: ConditionId[];
  /** Catatan kondisi bebas — tampil saja, tidak mengubah generator. */
  customConditions: string[];
  /** Pace per zona ("6:15–6:30/km"); kosong = pakai profil. */
  runZones: Partial<Record<ZoneKey, string>>;
  equipment: Equipment;
  /** Pilihan gerakan; kunci yang tidak ada = default (available di profil). */
  movements: Record<string, boolean>;
}

/** Status gerakan setelah pilihan, alat, dan kondisi diterapkan. */
export interface MovementStatus {
  available: boolean;
  /** Alasan tidak tersedia (untuk Setting). */
  reason?: string;
  loads?: number[];
}

export interface ResolvedProfile extends AthleteProfile {
  activeConditions: ConditionId[];
  customConditions: string[];
  rules: ActiveRules;
  equipmentModel: Equipment;
  movementStatus: Record<string, MovementStatus>;
  /** Aturan kondisi yang tidak bisa dipenuhi karena gerakannya tidak tersedia. */
  warnings: string[];
}

const FALLBACK_EQUIPMENT: Equipment = {
  dumbbell: { enabled: true, handles: 2 },
  barbell: { enabled: true },
  plates: [],
  bands: ["Light", "Medium"],
  pullUpBar: true,
  bench: true,
  bandAnchor: true,
  other: [],
};

export function defaultSettings(base: AthleteProfile): AthleteSettings {
  return {
    version: 1,
    profile: {},
    conditions: (base.conditions ?? []).filter(isConditionId),
    customConditions: [],
    runZones: {},
    equipment: normalizeEquipment(base.equipment, FALLBACK_EQUIPMENT),
    movements: {},
  };
}

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const texts = (v: unknown, max: number, count: number) =>
  Array.isArray(v) ? v.map((x) => text(x, max)).filter((x): x is string => !!x).slice(0, count) : undefined;

/** Profil dasar dari localStorage/impor; field rusak dibuang. */
export function parseProfileSettings(x: unknown): ProfileSettings {
  if (!x || typeof x !== "object") return {};
  const r = x as Record<string, unknown>;
  const out: ProfileSettings = {};
  const name = text(r.name, 60);
  if (name) out.name = name;
  if (typeof r.age === "number" && Number.isInteger(r.age) && r.age >= 10 && r.age <= 100) out.age = r.age;
  const occupation = text(r.occupation, 80);
  if (occupation) out.occupation = occupation;
  const category = text(r.category, 80);
  if (category) out.category = category;
  const goals = texts(r.goals, 80, 5);
  if (goals) out.goals = goals;
  const raceTargets = texts(r.raceTargets, 40, 4);
  if (raceTargets) out.raceTargets = raceTargets;
  if (typeof r.blockStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.blockStart) && !Number.isNaN(Date.parse(r.blockStart))) {
    out.blockStart = r.blockStart;
  }
  return out;
}

/** Pengaturan dari localStorage/impor → selalu valid; bagian rusak diganti default. */
export function parseSettings(raw: unknown, base: AthleteProfile): AthleteSettings {
  const d = defaultSettings(base);
  let x: unknown = raw;
  if (typeof raw === "string") {
    if (!raw) return d;
    try {
      x = JSON.parse(raw);
    } catch {
      return d;
    }
  }
  if (!x || typeof x !== "object") return d;
  const s = x as Record<string, unknown>;
  const zones: Partial<Record<ZoneKey, string>> = {};
  if (s.runZones && typeof s.runZones === "object") {
    for (const k of ZONE_KEYS) {
      const r = parseRange((s.runZones as Record<string, unknown>)[k] as string | undefined);
      if (r) zones[k] = formatRange(r);
    }
  }
  const movements: Record<string, boolean> = {};
  if (s.movements && typeof s.movements === "object") {
    for (const [k, v] of Object.entries(s.movements as Record<string, unknown>)) if (typeof v === "boolean") movements[k] = v;
  }
  return {
    version: 1,
    profile: parseProfileSettings(s.profile),
    conditions: Array.isArray(s.conditions) ? CONDITION_IDS.filter((id) => (s.conditions as unknown[]).includes(id)) : d.conditions,
    customConditions: Array.isArray(s.customConditions)
      ? s.customConditions.filter((c): c is string => typeof c === "string" && !!c.trim()).map((c) => c.trim().slice(0, 120)).slice(0, 20)
      : [],
    runZones: zones,
    equipment: normalizeEquipment(s.equipment, d.equipment),
    movements,
  };
}

/** Pilihan default gerakan (dari profil) — dipakai saat pengguna belum memilih. */
export function defaultSelected(m: Movement): boolean {
  return m.available !== false;
}

export function resolveProfile(base: AthleteProfile, s: AthleteSettings): ResolvedProfile {
  const rules = combineRules(s.conditions);
  const eq = s.equipment;
  const movementStatus: Record<string, MovementStatus> = {};
  const excludedBy = (name: string) => s.conditions.filter((id) => CONDITIONS[id].rules.exclude?.includes(name));

  const resolveMovement = (m: Movement): Movement => {
    // Gerakan yang diwajibkan kondisi aktif selalu terpilih.
    const selected = rules.requiredLower.includes(m.name) || (s.movements[m.name] ?? defaultSelected(m));
    const missing = missingNeeds(m.name, eq);
    const excl = excludedBy(m.name);
    let weight = m.weight;
    let reason: string | undefined;
    let loads: number[] | undefined;

    if (!selected) reason = "Tidak dipilih";
    else if (excl.length) reason = `Dihindari: ${excl.map((id) => CONDITIONS[id].label).join(", ")}`;
    else if (missing.length) reason = `Butuh ${missing.map((n) => NEED_LABEL[n]).join(" + ")}`;
    else {
      const bands = ownedBands(m.weight, eq);
      if (bands && !bands.length) {
        if (BAND_OPTIONAL.has(m.name)) weight = "Bodyweight";
        else reason = `Butuh band ${m.weight.replace(/band/i, "").trim()}`;
      } else if (bands) {
        weight = `${bands.join("/")} Band`;
      }
      loads = feasibleLoads(m.name, m.weight, eq);
      if (loads && !loads.length) reason = `Beban ${m.weight} tidak bisa dirakit dari alat`;
    }
    movementStatus[m.name] = { available: !reason, reason, loads: reason ? undefined : loads };
    return { ...m, weight, available: !reason, ...(loads && !reason ? { loads } : {}) };
  };

  const lib = {} as MovementLibrary;
  for (const c of MOVEMENT_CATEGORIES) lib[c] = (base.movementLibrary[c] ?? []).map(resolveMovement);
  lib.warmupAndCooldown = (base.movementLibrary.warmupAndCooldown ?? []).filter((n) => !missingNeeds(n, eq).length);

  const runZones: AthleteProfile["runZones"] = { ...(base.runZones ?? {}) };
  for (const k of ZONE_KEYS) {
    const pace = s.runZones[k];
    if (pace) runZones[k] = { ...(runZones[k] ?? {}), pace };
  }

  const usable = (name: string) => movementStatus[name]?.available === true;
  const warnings: string[] = [];
  for (const req of rules.requiredLower) {
    if (!usable(req)) warnings.push(`${req} wajib untuk kondisi aktif, tetapi tidak tersedia (${movementStatus[req]?.reason ?? "tidak ada di library"}).`);
  }
  if (rules.hipStability && !STABILITY_HIP.some(usable)) {
    warnings.push(`Kondisi aktif butuh stabilitas panggul, tetapi ${STABILITY_HIP.join(", ")} tidak tersedia.`);
  }

  const pr = s.profile ?? {};
  return {
    ...base,
    name: pr.name ?? base.name,
    age: pr.age ?? base.age,
    occupation: pr.occupation ?? base.occupation,
    category: pr.category ?? base.category,
    targets: { goals: pr.goals ?? base.targets?.goals ?? [], raceTargets: pr.raceTargets ?? base.targets?.raceTargets ?? [] },
    training: { ...base.training, blockStart: pr.blockStart ?? base.training?.blockStart },
    conditions: s.conditions,
    runZones,
    movementLibrary: lib,
    activeConditions: s.conditions,
    customConditions: s.customConditions,
    rules,
    equipmentModel: eq,
    movementStatus,
    warnings,
  };
}

// ---------- Target lomba ----------

export type RaceKey = "5k" | "10k" | "hm" | "fm";
export const RACE_LABEL: Record<RaceKey, string> = { "5k": "5K", "10k": "10K", hm: "Half Marathon", fm: "Full Marathon" };

/** Detik → teks target yang bisa dibaca `goalFromProfile` ("Sub-28.5m 5K", "Sub-2h Half Marathon"). */
export function formatRaceTarget(race: RaceKey, seconds: number): string {
  const sec = Math.max(1, Math.round(seconds));
  const time = sec % 3600 === 0 ? `${sec / 3600}h` : `${Math.round((sec / 60) * 100) / 100}m`;
  return `Sub-${time} ${RACE_LABEL[race]}`;
}

/** Kebalikan `formatRaceTarget`; teks bebas lama yang tidak dikenali → undefined. */
export function parseRaceTarget(textValue: string): { race: RaceKey; seconds: number } | undefined {
  const m = textValue.match(/sub[-\s]?(\d+(?:[.,]\d+)?)\s*(h|m)\b/i);
  if (!m) return undefined;
  const race: RaceKey | undefined = /\b5K\b/i.test(textValue)
    ? "5k"
    : /\b10K\b/i.test(textValue)
      ? "10k"
      : /half/i.test(textValue)
        ? "hm"
        : /\bfull\b|\bFM\b|\b42K\b/i.test(textValue)
          ? "fm"
          : undefined;
  if (!race) return undefined;
  const v = Number(m[1].replace(",", "."));
  return { race, seconds: Math.round(m[2].toLowerCase() === "h" ? v * 3600 : v * 60) };
}
