import rawProfile from "@/config/athlete-profile.json";
import { defaultSettings, resolveProfile, type ResolvedProfile } from "./athlete-settings";
import { parseWeight, type WeightSpec } from "./weights";

export { parseWeight, type WeightSpec };
export type { ResolvedProfile };

export interface Movement {
  name: string;
  weight: string;
  /** false = tercatat di library tapi belum dipakai generator (mis. belum mampu). Default true. */
  available?: boolean;
  /**
   * Gerakan cadangan (mis. push-up tanpa alat): tanpa pilihan pengguna, otomatis dipilih hanya bila
   * kategorinya tidak punya gerakan non-cadangan yang bisa dipakai. Pilihan eksplisit di Setting tetap menang.
   */
  fallback?: boolean;
  /** Beban (kg) yang bisa dirakit dari alat, sudah dalam rentang library. Tidak ada = pakai rentang library. */
  loads?: number[];
}

export type MovementCategory =
  | "upperPush"
  | "upperPull"
  | "lower"
  | "stabilityAndCore"
  | "prehab";

export type MovementLibrary = Record<MovementCategory, Movement[]> & {
  warmupAndCooldown: string[];
};

export interface AthleteProfile {
  name: string;
  age?: number;
  occupation?: string;
  category?: string;
  targets?: { goals?: string[]; raceTargets?: string[] };
  /** Id kondisi aktif dari katalog `lib/conditions.ts`. */
  conditions?: string[];
  /** Alat (lihat `Equipment` di `lib/equipment.ts`). */
  equipment?: unknown;
  /** Blok periodisasi: `blockWeeks` minggu, minggu terakhir = deload. */
  training?: { blockStart?: string; blockWeeks?: number };
  runZones?: Record<string, Record<string, string | number>>;
  movementLibrary: MovementLibrary;
}

/** Profil mentah dari JSON = nilai default halaman Setting. */
export const baseProfile: AthleteProfile = rawProfile as AthleteProfile;

/** Profil efektif dengan pengaturan default (dipakai server & sebelum pengaturan perangkat terbaca). */
export const profile: ResolvedProfile = resolveProfile(baseProfile, defaultSettings(baseProfile));

/** Semua gerakan resmi (termasuk warm-up/cool-down) — dipakai untuk whitelist. */
export function allMovementNames(lib: MovementLibrary = profile.movementLibrary): Set<string> {
  const names = new Set<string>(lib.warmupAndCooldown);
  for (const cat of ["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const) {
    for (const m of lib[cat] ?? []) names.add(m.name);
  }
  return names;
}

export function findMovement(
  name: string,
  lib: MovementLibrary = profile.movementLibrary,
): Movement | undefined {
  for (const cat of ["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const) {
    const m = lib[cat]?.find((x) => x.name === name);
    if (m) return m;
  }
  return undefined;
}
