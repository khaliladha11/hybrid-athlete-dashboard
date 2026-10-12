/**
 * Kata severity untuk label "SARAN HARI INI · …" (UI saja; logika saran tetap di lib/coach).
 * Warna = tone intensitas/status, bukan warna chrome.
 */
import type { Advice, Suggestion } from "@/lib/coach";
import { DIFFICULTY_LABEL } from "@/lib/generator/types";
import { INTENSITY_TONE, TONES } from "@/components/ui/tones";

export interface Severity {
  word: string;
  className: string;
}

/** Dari daftar saran (Profil, tanpa pilihan aktif). */
export function adviceSeverity(advice: Advice[]): Severity {
  if (advice.some((a) => a.maxDifficulty === "easy")) return { word: "Easy", className: TONES.success.ink };
  if (advice.some((a) => a.lowerBy)) return { word: "Turunkan", className: TONES.warning.ink };
  if (advice.some((a) => a.maxDuration)) return { word: "Batasi", className: TONES.warning.ink };
  return { word: "Info", className: "text-muted" };
}

/** Dari saran terhadap pilihan saat ini (generator). */
export function suggestionSeverity(s: Suggestion): Severity {
  if (s.difficulty) return { word: DIFFICULTY_LABEL[s.difficulty], className: TONES[INTENSITY_TONE[s.difficulty]].ink };
  if (s.duration) return { word: "Batasi", className: TONES.warning.ink };
  if (s.type) return { word: "Ganti tipe", className: TONES.warning.ink };
  return { word: "Sesuai", className: TONES.success.ink };
}
