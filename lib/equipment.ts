/**
 * Alat yang dimiliki atlet → gerakan yang bisa dilakukan & beban yang bisa dirakit (murni).
 *
 * - Kebutuhan alat per gerakan mengikuti deskripsi teknik gerakan (NSCA Exercise
 *   Technique Manual for Resistance Training, 3rd ed., 2016): mis. Seated Overhead
 *   Press butuh dumbbell + kursi bersandaran, Clamshell/Lateral Band Walk butuh band.
 *   Dinding & lantai dianggap selalu ada.
 * - Beban hanya boleh dari kombinasi yang benar-benar bisa dirakit: plat dipasang
 *   berpasangan (satu di tiap sisi) supaya beban simetris; sepasang dumbbell butuh
 *   dua kali jumlah plat. Plat kecil juga bisa dipegang langsung (mis. 1,25 kg untuk
 *   face pull). Beban yang diresepkan tetap dibatasi rentang movement library.
 */
import { parseWeight } from "./weights";

export const BAND_LEVELS = ["Light", "Medium", "Heavy"] as const;
export type BandLevel = (typeof BAND_LEVELS)[number];

export interface Plate {
  kg: number;
  count: number;
}

export interface Equipment {
  dumbbell: { enabled: boolean; /** Berat handle kosong; kosong = beban tidak dicek ke alat. */ handleKg?: number; handles: number };
  barbell: { enabled: boolean; /** Berat batang kosong (termasuk handle/connector). */ barKg?: number };
  plates: Plate[];
  bands: BandLevel[];
  pullUpBar: boolean;
  /** Kursi / bench / step box. */
  bench: boolean;
  /** Alat lain (catatan; belum dipakai generator). */
  other: string[];
}

export type EquipmentNeed = "dumbbell" | "barbell" | "band" | "pullUpBar" | "bench";

export const NEED_LABEL: Record<EquipmentNeed, string> = {
  dumbbell: "dumbbell",
  barbell: "barbell",
  band: "resistance band",
  pullUpBar: "pull-up bar",
  bench: "kursi/bench/step box",
};

/** Alat yang dibutuhkan tiap gerakan library (selain dinding & lantai). */
export const MOVEMENT_EQUIPMENT: Record<string, EquipmentNeed[]> = {
  "Floor Press": ["dumbbell"],
  "Seated Overhead Press": ["dumbbell", "bench"],
  "Seated Lateral Raise": ["dumbbell", "bench"],
  "Overhead Triceps Extension": ["dumbbell"],
  "High-Incline Push-Up": ["bench"],
  "Dead Hang": ["pullUpBar"],
  "Negative Pull-Up": ["pullUpBar"],
  "DB Farmer's Hold": ["dumbbell"],
  "Seated DB Scapular Retraction": ["dumbbell", "bench"],
  "Supported Single-Arm Row": ["dumbbell", "bench"],
  "DB Floor Pullover": ["dumbbell"],
  "Seated Bent-Over DB Face Pull": ["dumbbell", "bench"],
  "Reverse Wrist Curl": ["dumbbell", "bench"],
  "Barbell Sumo Deadlift / Hip Thrust": ["barbell"],
  "Barbell Squat": ["barbell"],
  "DB RDL Wall-Tap Method": ["dumbbell"],
  "Reverse Lunge": ["dumbbell"],
  "Glute Bridge": [],
  "Lateral Band Walk": ["band"],
  "Dead Bug": [],
  Clamshell: ["band"],
  "Tibialis Wall Raise": [],
  "Eccentric Calf Raise": [],
  "Band Pull-Apart": ["band"],
};

/** Gerakan band yang tetap sah tanpa band (progresi awal bodyweight). */
export const BAND_OPTIONAL = new Set(["Clamshell"]);

/** Gerakan "/tangan" yang memakai satu dumbbell bergantian, bukan sepasang. */
const SINGLE_DUMBBELL = new Set(["Supported Single-Arm Row"]);

export function hasNeed(eq: Equipment, need: EquipmentNeed): boolean {
  switch (need) {
    case "dumbbell":
      return eq.dumbbell.enabled;
    case "barbell":
      return eq.barbell.enabled;
    case "band":
      return eq.bands.length > 0;
    case "pullUpBar":
      return eq.pullUpBar;
    case "bench":
      return eq.bench;
  }
}

export function missingNeeds(movement: string, eq: Equipment): EquipmentNeed[] {
  return (MOVEMENT_EQUIPMENT[movement] ?? []).filter((n) => !hasNeed(eq, n) && !(n === "band" && BAND_OPTIONAL.has(movement)));
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const MAX_COMBOS = 4096;

/** Semua total plat simetris: tiap jenis dipakai 2k keping (k per sisi), `sets` = jumlah alat yang diisi sama. */
function plateTotals(plates: Plate[], sets: number): number[] {
  let totals = [0];
  for (const p of plates) {
    if (!(p.kg > 0) || !(p.count > 0)) continue;
    const maxK = Math.min(10, Math.floor(p.count / (2 * sets)));
    const next: number[] = [];
    for (const t of totals) for (let k = 0; k <= maxK; k++) next.push(round2(t + 2 * k * p.kg));
    totals = [...new Set(next)].slice(0, MAX_COMBOS);
  }
  return totals;
}

/** Beban per dumbbell yang bisa dirakit (pair = dua dumbbell sama berat). */
export function dumbbellLoads(eq: Equipment, pair: boolean): number[] | undefined {
  if (!eq.dumbbell.enabled || eq.dumbbell.handleKg === undefined) return undefined;
  const need = pair ? 2 : 1;
  const out = new Set<number>();
  // Plat kecil dipegang langsung.
  for (const p of eq.plates) if (p.kg > 0 && p.count >= need) out.add(round2(p.kg));
  if (eq.dumbbell.handles >= need) {
    for (const t of plateTotals(eq.plates, need)) out.add(round2(eq.dumbbell.handleKg + t));
  }
  return [...out].sort((a, b) => a - b);
}

export function barbellLoads(eq: Equipment): number[] | undefined {
  if (!eq.barbell.enabled || eq.barbell.barKg === undefined) return undefined;
  return [...new Set(plateTotals(eq.plates, 1).map((t) => round2(eq.barbell.barKg! + t)))].sort((a, b) => a - b);
}

/**
 * Beban yang bisa dirakit untuk sebuah gerakan, sudah dibatasi rentang library.
 * undefined = belum bisa dicek (berat handle/batang belum diisi) → pakai rentang library.
 * [] = tidak ada kombinasi yang masuk rentang library.
 */
export function feasibleLoads(movement: string, weight: string, eq: Equipment): number[] | undefined {
  const spec = parseWeight(weight);
  if (spec.kind !== "load") return undefined;
  const needs = MOVEMENT_EQUIPMENT[movement] ?? [];
  const all = needs.includes("barbell")
    ? barbellLoads(eq)
    : needs.includes("dumbbell")
      ? dumbbellLoads(eq, spec.perHand && !SINGLE_DUMBBELL.has(movement))
      : undefined;
  if (!all) return undefined;
  return all.filter((v) => v >= spec.min - 1e-9 && v <= spec.max + 1e-9);
}

/** Band dari library yang dimiliki. Kosong → gerakan tidak bisa (kecuali BAND_OPTIONAL). */
export function ownedBands(weight: string, eq: Equipment): string[] | undefined {
  const spec = parseWeight(weight);
  if (spec.kind !== "band") return undefined;
  return spec.options.filter((o) => eq.bands.some((b) => b.toLowerCase() === o.toLowerCase()));
}

/** Parse daftar plat dari teks profil lama: "Plat 4x1.25kg, 4x1.5kg, 4x2.0kg". */
export function parsePlates(text: string): Plate[] {
  return [...text.matchAll(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*kg/gi)].map((m) => ({ count: Number(m[1]), kg: Number(m[2].replace(",", ".")) }));
}

export function isEquipment(x: unknown): x is Equipment {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return !!e.dumbbell && !!e.barbell && Array.isArray(e.plates) && Array.isArray(e.bands);
}

/** Normalisasi data alat dari JSON/localStorage (nilai rusak → default aman). */
export function normalizeEquipment(x: unknown, fallback: Equipment): Equipment {
  if (!isEquipment(x)) return fallback;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
  const d = x.dumbbell as Record<string, unknown>;
  const b = x.barbell as Record<string, unknown>;
  return {
    dumbbell: { enabled: d.enabled !== false, handleKg: num(d.handleKg), handles: Math.max(1, Math.min(4, Math.round(num(d.handles) ?? 2))) },
    barbell: { enabled: b.enabled !== false, barKg: num(b.barKg) },
    plates: (x.plates as unknown[])
      .map((p) => (p && typeof p === "object" ? { kg: num((p as Plate).kg) ?? 0, count: Math.round(num((p as Plate).count) ?? 0) } : null))
      .filter((p): p is Plate => !!p && p.kg > 0 && p.count > 0)
      .slice(0, 12),
    bands: BAND_LEVELS.filter((l) => (x.bands as unknown[]).includes(l)),
    pullUpBar: x.pullUpBar !== false,
    bench: x.bench !== false,
    other: Array.isArray(x.other) ? x.other.filter((o): o is string => typeof o === "string" && !!o.trim()).slice(0, 20) : [],
  };
}
