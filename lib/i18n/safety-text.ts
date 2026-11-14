/**
 * Teks konten keselamatan per bahasa (1.2.0). Sumber Indonesia tetap di `lib/conditions.ts`, `lib/movements/media.ts`,
 * `lib/generator/meta.ts`, dan `lib/movements/muscle-regions.ts` (data dan logika memakainya apa adanya); lapisan
 * Inggris ada di `messages/media-en.ts` dan `messages/safety-en.ts`. Bila terjemahan tidak ada, teks Indonesia dipakai.
 */
import { CONDITIONS, CONDITION_IDS, type ConditionId } from "@/lib/conditions";
import { META } from "@/lib/generator/meta";
import { MOVEMENT_MEDIA } from "@/lib/movements/media";
import { TEXT_ONLY_MOVEMENTS, TEXT_ONLY_MUSCLES } from "@/lib/movements/muscle-regions";
import type { Locale } from "./locale";
import { MEDIA_EN, MUSCLE_EN } from "./messages/media-en";
import { CONDITIONS_EN, META_CUE_EN, SOURCE_EN, TEXT_ONLY_MOVEMENTS_EN, TEXT_ONLY_MUSCLES_EN } from "./messages/safety-en";

export const conditionLabel = (id: ConditionId, locale: Locale = "id") => (locale === "en" ? CONDITIONS_EN[id].label : CONDITIONS[id].label);
/** "Riwayat Shin Splints (MTSS)" → "Riwayat Shin Splints". */
export const conditionShort = (id: ConditionId, locale: Locale = "id") => conditionLabel(id, locale).split(" (")[0];
export const conditionEffect = (id: ConditionId, locale: Locale = "id") => (locale === "en" ? CONDITIONS_EN[id].effect : CONDITIONS[id].effect);
export const sourceLabel = (label: string, locale: Locale = "id") => (locale === "en" ? (SOURCE_EN[label] ?? label) : label);

/** Catatan kondisi Indonesia → padanan Inggris (urutan & isi `combineRules` tetap). */
const NOTE_EN = new Map<string, string>(
  CONDITION_IDS.flatMap((id) => {
    const r = CONDITIONS[id].rules;
    const en = CONDITIONS_EN[id];
    return [...(r.strengthNotes ?? []).map((n, i) => [n, en.strengthNotes?.[i] ?? n] as const), ...(r.runNotes ?? []).map((n, i) => [n, en.runNotes?.[i] ?? n] as const)];
  }),
);
export const conditionNote = (note: string, locale: Locale = "id") => (locale === "en" ? (NOTE_EN.get(note) ?? note) : note);

/** Cue, catatan gambar, dan catatan kondisi gerakan. */
export function mediaText(name: string, locale: Locale = "id") {
  const m = MOVEMENT_MEDIA[name];
  if (!m) return undefined;
  const en = locale === "en" ? MEDIA_EN[name] : undefined;
  return {
    cues: en?.cues ?? m.cues,
    imageNote: m.imageNote === undefined ? undefined : (en?.imageNote ?? m.imageNote),
    conditionNotes: { ...m.conditionNotes, ...en?.conditionNotes } as Partial<Record<ConditionId, string>>,
  };
}

export const muscleName = (muscle: string, locale: Locale = "id") => (locale === "en" ? (MUSCLE_EN[muscle] ?? muscle) : muscle);
export const textOnlyMuscle = (muscle: string, locale: Locale = "id") =>
  TEXT_ONLY_MUSCLES[muscle] === undefined ? undefined : locale === "en" ? (TEXT_ONLY_MUSCLES_EN[muscle] ?? TEXT_ONLY_MUSCLES[muscle]) : TEXT_ONLY_MUSCLES[muscle];
export const textOnlyMovement = (name: string, locale: Locale = "id") =>
  TEXT_ONLY_MOVEMENTS[name] === undefined ? undefined : locale === "en" ? (TEXT_ONLY_MOVEMENTS_EN[name] ?? TEXT_ONLY_MOVEMENTS[name]) : TEXT_ONLY_MOVEMENTS[name];

/** Cue preskripsi generator. */
export const metaCue = (name: string, locale: Locale = "id") => (locale === "en" ? (META_CUE_EN[name] ?? META[name]?.cue) : META[name]?.cue);

/**
 * Satuan di teks reps META ("8/kaki", "12–15/sisi", "10 langkah/arah", "3–5 (turun 3–5 detik)") → Inggris. Angka tidak
 * diubah; progresi tetap membaca angka pertama dan akhiran `/…`.
 */
export function repsText(reps: string | undefined, locale: Locale = "id"): string | undefined {
  if (reps === undefined || locale === "id") return reps;
  return reps
    .replace(/\(turun ([\d–]+) detik\)/, "(lower over $1 sec)")
    .replace(/ langkah\/arah$/, " steps/direction")
    .replace(/\/sisi$/, "/side")
    .replace(/\/kaki$/, "/leg")
    .replace(/\/posisi \(/, "/position (");
}
