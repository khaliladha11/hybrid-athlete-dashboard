/**
 * Konteks blok periodisasi (mesocycle) ala Bompa: beberapa minggu beban naik
 * lalu satu minggu deload. Murni berbasis tanggal — tidak butuh database.
 */
export interface BlockContext {
  /** Blok ke berapa sejak `blockStart` (0 = blok pertama). */
  index: number;
  /** Minggu ke dalam blok, mulai 1. */
  week: number;
  weeks: number;
  deload: boolean;
}

export const DEFAULT_BLOCK: BlockContext = { index: 0, week: 1, weeks: 4, deload: false };

const DAY_MS = 86_400_000;

export function blockContext(today: string, blockStart?: string, weeks = 4): BlockContext {
  const w = Number.isInteger(weeks) && weeks >= 2 ? weeks : 4;
  const start = blockStart && /^\d{4}-\d{2}-\d{2}$/.test(blockStart) ? blockStart : today;
  const days = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS);
  if (!Number.isFinite(days) || days < 0) return { ...DEFAULT_BLOCK, weeks: w };
  const totalWeeks = Math.floor(days / 7);
  const week = (totalWeeks % w) + 1;
  return { index: Math.floor(totalWeeks / w), week, weeks: w, deload: week === w };
}

export function blockLabel(b: BlockContext): string {
  return `Blok ${b.index + 1} · Minggu ${b.week}/${b.weeks}${b.deload ? " · Deload" : ""}`;
}
