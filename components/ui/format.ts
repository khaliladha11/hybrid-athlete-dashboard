/**
 * Format tampilan khusus UI "Tag". Sengaja terpisah dari `lib/` (formatPace di lib dipakai
 * test dan Copy Set, jadi tidak diubah).
 */

/** Pace detik/km → `5'50"` (gaya jam Huawei). undefined/0 → "·". */
export function formatPaceTag(sec: number | undefined): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "·";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, "0")}"`;
}

/** Durasi detik → `m:ss` (atau `h:mm:ss` di atas 1 jam). */
export function formatClock(sec: number | undefined): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "·";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}
