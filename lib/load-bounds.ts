/**
 * Batas beban 0.14.0 (docs/STRENGTH-HIDUP.md §2, keputusan pemilik 2026-10-26). Murni.
 *
 * - Rentang beban library = titik awal (gerakan tanpa log/PR) dan acuan level Easy/Moderate/High, bukan plafon.
 * - Batas alat = beban terberat yang bisa dirakit dari alat di Setting.
 * - Batas keamanan = hanya untuk gerakan sensitif, dan hanya saat kondisi terkaitnya aktif (D4, disetujui pemilik).
 * - Beban resep = min(batas alat, batas keamanan). Alat belum bisa dicek → batas atas library.
 * - Aturan ini aktif setelah persetujuan sekali ("Saya mengerti, aktifkan") dan bisa dikembalikan lewat toggle
 *   "Batasi ke rentang awal library". Sebelum itu: perilaku lama (batas atas library = plafon).
 */
import type { ConditionId } from "./conditions";
import { equipmentCap, feasibleLoads, type Equipment } from "./equipment";
import { parseWeight } from "./weights";

export interface LoadRule {
  /** ISO: pengguna menekan "Saya mengerti, aktifkan". */
  acceptedAt?: string;
  /** Toggle "Batasi ke rentang awal library": kembali ke perilaku lama. */
  limitToLibrary?: boolean;
}

export const newRuleActive = (r: LoadRule | undefined) => !!r?.acceptedAt && !r.limitToLibrary;

export interface SafetyCap {
  movement: string;
  conditions: ConditionId[];
  kg: number;
  source: string;
}

/**
 * Batas keamanan (D4). Angkanya = batas atas rentang library sebelum 0.14, jadi saat kondisinya aktif perilakunya
 * sama seperti dulu. Gerakan yang dilarang kondisi (mis. Barbell Squat saat nyeri punggung bawah) tetap dilarang.
 */
export const SAFETY_CAPS: SafetyCap[] = [
  { movement: "Barbell Squat", conditions: ["apt", "lbp"], kg: 16, source: "McGill S. Low Back Disorders, 3rd ed. 2016: batasi beban aksial pada tulang belakang" },
  {
    movement: "Barbell Sumo Deadlift / Hip Thrust",
    conditions: ["apt", "lbp"],
    kg: 20,
    source: "McGill S. Low Back Disorders, 3rd ed. 2016; NICE NG59 2016 (latihan bertahap, bukan beban maksimal)",
  },
  { movement: "Seated Lateral Raise", conditions: ["shoulder"], kg: 3, source: "Diercks R, et al. Acta Orthop. 2014 (subacromial pain); Littlewood C, et al. Physiotherapy. 2012" },
  { movement: "DB Scaption", conditions: ["shoulder"], kg: 2, source: "Diercks R, et al. Acta Orthop. 2014 (subacromial pain); Littlewood C, et al. Physiotherapy. 2012" },
];

/** Batas keamanan gerakan ini bila salah satu kondisinya aktif. */
export function safetyCap(movement: string, active: readonly ConditionId[]): (SafetyCap & { condition: ConditionId }) | undefined {
  const cap = SAFETY_CAPS.find((c) => c.movement === movement);
  const condition = cap?.conditions.find((c) => active.includes(c));
  return cap && condition ? { ...cap, condition } : undefined;
}

export type CapSource = "library" | "equipment" | "safety";

export interface LoadCap {
  kg: number;
  source: CapSource;
  condition?: ConditionId;
}

export interface LoadBounds {
  cap: LoadCap;
  /** Beban yang bisa dirakit di [batas bawah library, cap]. undefined = alat belum bisa dicek. */
  loads?: number[];
}

/** Batas beban satu gerakan berbeban. `undefined` untuk bodyweight/band. */
export function loadBounds(movement: string, weight: string, eq: Equipment, active: readonly ConditionId[], rule: LoadRule | undefined): LoadBounds | undefined {
  const spec = parseWeight(weight);
  if (spec.kind !== "load") return undefined;
  if (!newRuleActive(rule)) return { cap: { kg: spec.max, source: "library" }, loads: feasibleLoads(movement, weight, eq) };
  const eqCap = equipmentCap(movement, weight, eq);
  const safety = safetyCap(movement, active);
  let cap: LoadCap = eqCap === undefined ? { kg: spec.max, source: "library" } : { kg: eqCap, source: "equipment" };
  if (safety && safety.kg < cap.kg) cap = { kg: safety.kg, source: "safety", condition: safety.condition };
  return { cap, loads: feasibleLoads(movement, weight, eq, cap.kg) };
}

/** Beban resep di atas rentang awal library (untuk label `DI ATAS RENTANG AWAL`). */
export function aboveLibrary(weight: string, loadKg: number): boolean {
  const spec = parseWeight(weight);
  return spec.kind === "load" && loadKg > spec.max + 1e-9;
}
