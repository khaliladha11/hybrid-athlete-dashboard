/**
 * Prediksi waktu lomba & saran update zona (docs/PROGRAM-HIDUP.md §4.6–§4.7, keputusan D1). Murni:
 * tanggal dari parameter (WIB).
 *
 * - VDOT Daniels yang sama dengan zona (`lib/run-zones.ts`); waktu per jarak = kebalikan rumus VDOT.
 * - Sumber, urutan prioritas:
 *   1. hasil lomba / time trial di Setting › Zona dalam 90 hari (terbaru);
 *   2. best effort intervals.icu: belum dipakai (satuan kurva pace tidak dijelaskan di dokumentasi API,
 *      dan data per detik jam tidak selalu bisa dipercaya), lihat backlog PRD;
 *   3. lari utuh ≥ 3 km dalam 90 hari (VDOT tertinggi).
 * - Keyakinan: tinggi (hasil lomba), rendah (lari latihan). FM maksimal rendah bila long run terjauh
 *   30 hari < 12 km.
 * - Riegel (T2 = T1 × (D2/D1)^1.06) hanya pembanding di detail.
 * - Saran update zona hanya dari hasil lomba: dua hasil berbeda yang terpisah ≥ 14 hari, keduanya
 *   ≥ VDOT zona + 1. Tidak pernah otomatis; ditolak → baru ditawarkan lagi bila VDOT naik ≥ 1 lagi.
 */
import type { RaceResult } from "@/lib/athlete-settings";
import { addDays } from "@/lib/date";
import { isEmptyActivity } from "@/lib/intervals/dedupe";
import type { Activity } from "@/lib/intervals/types";
import { RACE_DISTANCES, timeForVdot, vdot, type RaceDistanceKey } from "@/lib/run-zones";

export const PREDICTION_WINDOW_DAYS = 90;
export const MIN_ACTIVITY_KM = 3;
export const FM_MIN_LONG_RUN_KM = 12;
export const RIEGEL_EXPONENT = 1.06;
/** Kenaikan VDOT minimal untuk tawaran update zona (dan untuk menawarkan lagi setelah ditolak). */
export const ZONE_OFFER_STEP = 1;
export const ZONE_OFFER_GAP_DAYS = 14;

export type Confidence = "tinggi" | "sedang" | "rendah";
const RANK: Record<Confidence, number> = { rendah: 0, sedang: 1, tinggi: 2 };
const lower = (a: Confidence, b: Confidence) => (RANK[a] <= RANK[b] ? a : b);

export type PredictionSource =
  | { kind: "race"; distance: RaceDistanceKey; meters: number; seconds: number; date: string; vdot: number }
  | { kind: "activity"; activityId: string; name: string; meters: number; seconds: number; date: string; vdot: number };

export interface DistancePrediction {
  distance: RaceDistanceKey;
  meters: number;
  /** Perkiraan dari VDOT (detik). */
  seconds: number;
  /** Pembanding Riegel dari performa sumber (detik). */
  riegelSeconds: number;
  confidence: Confidence;
}

export interface Prediction {
  source: PredictionSource;
  vdot: number;
  confidence: Confidence;
  distances: DistancePrediction[];
  /** Lari terjauh 30 hari terakhir (km), untuk catatan FM. */
  longestRunKm?: number;
  /** Keyakinan FM dibatasi karena long run terjauh 30 hari < 12 km. */
  fmLimited: boolean;
}

const metersOf = (d: RaceDistanceKey) => RACE_DISTANCES.find((x) => x.key === d)!.meters;
const dayDiff = (a: string, b: string) => Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
const inWindow = (date: string, today: string) => date <= today && date >= addDays(today, -(PREDICTION_WINDOW_DAYS - 1));

export const raceResultVdot = (r: RaceResult) => vdot(metersOf(r.distance), r.seconds);

/** Sumber 1: hasil lomba terbaru dalam 90 hari; tanggal sama → VDOT tertinggi. */
export function raceSource(results: RaceResult[], today: string): PredictionSource | null {
  const list = results
    .filter((r) => inWindow(r.date, today))
    .map((r) => ({ r, v: raceResultVdot(r) }))
    .sort((a, b) => b.r.date.localeCompare(a.r.date) || b.v - a.v);
  const top = list[0];
  if (!top) return null;
  return { kind: "race", distance: top.r.distance, meters: metersOf(top.r.distance), seconds: top.r.seconds, date: top.r.date, vdot: top.v };
}

/** Sumber 3: lari utuh ≥ 3 km dalam 90 hari dengan VDOT tertinggi (pace wajar 2:30–15:00/km, bukan salinan kosong). */
export function activitySource(activities: Activity[], today: string): PredictionSource | null {
  let best: PredictionSource | null = null;
  for (const a of activities) {
    if (a.category !== "run" || !a.date || !inWindow(a.date, today) || isEmptyActivity(a)) continue;
    const km = a.distanceKm ?? 0;
    const sec = a.movingTimeSec ?? 0;
    if (km < MIN_ACTIVITY_KM || sec <= 0) continue;
    const pace = sec / km;
    if (pace < 150 || pace > 900) continue;
    const v = vdot(km * 1000, sec);
    if (!best || v > best.vdot || (v === best.vdot && a.date > best.date)) {
      best = { kind: "activity", activityId: a.id, name: a.name, meters: km * 1000, seconds: sec, date: a.date, vdot: v };
    }
  }
  return best;
}

export const riegel = (seconds: number, fromMeters: number, toMeters: number) => seconds * Math.pow(toMeters / fromMeters, RIEGEL_EXPONENT);

/** Lari terjauh dalam `days` hari terakhir (km). */
export function longestRunKm(activities: Activity[], today: string, days = 30): number | undefined {
  const from = addDays(today, -(days - 1));
  const km = Math.max(0, ...activities.filter((a) => a.category === "run" && a.date && a.date >= from && a.date <= today).map((a) => a.distanceKm ?? 0));
  return km > 0 ? Math.round(km * 10) / 10 : undefined;
}

export function predictRaces({ raceResults, activities, today }: { raceResults: RaceResult[]; activities: Activity[]; today: string }): Prediction | null {
  const source = raceSource(raceResults, today) ?? activitySource(activities, today);
  if (!source) return null;
  const confidence: Confidence = source.kind === "race" ? "tinggi" : "rendah";
  const longest = longestRunKm(activities, today);
  const fmLimited = longest === undefined || longest < FM_MIN_LONG_RUN_KM;
  const distances = RACE_DISTANCES.map((d) => ({
    distance: d.key,
    meters: d.meters,
    seconds: Math.round(timeForVdot(d.meters, source.vdot)),
    riegelSeconds: Math.round(riegel(source.seconds, source.meters, d.meters)),
    confidence: d.key === "fm" && fmLimited ? lower(confidence, "rendah") : confidence,
  }));
  return { source, vdot: source.vdot, confidence, distances, ...(longest !== undefined ? { longestRunKm: longest } : {}), fmLimited };
}

export type TargetGap = { onTrack: true } | { onTrack: false; secPerKm: number };

/** Selisih perkiraan terhadap target: di jalur, atau perlu sekian detik/km lebih cepat (dibulatkan ke atas). */
export function targetGap(predictedSec: number, goalSec: number, meters: number): TargetGap {
  if (predictedSec <= goalSec) return { onTrack: true };
  return { onTrack: false, secPerKm: Math.ceil((predictedSec - goalSec) / (meters / 1000)) };
}

export interface ZoneOffer {
  /** Hasil terbaru yang dipakai untuk zona baru. */
  result: RaceResult;
  vdot: number;
  zoneVdot: number;
}

/**
 * Tawaran update zona (§4.7): butuh dua hasil lomba berbeda dalam 90 hari yang terpisah ≥ 14 hari,
 * keduanya VDOT ≥ VDOT zona + 1. Hasil terbaru yang dipakai. Ditolak di VDOT x → ditawarkan lagi
 * hanya bila VDOT hasil terbaru ≥ x + 1.
 */
export function zoneOffer({
  raceResults,
  zoneVdot,
  dismissedVdot,
  today,
}: {
  raceResults: RaceResult[];
  zoneVdot: number | undefined;
  dismissedVdot?: number;
  today: string;
}): ZoneOffer | null {
  if (zoneVdot === undefined) return null;
  const up = raceResults
    .filter((r) => inWindow(r.date, today))
    .map((r) => ({ r, v: raceResultVdot(r) }))
    .filter((x) => x.v >= zoneVdot + ZONE_OFFER_STEP)
    .sort((a, b) => b.r.date.localeCompare(a.r.date) || b.v - a.v);
  const latest = up[0];
  if (!latest || !up.some((x) => dayDiff(latest.r.date, x.r.date) >= ZONE_OFFER_GAP_DAYS)) return null;
  if (dismissedVdot !== undefined && latest.v < dismissedVdot + ZONE_OFFER_STEP) return null;
  return { result: latest.r, vdot: latest.v, zoneVdot };
}
