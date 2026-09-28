/** Semua tanggal di app memakai WIB (UTC+7) dalam format YYYY-MM-DD. */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function toWibDate(d: Date = new Date()): string {
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayWib(now: Date = new Date()): string {
  return toWibDate(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Senin dari minggu yang memuat `date` (minggu = Senin–Minggu). */
export function startOfWeekMonday(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Minggu
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

/** Ambil bagian tanggal dari "2026-09-28T06:12:00" (start_date_local intervals.icu). */
export function datePart(local: string | undefined): string | undefined {
  return local && /^\d{4}-\d{2}-\d{2}/.test(local) ? local.slice(0, 10) : undefined;
}

const DAY_FMT = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function formatDateId(date: string | undefined): string {
  if (!date) return "—";
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "—" : DAY_FMT.format(d);
}

export function formatTimeOfDay(local: string | undefined): string {
  const m = local?.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "";
}
