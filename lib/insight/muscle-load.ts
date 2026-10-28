/**
 * #5 Heatmap otot (docs/INSIGHT.md §4, 0.15.1). Murni: tanggal dari parameter, WIB.
 *
 * - Bobot: otot utama 1, sekunder 0,5 (otot yang utama dan sekunder di gerakan yang sama dihitung utama).
 * - Frekuensi: jumlah sesi yang melatih otot; satu sesi menyumbang bobot terbesar otot itu di sesi tersebut (maks 1).
 * - Volume: jumlah set × bobot (set perkiraan data lama dihitung 1 set).
 * - Intensitas peta: 4 tingkat relatif terhadap skor tertinggi di rentang itu.
 * - Jarang dilatih: otot utama dari gerakan yang tersedia sekarang (alat + kondisi + pilihan) tanpa kerja utama dalam
 *   14 hari. Hanya dinilai bila ada ≥ 1 sesi ST dalam 14 hari; otot yang tidak bisa dilatih dengan alat sekarang tidak
 *   didaftar.
 */
import { addDays } from "@/lib/date";
import { MOVEMENT_MEDIA } from "@/lib/movements/media";
import { MUSCLE_REGIONS, regionsOf, type MuscleRegion } from "@/lib/movements/muscle-regions";
import { num1 } from "./format";
import type { WorkSet } from "./strength-trends";

export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.5;
export const RARELY_DAYS = 14;
export const LEVELS = 4;

export type MuscleMode = "frequency" | "volume";

/** Bobot setiap otot di satu gerakan. */
export function muscleWeights(movement: string): Map<string, number> {
  const m = MOVEMENT_MEDIA[movement];
  const out = new Map<string, number>();
  if (!m) return out;
  for (const x of m.secondaryMuscles) out.set(x, SECONDARY_WEIGHT);
  for (const x of m.primaryMuscles) out.set(x, PRIMARY_WEIGHT);
  return out;
}

const inWindow = (w: WorkSet, today: string, days: number) => w.date <= today && w.date >= addDays(today, -(days - 1));

/** Skor per otot dalam `days` hari terakhir (hari ini termasuk). */
export function muscleScores(work: WorkSet[], today: string, days: number, mode: MuscleMode): Map<string, number> {
  const recent = work.filter((w) => inWindow(w, today, days));
  const scores = new Map<string, number>();
  if (mode === "volume") {
    for (const w of recent) for (const [muscle, wt] of muscleWeights(w.movement)) scores.set(muscle, (scores.get(muscle) ?? 0) + wt);
    return scores;
  }
  const perSession = new Map<string, Map<string, number>>();
  for (const w of recent) {
    const s = perSession.get(w.sessionKey) ?? new Map<string, number>();
    for (const [muscle, wt] of muscleWeights(w.movement)) s.set(muscle, Math.max(s.get(muscle) ?? 0, wt));
    perSession.set(w.sessionKey, s);
  }
  for (const s of perSession.values()) for (const [muscle, wt] of s) scores.set(muscle, (scores.get(muscle) ?? 0) + wt);
  return scores;
}

export interface MuscleHeat {
  /** Otot berskor, tertinggi dulu. */
  muscles: { muscle: string; score: number }[];
  /** Tingkat 1–4 per region peta (skor tertinggi otot yang memakai region itu). */
  levels: Partial<Record<MuscleRegion, number>>;
  max: number;
  /** Batas atas skor setiap tingkat (indeks 0 = tingkat 1). */
  legend: number[];
}

export const levelOf = (score: number, max: number) => (score <= 0 || max <= 0 ? 0 : Math.min(LEVELS, Math.ceil((score / max) * LEVELS - 1e-9)));

export function muscleHeat(work: WorkSet[], today: string, days: number, mode: MuscleMode): MuscleHeat {
  const scores = muscleScores(work, today, days, mode);
  const muscles = [...scores].map(([muscle, score]) => ({ muscle, score })).sort((a, b) => b.score - a.score || a.muscle.localeCompare(b.muscle, "id"));
  const max = muscles[0]?.score ?? 0;
  const regionScore = new Map<MuscleRegion, number>();
  for (const { muscle, score } of muscles) for (const r of regionsOf(muscle)) regionScore.set(r, Math.max(regionScore.get(r) ?? 0, score));
  const levels: MuscleHeat["levels"] = {};
  for (const [r, s] of regionScore) levels[r] = levelOf(s, max);
  const legend = Array.from({ length: LEVELS }, (_, i) => Math.round(((max * (i + 1)) / LEVELS) * 10) / 10);
  return { muscles, levels, max, legend };
}

/** Otot yang bisa dilatih dengan gerakan tersedia tetapi tanpa kerja utama 14 hari. null = belum ada sesi 14 hari. */
export function rarelyTrained(work: WorkSet[], available: readonly string[], today: string): string[] | null {
  const recent = work.filter((w) => inWindow(w, today, RARELY_DAYS));
  if (!recent.length) return null;
  const trained = new Set(recent.flatMap((w) => MOVEMENT_MEDIA[w.movement]?.primaryMuscles ?? []));
  const trainable = new Set(available.flatMap((m) => MOVEMENT_MEDIA[m]?.primaryMuscles ?? []));
  return [...trainable].filter((m) => !trained.has(m)).sort((a, b) => a.localeCompare(b, "id"));
}

/** Gerakan tersedia yang melatih otot: utama dulu, lalu sekunder. */
export function movementsFor(muscle: string, available: readonly string[]): { primary: string[]; secondary: string[] } {
  const sorted = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
  return {
    primary: sorted(available.filter((m) => MOVEMENT_MEDIA[m]?.primaryMuscles.includes(muscle))),
    secondary: sorted(available.filter((m) => MOVEMENT_MEDIA[m]?.secondaryMuscles.includes(muscle) && !MOVEMENT_MEDIA[m]?.primaryMuscles.includes(muscle))),
  };
}

/** Otot (nama kurasi) yang memakai region peta, untuk ketukan di peta. */
export const musclesOfRegion = (region: MuscleRegion) => Object.keys(MUSCLE_REGIONS).filter((m) => MUSCLE_REGIONS[m].includes(region));

/** Region peta untuk sekumpulan otot (mis. otot jarang dilatih → garis putus-putus). */
export const regionsOfMuscles = (muscles: readonly string[]) => [...new Set(muscles.flatMap(regionsOf))];

const MODE_TEXT: Record<MuscleMode, string> = { frequency: "sesi", volume: "set" };

/** Kalimat di atas peta otot. */
export function heatSummary(h: MuscleHeat, days: number, mode: MuscleMode): { drawable: boolean; text: string } {
  if (!h.muscles.length) return { drawable: false, text: `Belum ada sesi ST tercatat di perangkat ini dalam ${days} hari terakhir.` };
  const top = h.muscles.slice(0, 3).map((m) => `${m.muscle} ${num1(m.score).replace(",0", "")}`);
  return { drawable: true, text: `Paling banyak dilatih ${days} hari terakhir (${MODE_TEXT[mode]} berbobot): ${top.join(", ")}.` };
}
