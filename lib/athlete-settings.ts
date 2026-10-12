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

export interface AthleteSettings {
  version: 1;
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
    conditions: (base.conditions ?? []).filter(isConditionId),
    customConditions: [],
    runZones: {},
    equipment: normalizeEquipment(base.equipment, FALLBACK_EQUIPMENT),
    movements: {},
  };
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

  return {
    ...base,
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
