import rawProfile from "@/config/athlete-profile.json";

export interface Movement {
  name: string;
  weight: string;
  /** false = tercatat di library tapi belum dipakai generator (mis. belum mampu). Default true. */
  available?: boolean;
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
  conditions?: string[];
  equipment?: string[];
  /** Blok periodisasi: `blockWeeks` minggu, minggu terakhir = deload. */
  training?: { blockStart?: string; blockWeeks?: number };
  runZones?: Record<string, Record<string, string | number>>;
  movementLibrary: MovementLibrary;
}

export const profile: AthleteProfile = rawProfile as AthleteProfile;

/** Batas beban hasil parsing string "weight" di movement library. */
export type WeightSpec =
  | { kind: "load"; min: number; max: number; unit: "kg"; perHand: boolean }
  | { kind: "bodyweight" }
  | { kind: "band"; options: string[] };

export function parseWeight(weight: string): WeightSpec {
  const w = weight.trim();
  if (/band/i.test(w)) {
    const options = w
      .replace(/band/i, "")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    return { kind: "band", options: options.length ? options : ["Light"] };
  }
  const nums = w.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || /bodyweight/i.test(w)) return { kind: "bodyweight" };
  const values = nums.map((n) => Number(n.replace(",", ".")));
  return {
    kind: "load",
    min: Math.min(...values),
    max: Math.max(...values),
    unit: "kg",
    perHand: /tangan/i.test(w),
  };
}

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
