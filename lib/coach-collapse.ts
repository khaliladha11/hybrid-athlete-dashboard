/**
 * Kartu Saran Gita yang bisa dilipat di Profil (1.1.0). Murni; penyimpanan localStorage ada di komponen.
 *
 * - Dilipat hanya bila isinya banyak: lebih dari satu saran, atau alasan yang panjang.
 * - Pilihan buka/tutup diingat per hari (WIB). Hari baru mulai tertutup.
 * - Saran baru yang lebih berat dari saat kartu terakhir dilihat membuka kartu otomatis.
 */
import type { Advice } from "./coach";

/** Urutan berat saran Profil: Info < Batasi < Turunkan < Easy (sama dengan `adviceSeverity`). */
export type CoachLevel = "info" | "limit" | "lower" | "easy";
export const SEVERITY_RANK: Record<CoachLevel, number> = { info: 0, limit: 1, lower: 2, easy: 3 };

/** Alasan lebih panjang dari ini dianggap panjang (±2 baris di layar 375px). */
export const LONG_REASON = 140;

export function adviceLevel(advice: Pick<Advice, "maxDifficulty" | "lowerBy" | "maxDuration">[]): CoachLevel {
  if (advice.some((a) => a.maxDifficulty === "easy")) return "easy";
  if (advice.some((a) => a.lowerBy)) return "lower";
  if (advice.some((a) => a.maxDuration)) return "limit";
  return "info";
}

export function isCollapsible(advice: Pick<Advice, "message">[]): boolean {
  return advice.length > 1 || advice.some((a) => a.message.length > LONG_REASON);
}

/** Saran paling berat (urutan asli bila sama): kalimat utama saat kartu tertutup. */
export function mainAdvice<T extends Pick<Advice, "maxDifficulty" | "lowerBy" | "maxDuration">>(advice: T[]): T | undefined {
  let best: T | undefined;
  for (const a of advice) if (!best || SEVERITY_RANK[adviceLevel([a])] > SEVERITY_RANK[adviceLevel([best])]) best = a;
  return best;
}

export interface CoachCollapseState {
  /** Tanggal WIB saat pilihan dibuat. */
  date: string;
  open: boolean;
  /** Rank severity saat kartu terakhir dilihat. */
  rank: number;
}

/** Kartu terbuka? Beda hari = tertutup; rank naik = terbuka otomatis; selain itu pilihan tersimpan. */
export function coachOpen(stored: CoachCollapseState | null, today: string, rank: number): boolean {
  if (!stored || stored.date !== today) return false;
  if (rank > stored.rank) return true;
  return stored.open;
}

/** Status yang disimpan setelah dilihat (`open` = keadaan sekarang) atau setelah tombol ditekan. */
export function nextCollapseState(today: string, open: boolean, rank: number): CoachCollapseState {
  return { date: today, open, rank };
}

/** Baca nilai tersimpan dengan aman; bentuk salah = null. */
export function parseCollapseState(raw: string | null): CoachCollapseState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<CoachCollapseState>;
    return typeof v.date === "string" && typeof v.open === "boolean" && typeof v.rank === "number" ? { date: v.date, open: v.open, rank: v.rank } : null;
  } catch {
    return null;
  }
}
