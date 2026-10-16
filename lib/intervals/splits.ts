import type { ActivitySplit } from "./types";

export type StreamMap = Partial<Record<string, (number | null)[]>>;

/** Kecepatan di bawah ini dianggap berhenti (≈ 33 menit/km), tidak dihitung moving time. */
export const MIN_MOVING_SPEED = 0.5;
/** Sisa terakhir yang lebih pendek dari ini tidak dijadikan split. */
export const MIN_LAST_SPLIT_M = 50;

const nums = (data: unknown[]) => data.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));

/** Respons `/activity/{id}/streams` (array `{ type, data }`) → map per tipe. `latlng` dipecah jadi `lat` & `lng`. */
export function parseStreams(raw: unknown): StreamMap {
  const map: StreamMap = {};
  if (!Array.isArray(raw)) return map;
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const { type, data, data2 } = s as { type?: unknown; data?: unknown; data2?: unknown };
    if (typeof type !== "string" || !Array.isArray(data)) continue;
    if (type === "latlng") {
      // intervals.icu: latitude di data, longitude di data2.
      map.lat = nums(data);
      if (Array.isArray(data2)) map.lng = nums(data2);
      continue;
    }
    map[type] = nums(data);
  }
  return map;
}

function validPairs(time: (number | null)[], values: (number | null)[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < Math.min(time.length, values.length); i++) {
    const t = time[i];
    const v = values[i];
    if (t !== null && v !== null) out.push([t, v]);
  }
  return out;
}

/**
 * Jarak yang naik persis sebanding waktu: sumber hanya punya total jarak lalu dibagi rata
 * (terjadi pada data Huawei di intervals.icu). Split dari data seperti ini pasti sama semua.
 */
export function isEvenlySpread(time: (number | null)[], distance: (number | null)[]): boolean {
  const pts = validPairs(time, distance);
  if (pts.length < 3) return false;
  const [t0, d0] = pts[0];
  const [t1, d1] = pts[pts.length - 1];
  if (t1 <= t0 || d1 <= d0) return false;
  const rate = (d1 - d0) / (t1 - t0);
  let maxDev = 0;
  for (const [t, d] of pts) maxDev = Math.max(maxDev, Math.abs(d - (d0 + rate * (t - t0))));
  return maxDev <= Math.max(2, 0.001 * (d1 - d0));
}

const EARTH_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(a));
}

/** Jarak kumulatif (m) dari koordinat GPS. Titik kosong atau (0, 0) memakai jarak terakhir. */
export function gpsDistance(lat?: (number | null)[], lng?: (number | null)[]): (number | null)[] | undefined {
  if (!lat?.length || !lng?.length) return undefined;
  const out: (number | null)[] = [];
  let total = 0;
  let prev: [number, number] | undefined;
  for (let i = 0; i < Math.min(lat.length, lng.length); i++) {
    const a = lat[i];
    const b = lng[i];
    if (a === null || b === null || (a === 0 && b === 0) || Math.abs(a) > 90 || Math.abs(b) > 180) {
      out.push(prev ? total : null);
      continue;
    }
    if (prev) total += haversine(prev[0], prev[1], a, b);
    prev = [a, b];
    out.push(total);
  }
  return total > 0 ? out : undefined;
}

export type SplitSource = "distance" | "gps";
/** Kenapa split kosong: tidak ada stream sama sekali, atau jarak hanya dibagi rata tanpa GPS. */
export type SplitIssue = "no-streams" | "no-gps";

/**
 * Pilih stream jarak yang bisa dipercaya lalu hitung split: stream distance bila asli, kalau
 * hanya dibagi rata pakai GPS (diskalakan ke total jarak aktivitas supaya jumlahnya sama).
 */
export function splitsFromStreams(streams: StreamMap, totalM?: number): { splits: ActivitySplit[]; source?: SplitSource; issue?: SplitIssue } {
  const { time, distance } = streams;
  if (!time?.length) return { splits: [], issue: "no-streams" };
  if (distance?.length && !isEvenlySpread(time, distance)) return { splits: kmSplits(streams), source: "distance" };
  const gps = gpsDistance(streams.lat, streams.lng);
  if (gps && !isEvenlySpread(time, gps)) {
    const last = gps.reduce<number>((m, v) => (v !== null && v > m ? v : m), 0);
    const k = totalM && last ? totalM / last : 1;
    return { splits: kmSplits({ ...streams, distance: gps.map((v) => (v === null ? null : v * k)) }), source: "gps" };
  }
  return { splits: [], issue: distance?.length || gps ? "no-gps" : "no-streams" };
}

interface Acc {
  dist: number;
  moving: number;
  hrSum: number;
  hrTime: number;
  cadSum: number;
  cadTime: number;
}

const emptyAcc = (): Acc => ({ dist: 0, moving: 0, hrSum: 0, hrTime: 0, cadSum: 0, cadTime: 0 });

function toSplit(index: number, a: Acc): ActivitySplit {
  return {
    index,
    distanceKm: a.dist / 1000,
    movingTimeSec: Math.round(a.moving),
    avgPaceSecPerKm: a.moving > 0 && a.dist > 0 ? a.moving / (a.dist / 1000) : undefined,
    avgHr: a.hrTime > 0 ? a.hrSum / a.hrTime : undefined,
    // Satuan sama dengan stream (bisa per-kaki); dinormalisasi di normalizeActivityDetail.
    cadenceSpm: a.cadTime > 0 ? a.cadSum / a.cadTime : undefined,
  };
}

/**
 * Split per `splitM` meter (default 1 km) dari stream time + distance, seperti split di Strava/Garmin.
 * Waktu split = moving time (jeda dan berdiri diam tidak dihitung). Titik batas km diinterpolasi
 * di dalam sampel. HR & cadence = rata-rata berbobot waktu. Sisa di akhir jadi split parsial.
 */
export function kmSplits(streams: StreamMap, splitM = 1000): ActivitySplit[] {
  const time = streams.time;
  const dist = streams.distance;
  if (!time?.length || !dist?.length) return [];
  const hr = streams.heartrate;
  const cad = streams.cadence;

  const splits: ActivitySplit[] = [];
  let acc = emptyAcc();
  let prevT: number | undefined;
  let prevD: number | undefined;
  let boundary = Number.NaN;

  const add = (dd: number, dt: number, moving: boolean, h: number | null | undefined, c: number | null | undefined) => {
    acc.dist += dd;
    if (!moving || dt <= 0) return;
    acc.moving += dt;
    if (h && h > 0) {
      acc.hrSum += h * dt;
      acc.hrTime += dt;
    }
    if (c && c > 0) {
      acc.cadSum += c * dt;
      acc.cadTime += dt;
    }
  };

  const n = Math.min(time.length, dist.length);
  for (let i = 0; i < n; i++) {
    const t = time[i];
    const d = dist[i];
    if (t === null || d === null) continue;
    if (prevT === undefined || prevD === undefined) {
      prevT = t;
      prevD = d;
      boundary = d + splitM;
      continue;
    }
    const dt = t - prevT;
    const dd = d - prevD;
    if (dt <= 0 || dd < 0) {
      // Waktu mundur atau jarak berkurang (data rusak): lompati sampel ini.
      prevT = t;
      prevD = Math.max(d, prevD);
      continue;
    }
    const moving = dd / dt >= MIN_MOVING_SPEED;
    let from = prevD;
    let rem = dt;
    while (d >= boundary && from < boundary) {
      const frac = (boundary - from) / (d - from);
      add(boundary - from, rem * frac, moving, hr?.[i], cad?.[i]);
      splits.push(toSplit(splits.length + 1, acc));
      acc = emptyAcc();
      rem -= rem * frac;
      from = boundary;
      boundary += splitM;
    }
    add(d - from, rem, moving, hr?.[i], cad?.[i]);
    prevT = t;
    prevD = d;
  }
  if (acc.dist >= MIN_LAST_SPLIT_M) splits.push(toSplit(splits.length + 1, acc));
  return splits;
}
