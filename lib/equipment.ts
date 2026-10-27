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
 * - 0.14.0: item berbobot tetap (dumbbell fixed, kettlebell) di samping model handle + plat. Dumbbell fixed ikut
 *   beban dumbbell (sepasang butuh ≥ 2 buah); kettlebell hanya dicatat karena library belum punya gerakan kettlebell.
 *   `buildableLoads` = semua beban yang bisa dirakit tanpa filter library, dasar batas alat (`equipmentCap`).
 */
import { parseWeight } from "./weights";

export const BAND_LEVELS = ["Light", "Medium", "Heavy"] as const;
export type BandLevel = (typeof BAND_LEVELS)[number];

export interface Plate {
  kg: number;
  count: number;
}

export type EquipmentItemKind = "fixedDumbbell" | "kettlebell";

export const ITEM_LABEL: Record<EquipmentItemKind, string> = { fixedDumbbell: "Dumbbell fixed", kettlebell: "Kettlebell" };

/** Alat berbobot tetap (0.14.0). */
export interface EquipmentItem {
  id: string;
  kind: EquipmentItemKind;
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
  /** Titik tambat band (kaki meja, handle pintu, door anchor) untuk gerakan band yang ditambatkan. */
  bandAnchor: boolean;
  /** Alat lain (catatan; belum dipakai generator). */
  other: string[];
  /** Item berbobot tetap (0.14.0). Data lama tanpa daftar ini = kosong. */
  items: EquipmentItem[];
}

export const MAX_ITEMS = 20;
const fixedDumbbells = (eq: Equipment) => (eq.items ?? []).filter((i) => i.kind === "fixedDumbbell" && i.kg > 0 && i.count > 0);

export type EquipmentNeed = "dumbbell" | "barbell" | "band" | "bandAnchor" | "pullUpBar" | "bench";

export const NEED_LABEL: Record<EquipmentNeed, string> = {
  dumbbell: "dumbbell",
  barbell: "barbell",
  band: "resistance band",
  bandAnchor: "titik tambat band",
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
  "Push-Up": [],
  "Knee Push-Up": [],
  "Wall Push-Up": [],
  "Prone Y-T-W Raise": [],
  "Prone Reverse Snow Angel": [],
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
  // 0.9 — gerakan baru dari free-exercise-db (lihat docs/movement-library-proposal.md).
  "Band Reverse Fly": ["band", "bandAnchor"],
  "Single-Leg Glute Bridge": [],
  "Rear-Foot-Elevated Split Squat": ["dumbbell", "bench"],
  "DB Step-Up": ["dumbbell", "bench"],
  "DB Plié Squat": ["dumbbell"],
  "Seated Band Hamstring Curl": ["band", "bandAnchor", "bench"],
  "Side Plank": [],
  "Standing Band Hip Abduction": ["band", "bandAnchor"],
  Plank: [],
  "Seated Single-Leg Calf Raise": ["dumbbell", "bench"],
  "DB Scaption": ["dumbbell"],
  "Band External Rotation": ["band", "bandAnchor"],
  "Quadruped Hip Circles": [],
  // 0.14.2: gerakan baru dari free-exercise-db (lihat docs/movement-library-proposal-0.14.md).
  "Seated DB Curl": ["dumbbell", "bench"],
  "Hammer Curl": ["dumbbell"],
  "Lying DB Triceps Extension": ["dumbbell", "bench"],
  "Close-Grip Push-Up": [],
  "Scapular Pull-Up": ["pullUpBar"],
  "Band-Assisted Pull-Up": ["pullUpBar", "band"],
  "Standing DB Calf Raise": ["dumbbell"],
  "Seated Band Tibialis Raise": ["band", "bandAnchor"],
  "Single-Leg DB RDL": ["dumbbell"],
  "Single-Leg Hip Thrust": ["dumbbell", "bench"],
  "Single-Arm DB Floor Press": ["dumbbell"],
  // Pemanasan & pendinginan tanpa alat.
  "Kneeling Hip Flexor Stretch": [],
  "Cat-Cow": [],
  "Calf Stretch": [],
};

/** Gerakan band yang tetap sah tanpa band (progresi awal bodyweight). */
export const BAND_OPTIONAL = new Set(["Clamshell"]);

/** Gerakan "/tangan" yang memakai satu dumbbell bergantian, bukan sepasang. */
const SINGLE_DUMBBELL = new Set(["Supported Single-Arm Row"]);

export function hasNeed(eq: Equipment, need: EquipmentNeed): boolean {
  switch (need) {
    case "dumbbell":
      return eq.dumbbell.enabled || fixedDumbbells(eq).length > 0;
    case "barbell":
      return eq.barbell.enabled;
    case "band":
      return eq.bands.length > 0;
    case "bandAnchor":
      return eq.bandAnchor;
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

/**
 * Beban per dumbbell yang bisa dirakit (pair = dua dumbbell sama berat): handle + plat, plat kecil dipegang langsung,
 * dan dumbbell fixed (0.14.0). Dumbbell handle aktif tapi beratnya belum diisi → undefined (belum bisa dicek).
 */
export function dumbbellLoads(eq: Equipment, pair: boolean): number[] | undefined {
  const need = pair ? 2 : 1;
  const fixed = fixedDumbbells(eq).filter((i) => i.count >= need);
  const adjustable = eq.dumbbell.enabled;
  if (adjustable && eq.dumbbell.handleKg === undefined) return undefined;
  if (!adjustable && !fixed.length) return undefined;
  const out = new Set<number>();
  for (const i of fixed) out.add(round2(i.kg));
  if (adjustable && eq.dumbbell.handleKg !== undefined) {
    // Plat kecil dipegang langsung.
    for (const p of eq.plates) if (p.kg > 0 && p.count >= need) out.add(round2(p.kg));
    if (eq.dumbbell.handles >= need) {
      for (const t of plateTotals(eq.plates, need)) out.add(round2(eq.dumbbell.handleKg + t));
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function barbellLoads(eq: Equipment): number[] | undefined {
  if (!eq.barbell.enabled || eq.barbell.barKg === undefined) return undefined;
  return [...new Set(plateTotals(eq.plates, 1).map((t) => round2(eq.barbell.barKg! + t)))].sort((a, b) => a - b);
}

/** Semua beban yang bisa dirakit untuk sebuah gerakan, tanpa filter library. undefined = belum bisa dicek. */
export function buildableLoads(movement: string, weight: string, eq: Equipment): number[] | undefined {
  const spec = parseWeight(weight);
  if (spec.kind !== "load") return undefined;
  const needs = MOVEMENT_EQUIPMENT[movement] ?? [];
  return needs.includes("barbell")
    ? barbellLoads(eq)
    : needs.includes("dumbbell")
      ? dumbbellLoads(eq, spec.perHand && !SINGLE_DUMBBELL.has(movement))
      : undefined;
}

/** Batas alat: beban terberat yang bisa dirakit. undefined = belum bisa dicek (pakai rentang library). */
export function equipmentCap(movement: string, weight: string, eq: Equipment): number | undefined {
  const all = buildableLoads(movement, weight, eq);
  return all?.length ? all[all.length - 1] : undefined;
}

/**
 * Beban yang bisa dirakit untuk sebuah gerakan di rentang [batas bawah library, `maxKg`] (default batas atas library).
 * undefined = belum bisa dicek (berat handle/batang belum diisi) → pakai rentang library.
 * [] = tidak ada kombinasi yang masuk rentang.
 */
export function feasibleLoads(movement: string, weight: string, eq: Equipment, maxKg?: number): number[] | undefined {
  const spec = parseWeight(weight);
  if (spec.kind !== "load") return undefined;
  const all = buildableLoads(movement, weight, eq);
  if (!all) return undefined;
  const hi = maxKg ?? spec.max;
  return all.filter((v) => v >= spec.min - 1e-9 && v <= hi + 1e-9);
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
    bandAnchor: x.bandAnchor !== false,
    other: Array.isArray(x.other) ? x.other.filter((o): o is string => typeof o === "string" && !!o.trim()).slice(0, 20) : [],
    // Migrasi 0.14.0: data lama tanpa `items` → kosong.
    items: normalizeItems(x.items),
  };
}

function normalizeItems(v: unknown): EquipmentItem[] {
  if (!Array.isArray(v)) return [];
  const out: EquipmentItem[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of v.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.kind !== "fixedDumbbell" && r.kind !== "kettlebell") continue;
    const kg = typeof r.kg === "number" && Number.isFinite(r.kg) && r.kg > 0 && r.kg <= 100 ? Math.round(r.kg * 100) / 100 : undefined;
    const count = typeof r.count === "number" && Number.isFinite(r.count) ? Math.round(r.count) : undefined;
    if (kg === undefined || count === undefined || count < 1 || count > 20) continue;
    let id = typeof r.id === "string" && r.id && r.id.length <= 40 ? r.id : `item-${i}`;
    while (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    out.push({ id, kind: r.kind, kg, count });
  }
  return out.slice(0, MAX_ITEMS);
}
