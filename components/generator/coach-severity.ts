/**
 * Kata severity untuk label "SARAN HARI INI · …" (UI saja; logika saran tetap di lib/coach).
 * Warna = tone intensitas/status, bukan warna chrome.
 */
import type { Advice, Suggestion } from "@/lib/coach";
import { adviceLevel, SEVERITY_RANK, type CoachLevel } from "@/lib/coach-collapse";
import { DIFFICULTY_LABEL } from "@/lib/generator/types";
import { INTENSITY_TONE, TONES, type Tone } from "@/components/ui/tones";
import type { Locale } from "@/lib/i18n/locale";
import { GENERATOR } from "@/lib/i18n/messages/generator";

export interface Severity {
  word: string;
  className: string;
  /** Tone pill (tanpa tone = netral). */
  tone?: Tone;
  /** Urutan berat (Profil): dipakai untuk membuka kartu otomatis bila naik. */
  rank?: number;
}

const LEVEL_TONE: Record<CoachLevel, Tone | undefined> = { easy: "success", lower: "warning", limit: "warning", info: undefined };

/** Dari daftar saran (Profil, tanpa pilihan aktif). */
export function adviceSeverity(advice: Advice[], locale: Locale = "id"): Severity {
  const level = adviceLevel(advice);
  const word = GENERATOR[locale].coach.level[level];
  const tone = LEVEL_TONE[level];
  return { word, tone, className: tone ? TONES[tone].ink : "text-muted", rank: SEVERITY_RANK[level] };
}

/** Dari saran terhadap pilihan saat ini (generator). */
export function suggestionSeverity(s: Suggestion, locale: Locale = "id"): Severity {
  const t = GENERATOR[locale].coach;
  if (s.difficulty) return { word: DIFFICULTY_LABEL[s.difficulty], className: TONES[INTENSITY_TONE[s.difficulty]].ink };
  if (s.duration) return { word: t.limit, className: TONES.warning.ink };
  if (s.type) return { word: t.changeType, className: TONES.warning.ink };
  return { word: t.fits, className: TONES.success.ink };
}
