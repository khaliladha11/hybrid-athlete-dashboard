/**
 * Satu sumber warna untuk status & intensitas (dipakai konsisten di seluruh app).
 *  - Intensitas: Easy = hijau, Moderate = kuning, High = merah.
 *  - Status boolean: true/aktif = hijau, false/nonaktif = merah.
 * Kelas literal ditulis lengkap supaya terdeteksi Tailwind.
 */
import type { Difficulty } from "@/lib/generator/types";

export type Tone = "success" | "warning" | "danger";

export interface ToneClasses {
  /** Isi solid (bar, titik, track switch). */
  fill: string;
  /** Latar lembut (pill, opsi aktif). */
  soft: string;
  /** Teks berwarna yang tetap kontras di latar terang & gelap. */
  ink: string;
  border: string;
}

export const TONES: Record<Tone, ToneClasses> = {
  success: { fill: "bg-success", soft: "bg-success-soft", ink: "text-success-ink", border: "border-success" },
  warning: { fill: "bg-warning", soft: "bg-warning-soft", ink: "text-warning-ink", border: "border-warning" },
  danger: { fill: "bg-danger", soft: "bg-danger-soft", ink: "text-danger-ink", border: "border-danger" },
};

export const INTENSITY_TONE: Record<Difficulty, Tone> = { easy: "success", moderate: "warning", high: "danger" };

export const statusTone = (ok: boolean): Tone => (ok ? "success" : "danger");

/** Pill kecil berwarna, mis. label kesulitan atau status. */
export function pillClasses(tone: Tone): string {
  const t = TONES[tone];
  return `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${t.soft} ${t.ink}`;
}
