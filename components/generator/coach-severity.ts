/**
 * Kata severity untuk label "SARAN HARI INI · …" (UI saja; logika saran tetap di lib/coach).
 * Warna = tone intensitas/status, bukan warna chrome.
 */
import type { Advice, Suggestion } from "@/lib/coach";
import { adviceLevel, SEVERITY_RANK, type CoachLevel } from "@/lib/coach-collapse";
import { DIFFICULTY_LABEL } from "@/lib/generator/types";
import { INTENSITY_TONE, TONES, type Tone } from "@/components/ui/tones";

export interface Severity {
  word: string;
  className: string;
  /** Tone pill (tanpa tone = netral). */
  tone?: Tone;
  /** Urutan berat (Profil): dipakai untuk membuka kartu otomatis bila naik. */
  rank?: number;
}

const LEVEL: Record<CoachLevel, { word: string; tone?: Tone }> = {
  easy: { word: "Easy", tone: "success" },
  lower: { word: "Turunkan", tone: "warning" },
  limit: { word: "Batasi", tone: "warning" },
  info: { word: "Info" },
};

/** Dari daftar saran (Profil, tanpa pilihan aktif). */
export function adviceSeverity(advice: Advice[]): Severity {
  const level = adviceLevel(advice);
  const { word, tone } = LEVEL[level];
  return { word, tone, className: tone ? TONES[tone].ink : "text-muted", rank: SEVERITY_RANK[level] };
}

/** Dari saran terhadap pilihan saat ini (generator). */
export function suggestionSeverity(s: Suggestion): Severity {
  if (s.difficulty) return { word: DIFFICULTY_LABEL[s.difficulty], className: TONES[INTENSITY_TONE[s.difficulty]].ink };
  if (s.duration) return { word: "Batasi", className: TONES.warning.ink };
  if (s.type) return { word: "Ganti tipe", className: TONES.warning.ink };
  return { word: "Sesuai", className: TONES.success.ink };
}
