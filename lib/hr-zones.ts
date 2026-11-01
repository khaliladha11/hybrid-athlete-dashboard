/**
 * Zona HR lari dan RPE ST yang bisa diubah di Setting › Zona (0.17, docs/RELEASE-1.0.md #7). Murni.
 *
 * Model 5 zona: batas atas Z1–Z4 (bpm, inklusif), Z5 di atasnya. Sumber angka:
 * - **Bawaan aplikasi**: angka konservatif generator sejak 0.8 (Easy < 140, Tempo 160–170, pemulihan < 130).
 * - **Dari LTHR**: zona lari Friel (Z1 < 85%, Z2 85–89%, Z3 90–94%, Z4 95–99%, Z5 ≥ 100% LTHR).
 *   Friel J. The Triathlete's Training Bible, 4th ed., 2016; "Quick Guide to Setting Zones" (TrainingPeaks).
 * - **Dari HR maks**: lima zona %HRmax (Z1 50–59%, Z2 60–69%, Z3 70–79%, Z4 80–89%, Z5 90–100%).
 *   Edwards S. The Heart Rate Monitor Book, 1993.
 * - **Manual**.
 *
 * Zona hanya mengubah **target workout dan tampilan**. Ambang lari berat untuk saran tetap 90% LTHR atau 155 bpm
 * (`lib/thresholds.ts`, 0.15.2); RELEASE-1.0 §11 #1 dan R8.
 *
 * RPE ST per level bisa diubah dalam 4–7: PRD §3 "RPE ≤ 7 untuk semua set" tetap dijaga `sanitizeStrength`.
 */
import type { Difficulty } from "./generator/types";

export const HR_ZONE_MODES = ["default", "lthr", "maxHr", "manual"] as const;
export type HrZoneMode = (typeof HR_ZONE_MODES)[number];

export const HR_MODE_LABEL: Record<HrZoneMode, string> = { default: "Bawaan", lthr: "LTHR", maxHr: "HR maks", manual: "Manual" };
export const HR_MODE_SOURCE: Record<HrZoneMode, string> = {
  default: "Angka konservatif aplikasi: Easy di bawah 140, Tempo 160–170.",
  lthr: "Zona lari Friel dari LTHR: Z2 85–89%, Z4 95–99%, Z5 dari 100%.",
  maxHr: "Lima zona dari HR maks (Edwards): Z2 60–69%, Z4 80–89%, Z5 dari 90%.",
  manual: "Batas atas Z1 sampai Z4 diisi sendiri.",
};

/** Batas atas Z1–Z4 (bpm, inklusif). */
export type ZoneTops = [number, number, number, number];

export interface HrZoneSettings {
  mode: HrZoneMode;
  lthr?: number;
  maxHr?: number;
  /** Mode manual. */
  tops?: ZoneTops;
}

export const DEFAULT_TOPS: ZoneTops = [129, 139, 159, 170];
/** Batas bawah Z2–Z5 sebagai fraksi acuan. */
export const LTHR_PCT = [0.85, 0.9, 0.95, 1.0] as const;
export const MAXHR_PCT = [0.6, 0.7, 0.8, 0.9] as const;

export const BPM_MIN = 80;
export const BPM_MAX = 230;
export const LTHR_RANGE = [100, 220] as const;
export const MAXHR_RANGE = [120, 230] as const;
const MIN_WIDTH = 3;

const fromPct = (ref: number, pct: readonly number[]): ZoneTops => pct.map((p) => Math.round(ref * p) - 1) as ZoneTops;
const inRange = (v: unknown, [lo, hi]: readonly [number, number]): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

/**
 * Kesalahan per batas (indeks Z1–Z4); null = baik. Batas naik ketat dan tiap zona ≥ 3 bpm, jadi zona tidak pernah
 * tumpang tindih.
 */
export function validateTops(t: readonly number[]): (string | null)[] {
  return [0, 1, 2, 3].map((i) => {
    const v = t[i];
    if (typeof v !== "number" || !Number.isInteger(v)) return "Isi angka bpm.";
    if (v < BPM_MIN || v > BPM_MAX) return `Antara ${BPM_MIN} dan ${BPM_MAX} bpm.`;
    if (i > 0 && typeof t[i - 1] === "number" && v < t[i - 1] + MIN_WIDTH) return `Minimal ${t[i - 1] + MIN_WIDTH} bpm, supaya Z${i + 1} tidak tumpang tindih dengan Z${i}.`;
    return null;
  });
}

export const validTops = (t: readonly number[]) => validateTops(t).every((e) => e === null);

/** Kesalahan acuan LTHR / HR maks; null = baik. */
export function validateRef(mode: "lthr" | "maxHr", v: unknown): string | null {
  const r = mode === "lthr" ? LTHR_RANGE : MAXHR_RANGE;
  return inRange(v, r) ? null : `${mode === "lthr" ? "LTHR" : "HR maks"} antara ${r[0]} dan ${r[1]} bpm.`;
}

/** Batas zona efektif dari pengaturan. Pengaturan tidak lengkap atau tidak valid → bawaan. */
export function zoneTops(s: HrZoneSettings | undefined): ZoneTops {
  if (!s) return DEFAULT_TOPS;
  let t: ZoneTops | undefined;
  if (s.mode === "lthr" && inRange(s.lthr, LTHR_RANGE)) t = fromPct(s.lthr, LTHR_PCT);
  else if (s.mode === "maxHr" && inRange(s.maxHr, MAXHR_RANGE)) t = fromPct(s.maxHr, MAXHR_PCT);
  else if (s.mode === "manual" && s.tops) t = s.tops;
  return t && validTops(t) ? t : DEFAULT_TOPS;
}

export interface ZoneRow {
  zone: "Z1" | "Z2" | "Z3" | "Z4" | "Z5";
  lo?: number;
  hi?: number;
}

/** Tabel Z1–Z5: Z1 tanpa batas bawah, Z5 tanpa batas atas. */
export function zoneRows(t: ZoneTops): ZoneRow[] {
  return [
    { zone: "Z1", hi: t[0] },
    { zone: "Z2", lo: t[0] + 1, hi: t[1] },
    { zone: "Z3", lo: t[1] + 1, hi: t[2] },
    { zone: "Z4", lo: t[2] + 1, hi: t[3] },
    { zone: "Z5", lo: t[3] + 1 },
  ];
}

export const zoneRangeText = (r: ZoneRow) => (r.lo === undefined ? `< ${r.hi! + 1}` : r.hi === undefined ? `≥ ${r.lo}` : `${r.lo}–${r.hi}`);

/** Target HR per jenis langkah generator (teks, bpm). */
export interface HrTargets {
  recovery: string;
  easy: string;
  tempo: string;
  norwegian: string;
  interval: string;
  /** Jog lambat 15/15. */
  jogDown: string;
  /** Batas atas Easy (bpm, eksklusif) untuk catatan "Jaga HR < X". */
  easyBelow: number;
}

export function hrTargets(t: ZoneTops): HrTargets {
  const z4 = `${t[2] + 1}–${t[3]}`;
  return {
    recovery: `< ${t[0] + 1}`,
    easy: `< ${t[1] + 1}`,
    tempo: z4,
    norwegian: z4,
    interval: `≥ ${t[2] + 1}`,
    jogDown: `turun ke < ${t[1] + 1}`,
    easyBelow: t[1] + 1,
  };
}

/** Pengaturan dari penyimpanan/sinkron; bentuk rusak → undefined (bawaan). */
export function parseHrZoneSettings(raw: unknown): HrZoneSettings | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (!(HR_ZONE_MODES as readonly unknown[]).includes(r.mode)) return undefined;
  const mode = r.mode as HrZoneMode;
  if (mode === "default") return { mode };
  const out: HrZoneSettings = { mode };
  if (inRange(r.lthr, LTHR_RANGE)) out.lthr = r.lthr;
  if (inRange(r.maxHr, MAXHR_RANGE)) out.maxHr = r.maxHr;
  if (Array.isArray(r.tops) && r.tops.length === 4 && validTops(r.tops)) out.tops = r.tops.slice() as ZoneTops;
  return out;
}

// ---------- RPE ----------

export type StrengthRpe = Record<Difficulty, number>;
export const DEFAULT_STRENGTH_RPE: StrengthRpe = { easy: 5, moderate: 6, high: 7 };
export const STRENGTH_RPE_MIN = 4;
/** PRD §3: RPE ≤ 7 untuk semua set. */
export const STRENGTH_RPE_MAX = 7;

/** RPE lari per level (tampilan; tidak diubah di Setting). */
export const RUN_RPE: { label: string; rpe: string }[] = [
  { label: "Pemulihan, jalan, jog", rpe: "2–3" },
  { label: "Easy", rpe: "3–4" },
  { label: "Tempo", rpe: "6–7" },
  { label: "Interval, Norwegian 4×4", rpe: "7–8" },
];

/** Kesalahan per level; null = baik. Nilai 4–7, tidak turun dari level sebelumnya. */
export function validateStrengthRpe(r: Partial<Record<Difficulty, unknown>>): Record<Difficulty, string | null> {
  const order: Difficulty[] = ["easy", "moderate", "high"];
  const out = {} as Record<Difficulty, string | null>;
  order.forEach((d, i) => {
    const v = r[d];
    const prev = i > 0 ? r[order[i - 1]] : undefined;
    if (typeof v !== "number" || !Number.isInteger(v)) out[d] = "Isi angka.";
    else if (v < STRENGTH_RPE_MIN || v > STRENGTH_RPE_MAX) out[d] = `RPE ${STRENGTH_RPE_MIN} sampai ${STRENGTH_RPE_MAX}.`;
    else if (typeof prev === "number" && v < prev) out[d] = "Tidak boleh lebih ringan dari level sebelumnya.";
    else out[d] = null;
  });
  return out;
}

export function parseStrengthRpe(raw: unknown): StrengthRpe | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const errs = validateStrengthRpe(r);
  if (Object.values(errs).some(Boolean)) return undefined;
  return { easy: r.easy as number, moderate: r.moderate as number, high: r.high as number };
}

/** RPE sesi ST: level pengguna; deload turun satu (minimal 5) tanpa pernah naik dari nilai pengguna. Maks 7. */
export function strengthRpeFor(levels: StrengthRpe, difficulty: Difficulty, deload: boolean): number {
  const v = Math.min(STRENGTH_RPE_MAX, levels[difficulty]);
  return deload ? Math.min(v, Math.max(5, v - 1)) : v;
}
