/**
 * Logika murni mode offline (0.16, docs/RELEASE-1.0.md #1). Tanpa I/O: waktu & status dari parameter.
 *
 * - "Data terakhir {waktu}": waktu render halaman (data intervals.icu di HTML), ditampilkan hanya saat offline.
 * - Prompt versi baru tidak muncul selama sesi latihan berjalan atau di halaman mode latihan; tidak ada reload paksa.
 * - Masukan generator terakhir dipulihkan hanya saat halaman dibuka offline, supaya workout yang sama muncul lagi.
 */
import { DIFFICULTIES, STRENGTH_TYPES, type Difficulty, type Duration, type StrengthType } from "./generator/types";
import { WIB_OFFSET_MS } from "./date";

const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const pad = (n: number) => String(n).padStart(2, "0");

/** "Data terakhir hari ini 07.12" / "kemarin 21.03" / "28 Okt 07.12" (WIB). */
export function snapshotText(iso: string, nowMs: number): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const w = new Date(t + WIB_OFFSET_MS);
  const n = new Date(nowMs + WIB_OFFSET_MS);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const time = `${pad(w.getUTCHours())}.${pad(w.getUTCMinutes())}`;
  const yesterday = day(new Date(n.getTime() - 86_400_000));
  const when = day(w) === day(n) ? "hari ini" : day(w) === yesterday ? "kemarin" : DAY.format(w).replace(".", "");
  return `Data terakhir ${when} ${time}. Saran dan angka dari intervals.icu belum diperbarui.`;
}

/** Prompt "Versi baru tersedia" boleh tampil? Tidak selama latihan berjalan (tidak ada reload di tengah sesi). */
export function shouldPromptUpdate(o: { path: string; activeWorkout: boolean }): boolean {
  if (o.activeWorkout) return false;
  return !o.path.startsWith("/strength/sesi");
}

export const DURATIONS: readonly Duration[] = [30, 45, 60];

export interface RunInputs {
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
}
export interface StrengthInputs extends RunInputs {
  type: StrengthType;
}

const isSeed = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 2 ** 32;

/** Masukan generator tersimpan → nilai valid, atau null. */
export function parseRunInputs(raw: string | null): RunInputs | null {
  try {
    const v = JSON.parse(raw ?? "") as Record<string, unknown>;
    if (!DURATIONS.includes(v.duration as Duration) || !DIFFICULTIES.includes(v.difficulty as Difficulty) || !isSeed(v.seed)) return null;
    return { duration: v.duration as Duration, difficulty: v.difficulty as Difficulty, seed: v.seed };
  } catch {
    return null;
  }
}

export function parseStrengthInputs(raw: string | null): StrengthInputs | null {
  const base = parseRunInputs(raw);
  if (!base) return null;
  const type = (JSON.parse(raw!) as Record<string, unknown>).type;
  return STRENGTH_TYPES.includes(type as StrengthType) ? { ...base, type: type as StrengthType } : null;
}

/** Pulihkan masukan terakhir hanya saat dibuka offline dan tanpa isian dari program (prefill menang). */
export const restoreOffline = <T>(saved: T | null, o: { offline: boolean; prefilled: boolean }): T | null => (o.offline && !o.prefilled ? saved : null);
