/**
 * Zona pace lari (murni).
 *
 * Default dihitung dari hasil lomba/time trial dengan rumus VDOT Daniels & Gilbert
 * (Oxygen Power, 1979; Daniels' Running Formula, 3rd ed., 2014):
 *   VO2(v)   = −4.60 + 0.182258·v + 0.000104·v²            (v = m/menit)
 *   %VO2max(t) = 0.8 + 0.1894393·e^(−0.012778·t) + 0.2989558·e^(−0.1932605·t)   (t = menit)
 *   VDOT     = VO2(v) / %VO2max(t)
 * Pace latihan = kecepatan saat VO2 = persentase VDOT tertentu:
 *   Easy 59–74%, Tempo/Threshold 83–88%, Interval 95–100% (Daniels).
 *   Norwegian 4×4 dikerjakan di 90–95% HRmax (Helgerud dkk. 2007) — di antara
 *   pace Threshold dan Interval Daniels, sehingga dipakai 88–92% VDOT.
 */

export const ZONE_KEYS = ["easy", "tempo", "miniInterval", "norwegian4x4"] as const;
export type ZoneKey = (typeof ZONE_KEYS)[number];

export const ZONE_LABEL: Record<ZoneKey, string> = {
  easy: "Easy / Z2",
  tempo: "Tempo (threshold)",
  miniInterval: "Interval (mini, 15/15, 30/30)",
  norwegian4x4: "Norwegian 4×4",
};

/** Rentang %VDOT per zona: [batas lambat, batas cepat]. */
export const ZONE_INTENSITY: Record<ZoneKey, [number, number]> = {
  easy: [0.59, 0.74],
  tempo: [0.83, 0.88],
  miniInterval: [0.95, 1.0],
  norwegian4x4: [0.88, 0.92],
};

export const ZONE_SOURCE: Record<ZoneKey, string> = {
  easy: "Daniels: Easy 59–74% VO2max",
  tempo: "Daniels: Threshold 83–88% VO2max",
  miniInterval: "Daniels: Interval 95–100% VO2max",
  norwegian4x4: "Helgerud 2007: 90–95% HRmax ≈ 88–92% VDOT",
};

export const RACE_DISTANCES = [
  { key: "5k", label: "5K", meters: 5000 },
  { key: "10k", label: "10K", meters: 10000 },
  { key: "hm", label: "Half Marathon", meters: 21097.5 },
  { key: "fm", label: "Marathon", meters: 42195 },
] as const;
export type RaceDistanceKey = (typeof RACE_DISTANCES)[number]["key"];

const vo2AtSpeed = (v: number) => -4.6 + 0.182258 * v + 0.000104 * v * v;
const fractionSustainable = (t: number) => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);

/** VDOT dari jarak (m) & waktu (detik). */
export function vdot(meters: number, seconds: number): number {
  const t = seconds / 60;
  return vo2AtSpeed(meters / t) / fractionSustainable(t);
}

/**
 * Waktu (detik) untuk jarak `meters` pada VDOT tertentu: kebalikan `vdot()` lewat bisection.
 * VDOT turun monoton terhadap waktu di rentang pace 2:00–20:00/km, jadi hasilnya tunggal.
 */
export function timeForVdot(meters: number, vdotValue: number): number {
  let lo = (meters / 1000) * 120;
  let hi = (meters / 1000) * 1200;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdot(meters, mid) > vdotValue) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** VDOT yang membuat `secPerKm` jatuh di persentase VDOT `fraction` (kebalikan `paceAtFraction`). */
export function vdotAtPace(secPerKm: number, fraction: number): number {
  return vo2AtSpeed(60000 / secPerKm) / fraction;
}

/** VDOT yang setara dengan zona tempo tersimpan: batas cepat di 88%, batas lambat di 83%, dirata-rata. */
export function zoneVdot(tempo: PaceRange): number {
  const [slow, fast] = ZONE_INTENSITY.tempo;
  return (vdotAtPace(tempo.fast, fast) + vdotAtPace(tempo.slow, slow)) / 2;
}

/** Pace (detik/km) pada persentase VDOT tertentu. */
export function paceAtFraction(vdotValue: number, fraction: number): number {
  const target = vdotValue * fraction;
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - target;
  const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); // m/menit
  return (1000 / v) * 60;
}

/** Rentang pace satu zona: { fast, slow } dalam detik/km. */
export interface PaceRange {
  fast: number;
  slow: number;
}

export function zonesFromVdot(v: number): Record<ZoneKey, PaceRange> {
  const out = {} as Record<ZoneKey, PaceRange>;
  for (const k of ZONE_KEYS) {
    const [lo, hi] = ZONE_INTENSITY[k];
    out[k] = { fast: Math.round(paceAtFraction(v, hi)), slow: Math.round(paceAtFraction(v, lo)) };
  }
  return out;
}

export function formatPace(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "6:15–6:30/km" atau "5:50/km" (cepat dulu, seperti di profil). */
export function formatRange(r: PaceRange): string {
  return r.fast === r.slow ? `${formatPace(r.fast)}/km` : `${formatPace(r.fast)}–${formatPace(r.slow)}/km`;
}

/** "m:ss" → detik; undefined bila tidak valid (2:30–15:00/km). */
export function parsePace(text: string): number | undefined {
  const m = text.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return undefined;
  const sec = Number(m[1]) * 60 + Number(m[2]);
  return sec >= 150 && sec <= 900 ? sec : undefined;
}

/** Parse string zona profil ("8:00–8:50/km", "5:50/km") → rentang. */
export function parseRange(text: string | undefined): PaceRange | undefined {
  if (!text) return undefined;
  const parts = text.replace(/\/km$/i, "").split(/[–-]/).map((p) => parsePace(p));
  if (parts.some((p) => p === undefined) || !parts.length || parts.length > 2) return undefined;
  const [a, b = a] = parts as number[];
  return { fast: Math.min(a, b), slow: Math.max(a, b) };
}

/** "h:mm:ss" atau "mm:ss" → detik. */
export function parseDuration(text: string): number | undefined {
  const parts = text.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return undefined;
  const [h, m, s] = parts.length === 3 ? parts.map(Number) : [0, ...parts.map(Number)];
  if ((parts.length === 3 && m >= 60) || s >= 60) return undefined;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : undefined;
}
