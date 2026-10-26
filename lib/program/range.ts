/** Rentang aktivitas tambahan untuk program (docs/PROGRAM-HIDUP.md §4.2). Murni. */
import { addDays } from "@/lib/date";

/** Batas mundur: FM 16 minggu + 30 hari dasar long run, dengan cadangan. */
export const MAX_RANGE_DAYS = 200;

/** `oldest` (YYYY-MM-DD) → jumlah hari sampai hari ini (inklusif), atau null bila tidak valid / terlalu jauh. */
export function rangeDays(oldest: string | null, today: string, max = MAX_RANGE_DAYS): number | null {
  if (!oldest || !/^\d{4}-\d{2}-\d{2}$/.test(oldest) || Number.isNaN(Date.parse(`${oldest}T00:00:00Z`))) return null;
  if (oldest > today || oldest < addDays(today, -(max - 1))) return null;
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${oldest}T00:00:00Z`)) / 86_400_000) + 1;
}
