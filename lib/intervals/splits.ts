import type { ActivitySplit } from "./types";

export type StreamMap = Partial<Record<string, (number | null)[]>>;

/** Kecepatan di bawah ini dianggap berhenti (≈ 33 menit/km), tidak dihitung moving time. */
export const MIN_MOVING_SPEED = 0.5;
/** Sisa terakhir yang lebih pendek dari ini tidak dijadikan split. */
export const MIN_LAST_SPLIT_M = 50;

/** Respons `/activity/{id}/streams` (array `{ type, data }`) → map per tipe. */
export function parseStreams(raw: unknown): StreamMap {
  const map: StreamMap = {};
  if (!Array.isArray(raw)) return map;
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const { type, data } = s as { type?: unknown; data?: unknown };
    if (typeof type !== "string" || !Array.isArray(data)) continue;
    map[type] = data.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
  }
  return map;
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
