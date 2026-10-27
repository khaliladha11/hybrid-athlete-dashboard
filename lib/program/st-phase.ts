/**
 * ST mengikuti fase program (0.14.1, docs/TRAINING-LOGIC.md). Murni; hanya dipakai saat program aktif.
 *
 * - Pre-Base / Base: seperti sebelumnya (Moderate 45').
 * - Build: High 45' (beban lebih berat sejauh alat memungkinkan); minggu cutback tetap Moderate.
 *   Heavy ST paling konsisten memperbaiki running economy (Rønnestad & Mujika 2014).
 * - Peak: maintenance, Moderate 30', set gerakan inti maks 2, beban ditahan. Satu sesi/minggu sudah cukup
 *   mempertahankan kekuatan selama musim lomba (Rønnestad, Hansen & Raastad 2010).
 * - Taper: volume ±50% (30', set inti maks 2, aksesori 1), intensitas & frekuensi tetap, beban ditahan
 *   (Bosquet dkk. 2007; Travis dkk. 2020).
 * - Minggu lomba: tanpa ST kaki; Upper ringan paling lambat 3 hari sebelum Hari H. ST kaki terakhir ≥ 8 hari sebelum
 *   Hari H (DOMS dan turunnya torsi 24–48 jam setelah ST kaki, de Carvalho e Silva dkk. 2022), diberi jarak lebih
 *   untuk profil APT/LBP.
 */
import type { Difficulty, Duration, StrengthWorkout } from "@/lib/generator/types";
import type { Phase } from "@/lib/program";

export type StPhaseKey = "base" | "build" | "build-cutback" | "peak" | "taper" | "race";
export const ST_PHASE_KEYS: readonly StPhaseKey[] = ["base", "build", "build-cutback", "peak", "taper", "race"];
export const isStPhaseKey = (x: unknown): x is StPhaseKey => typeof x === "string" && (ST_PHASE_KEYS as readonly string[]).includes(x);

export interface StPhaseRule {
  key: StPhaseKey;
  difficulty: Difficulty;
  duration: Duration;
  /** Set maksimal per gerakan inti (★ dan gerakan utama lain). */
  maxSets?: number;
  /** Set maksimal per gerakan aksesori. */
  maxAccessorySets?: number;
  /** Beban tidak dinaikkan di fase ini (progresi naik → tahan). */
  holdLoad: boolean;
  label: string;
}

/** ST kaki terakhir paling lambat sekian hari sebelum Hari H. */
export const LAST_LEG_ST_DAYS = 8;
/** ST upper terakhir di minggu lomba paling lambat sekian hari sebelum Hari H. */
export const LAST_UPPER_ST_DAYS = 3;

export const ST_PHASE_RULES: Record<StPhaseKey, StPhaseRule> = {
  base: { key: "base", difficulty: "moderate", duration: 45, holdLoad: false, label: "Base: volume" },
  build: { key: "build", difficulty: "high", duration: 45, holdLoad: false, label: "Build: lebih berat" },
  "build-cutback": { key: "build-cutback", difficulty: "moderate", duration: 45, holdLoad: false, label: "Build cutback: Moderate" },
  peak: { key: "peak", difficulty: "moderate", duration: 30, maxSets: 2, holdLoad: true, label: "Peak: maintenance" },
  taper: { key: "taper", difficulty: "moderate", duration: 30, maxSets: 2, maxAccessorySets: 1, holdLoad: true, label: "Taper: volume setengah" },
  race: { key: "race", difficulty: "moderate", duration: 30, maxSets: 2, maxAccessorySets: 1, holdLoad: true, label: "Minggu lomba: ringan" },
};

export function stPhaseKey(w: { phase: Phase; cutback: boolean; raceWeek: boolean }): StPhaseKey {
  if (w.raceWeek) return "race";
  if (w.phase === "taper") return "taper";
  if (w.phase === "peak") return "peak";
  if (w.phase === "build") return w.cutback ? "build-cutback" : "build";
  return "base";
}

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Sesi ST mana yang dibuat minggu ini. `monday`/`wednesday` = tanggal slot; `raceDate` = Hari H. */
export function stSlots(key: StPhaseKey, o: { monday: string; wednesday: string; raceDate: string }): { lower: boolean; upper: boolean } {
  const lower = key !== "race" && days(o.monday, o.raceDate) >= LAST_LEG_ST_DAYS;
  const upper = key !== "race" || days(o.wednesday, o.raceDate) >= LAST_UPPER_ST_DAYS;
  return { lower, upper };
}

/**
 * Terapkan batas set fase ke workout hasil generator. Beban yang ditahan diatur lewat `applyProgression`
 * (opsi `holdLoad`), supaya alasan Gita tetap satu sumber.
 */
export function applyPhaseRule(w: StrengthWorkout, rule: StPhaseRule): StrengthWorkout {
  if (!rule.maxSets) return w;
  const items = w.items.map((it) => {
    if (it.phase !== "main") return it;
    const max = (it.accessory ? rule.maxAccessorySets : undefined) ?? rule.maxSets!;
    return it.sets > max ? { ...it, sets: max } : it;
  });
  const acc = rule.maxAccessorySets ? `, aksesori ${rule.maxAccessorySets}` : "";
  return { ...w, items, notes: [...w.notes, `${rule.label}: set gerakan inti maks ${rule.maxSets}${acc}${rule.holdLoad ? ", beban tidak dinaikkan" : ""}.`] };
}
