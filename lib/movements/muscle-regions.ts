/**
 * Nama otot kurasi kita (`media.ts`) → region peta otot (0.14.1, STRENGTH-HIDUP §3 "Peta otot"). Murni.
 *
 * - Region = `front:<slug>` / `back:<slug>` dari path SVG MuscleMapJS (MIT, model pria), lihat
 *   `components/charts/MuscleMap.tsx` dan NOTICE.md.
 * - Keterbatasan sumber: soleus tidak terpisah (masuk `calves` belakang), lats masuk `upper-back`.
 *   Otot dalam (rotator cuff) tidak punya region: ditulis di daftar teks saja.
 * - Gerakan yang semua otot utamanya tanpa region masuk `TEXT_ONLY_MOVEMENTS` dengan alasannya; test menjaga setiap
 *   gerakan library punya ≥ 1 otot utama terpetakan atau tercatat di sana.
 */
import { MOVEMENT_MEDIA } from "./media";

export type MuscleRegion = `${"front" | "back"}:${string}`;

export const MUSCLE_REGIONS: Record<string, readonly MuscleRegion[]> = {
  Hamstring: ["back:hamstring"],
  Gluteus: ["back:gluteal"],
  "Gluteus medius": ["back:gluteal"],
  "Gluteus medius (abduktor)": ["back:gluteal"],
  "Abduktor pinggul": ["back:gluteal"],
  Adduktor: ["front:adductors", "back:adductors"],
  "Paha depan": ["front:quadriceps"],
  "Hip flexor": ["front:hip-flexors"],
  Betis: ["back:calves", "front:calves"],
  "Betis (soleus)": ["back:calves"],
  "Tulang kering (tibialis anterior)": ["front:tibialis"],
  Dada: ["front:chest"],
  Bahu: ["front:deltoids", "back:deltoids"],
  "Bahu depan": ["front:front-deltoid"],
  "Bahu samping": ["front:deltoids", "back:deltoids"],
  "Bahu belakang": ["back:deltoids"],
  Trisep: ["back:triceps", "front:triceps"],
  Bisep: ["front:biceps"],
  "Lengan bawah (grip)": ["front:forearm", "back:forearm"],
  "Lengan bawah (ekstensor)": ["back:forearm"],
  Trapezius: ["back:trapezius", "front:trapezius"],
  "Punggung atas": ["back:upper-back", "back:trapezius"],
  "Punggung atas (trapezius tengah & bawah)": ["back:trapezius", "back:upper-back"],
  "Punggung tengah": ["back:upper-back"],
  Latissimus: ["back:upper-back"],
  "Punggung bawah": ["back:lower-back"],
  "Punggung bawah (stabilisasi)": ["back:lower-back"],
  Perut: ["front:abs"],
  "Perut (oblique)": ["front:obliques"],
  Core: ["front:abs", "front:obliques"],
};

/** Otot tanpa region di SVG sumber, beserta alasannya (tampil sebagai teks). */
export const TEXT_ONLY_MUSCLES: Record<string, string> = {
  "Rotator cuff": "otot dalam di bawah deltoid, tidak ada di gambar",
};

/** Gerakan yang hanya tampil sebagai daftar teks, beserta alasannya. */
export const TEXT_ONLY_MOVEMENTS: Record<string, string> = {
  "Band External Rotation": "Otot utamanya rotator cuff (otot dalam) yang tidak ada di gambar; lihat daftar otot.",
};

export const regionsOf = (muscle: string): readonly MuscleRegion[] => MUSCLE_REGIONS[muscle] ?? [];

export interface MuscleSummary {
  /** Nama otot utama (urut abjad). */
  primary: string[];
  /** Otot sekunder yang tidak utama di gerakan lain (urut abjad). */
  secondary: string[];
  primaryRegions: MuscleRegion[];
  /** Region sekunder yang tidak sudah utama. */
  secondaryRegions: MuscleRegion[];
}

const sorted = (xs: Iterable<string>) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "id"));

/** Gabungan otot dari beberapa gerakan: utama di satu gerakan = utama; region dideduplikasi. */
export function muscleSummary(movements: readonly string[]): MuscleSummary {
  const media = movements.map((m) => MOVEMENT_MEDIA[m]).filter(Boolean);
  const primary = sorted(media.flatMap((m) => m.primaryMuscles));
  const secondary = sorted(media.flatMap((m) => m.secondaryMuscles)).filter((x) => !primary.includes(x));
  const primaryRegions = sorted(primary.flatMap(regionsOf)) as MuscleRegion[];
  const secondaryRegions = (sorted(secondary.flatMap(regionsOf)) as MuscleRegion[]).filter((r) => !primaryRegions.includes(r));
  return { primary, secondary, primaryRegions, secondaryRegions };
}

/** Label aksesibilitas peta otot. */
export const muscleAriaLabel = (s: Pick<MuscleSummary, "primary" | "secondary">) =>
  `Otot utama: ${s.primary.join(", ") || "tidak ada"}; sekunder: ${s.secondary.join(", ") || "tidak ada"}`;
