import type { ActivitySplit } from "./types";

export type StreamMap = Partial<Record<string, (number | null)[]>>;

/**
 * Ambang bergerak untuk lari = ambang Strava: lebih cepat dari 30:00/mil (≈ 18:38/km, 0,894 m/s).
 * Jalan kaki memakai 0,5 m/s (≈ 33:20/km) supaya jalan santai tidak dianggap berhenti.
 */
export const RUN_MOVING_SPEED = 1609.344 / 1800;
export const WALK_MOVING_SPEED = 0.5;
/** Di atas ini (43 km/jam) bukan lari/jalan: lonjakan GPS atau data rusak, jaraknya tidak dihitung. */
export const MAX_SPEED = 12;
/** Sisa terakhir yang lebih pendek dari ini digabung ke split sebelumnya (jumlah jarak & waktu tetap utuh). */
export const MIN_LAST_SPLIT_M = 50;
/** Jarak GPS dihitung antar titik berselang minimal sekian detik, supaya getaran GPS saat diam tidak menumpuk. */
export const GPS_STEP_SEC = 5;

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

/**
 * Jarak kumulatif (m) dari koordinat GPS. Titik kosong atau (0, 0) memakai jarak terakhir.
 * Bila `time` ada, jarak hanya ditambah antar titik berselang ≥ GPS_STEP_SEC; titik di antaranya
 * memakai jarak titik terakhir, lalu `buildTrack` meratakannya lagi.
 */
export function gpsDistance(lat?: (number | null)[], lng?: (number | null)[], time?: (number | null)[]): (number | null)[] | undefined {
  if (!lat?.length || !lng?.length) return undefined;
  const out: (number | null)[] = [];
  let total = 0;
  let prev: [number, number, number | null] | undefined;
  for (let i = 0; i < Math.min(lat.length, lng.length); i++) {
    const a = lat[i];
    const b = lng[i];
    const t = time?.[i] ?? null;
    if (a === null || b === null || (a === 0 && b === 0) || Math.abs(a) > 90 || Math.abs(b) > 180) {
      out.push(prev ? total : null);
      continue;
    }
    if (prev && prev[2] !== null && t !== null && t - prev[2] < GPS_STEP_SEC) {
      out.push(total);
      continue;
    }
    if (prev) total += haversine(prev[0], prev[1], a, b);
    prev = [a, b, t];
    out.push(total);
  }
  return total > 0 ? out : undefined;
}

export interface Track {
  /** Waktu (detik) tiap sampel valid, naik ketat. */
  t: number[];
  /** Jarak bersih kumulatif (m) mulai 0, sudah diratakan di antara titik-ubah. */
  d: number[];
  /** Langkah sampel k-1 → k dihitung bergerak? (indeks 0 tidak dipakai) */
  moving: boolean[];
  /** Indeks sampel asli, untuk mengambil HR & cadence. */
  src: number[];
  /** Jumlah sampel jarak yang ditolak (turun, atau lebih cepat dari MAX_SPEED sejak perubahan terakhir). */
  rejected: number;
}

/**
 * Bersihkan pasangan time/distance lalu tentukan status bergerak dari kecepatan antar titik vs ambang
 * (seperti gpxpy dan Strava), dengan dua perlindungan untuk data jam:
 *
 * 1. Jarak hanya boleh naik. Kenaikan dibandingkan dengan nilai terakhir yang diterima dan waktu
 *    perubahan terakhir (bukan sampel sebelumnya, supaya lompatan data bertangga tidak dianggap
 *    lonjakan). Sampel yang turun (reset/glitch) atau lebih cepat dari MAX_SPEED ditolak. Bila
 *    sampel berikutnya melanjutkan dari nilai yang ditolak dengan kecepatan wajar, nilai itu jadi
 *    patokan baru (reset atau pergeseran permanen); jaraknya sendiri tidak dihitung.
 * 2. Jarak bertangga (jam memperbarui jarak hanya sesekali: datar lalu melompat) diratakan.
 *    Kecepatan dihitung antar titik di mana jarak benar-benar berubah. Bila kecepatan segmen itu
 *    ≥ ambang, seluruh segmen bergerak dan jaraknya diinterpolasi linear. Bila di bawah ambang,
 *    segmen itu berhenti dan dinilai per sampel seperti biasa.
 */
export function buildTrack(time: (number | null)[], distance: (number | null)[], minSpeed = RUN_MOVING_SPEED): Track | undefined {
  const t: number[] = [];
  const raw: number[] = [];
  const src: number[] = [];
  for (let i = 0; i < Math.min(time.length, distance.length); i++) {
    const ti = time[i];
    const di = distance[i];
    if (ti === null || di === null) continue;
    // Waktu mundur atau kembar: sampel dilewati.
    if (t.length && ti <= t[t.length - 1]) continue;
    t.push(ti);
    raw.push(di);
    src.push(i);
  }
  if (t.length < 2) return undefined;

  // 1. Jarak bersih: hanya kenaikan yang masuk akal.
  const clean = [0];
  let rejected = 0;
  let base = raw[0];
  let tBase = t[0];
  let pending: { raw: number; t: number } | undefined;
  const plausible = (inc: number, dt: number) => inc >= 0 && dt > 0 && inc / dt <= MAX_SPEED;
  for (let k = 1; k < t.length; k++) {
    const inc = raw[k] - base;
    let add = 0;
    if (inc === 0) {
      pending = undefined;
    } else if (plausible(inc, t[k] - tBase)) {
      add = inc;
      base = raw[k];
      tBase = t[k];
      pending = undefined;
    } else if (pending && plausible(raw[k] - pending.raw, t[k] - pending.t)) {
      // Melanjutkan dari nilai yang ditolak: patokan baru, hanya langkah terakhir yang dihitung.
      add = raw[k] - pending.raw;
      base = raw[k];
      tBase = t[k];
      pending = undefined;
    } else {
      rejected++;
      pending = { raw: raw[k], t: t[k] };
    }
    clean.push(clean[k - 1] + add);
  }

  // 2. Segmen antar titik-ubah.
  const d = clean.slice();
  const moving = t.map(() => false);
  const stepMoving = (k: number) => (clean[k] - clean[k - 1]) / (t[k] - t[k - 1]) >= minSpeed;
  let a = 0;
  for (let k = 1; k < t.length; k++) {
    if (clean[k] === clean[k - 1] && k < t.length - 1) continue;
    const v = (clean[k] - clean[a]) / (t[k] - t[a]);
    for (let j = a + 1; j <= k; j++) {
      if (v >= minSpeed) {
        d[j] = clean[a] + v * (t[j] - t[a]);
        moving[j] = true;
      } else {
        moving[j] = stepMoving(j);
      }
    }
    a = k;
  }
  return { t, d, moving, src, rejected };
}

export type SplitSource = "distance" | "gps";
/**
 * Kenapa split kosong: tidak ada stream, jarak hanya dibagi rata tanpa GPS, atau hasilnya tidak
 * cocok dengan ringkasan aktivitas (jumlah jarak/waktu split meleset jauh).
 */
export type SplitIssue = "no-streams" | "no-gps" | "inconsistent";

/** Batas selisih jumlah split vs ringkasan aktivitas sebelum split dianggap tidak bisa dipercaya. */
export const TOTAL_DISTANCE_TOLERANCE = { metres: 100, ratio: 0.05 };
export const TOTAL_TIME_TOLERANCE = { seconds: 120, ratio: 0.1 };

export interface SplitTotals {
  distanceM: number;
  movingSec: number;
}

export const splitTotals = (splits: ActivitySplit[]): SplitTotals => ({
  distanceM: splits.reduce((a, s) => a + s.distanceKm * 1000, 0),
  movingSec: splits.reduce((a, s) => a + s.movingTimeSec, 0),
});

/** Jumlah split cocok dengan ringkasan aktivitas? Nilai ringkasan yang kosong tidak diperiksa. */
export function matchesSummary(totals: SplitTotals, summary: { distanceM?: number; movingSec?: number }): boolean {
  const near = (a: number, b: number, abs: number, ratio: number) => Math.abs(a - b) <= Math.max(abs, ratio * b);
  if (summary.distanceM && !near(totals.distanceM, summary.distanceM, TOTAL_DISTANCE_TOLERANCE.metres, TOTAL_DISTANCE_TOLERANCE.ratio)) return false;
  if (summary.movingSec && !near(totals.movingSec, summary.movingSec, TOTAL_TIME_TOLERANCE.seconds, TOTAL_TIME_TOLERANCE.ratio)) return false;
  return true;
}

/**
 * Pilih stream jarak yang bisa dipercaya lalu hitung split. Urutan: stream distance (bila bukan
 * hasil dibagi rata), lalu GPS (diskalakan ke total jarak aktivitas). Setiap hasil dicek terhadap
 * ringkasan aktivitas; yang tidak cocok tidak ditampilkan.
 */
export function splitsFromStreams(
  streams: StreamMap,
  summary: { distanceM?: number; movingSec?: number; minSpeed?: number } = {},
): { splits: ActivitySplit[]; source?: SplitSource; issue?: SplitIssue } {
  const { time, distance } = streams;
  if (!time?.length) return { splits: [], issue: "no-streams" };
  const minSpeed = summary.minSpeed ?? RUN_MOVING_SPEED;
  let tried = false;

  if (distance?.length && !isEvenlySpread(time, distance)) {
    tried = true;
    const splits = kmSplits(streams, 1000, minSpeed);
    if (splits.length && matchesSummary(splitTotals(splits), summary)) return { splits, source: "distance" };
  }
  const gps = gpsDistance(streams.lat, streams.lng, time);
  if (gps && !isEvenlySpread(time, gps)) {
    tried = true;
    const last = gps.reduce<number>((m, v) => (v !== null && v > m ? v : m), 0);
    const k = summary.distanceM && last ? summary.distanceM / last : 1;
    const splits = kmSplits({ ...streams, distance: gps.map((v) => (v === null ? null : v * k)) }, 1000, minSpeed);
    if (splits.length && matchesSummary(splitTotals(splits), summary)) return { splits, source: "gps" };
  }
  if (tried) return { splits: [], issue: "inconsistent" };
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
    movingTimeSec: a.moving,
    avgPaceSecPerKm: a.moving > 0 && a.dist > 0 ? a.moving / (a.dist / 1000) : undefined,
    avgHr: a.hrTime > 0 ? a.hrSum / a.hrTime : undefined,
    // Satuan sama dengan stream (bisa per-kaki); dinormalisasi di normalizeActivityDetail.
    cadenceSpm: a.cadTime > 0 ? a.cadSum / a.cadTime : undefined,
  };
}

const merge = (a: Acc, b: Acc): Acc => ({
  dist: a.dist + b.dist,
  moving: a.moving + b.moving,
  hrSum: a.hrSum + b.hrSum,
  hrTime: a.hrTime + b.hrTime,
  cadSum: a.cadSum + b.cadSum,
  cadTime: a.cadTime + b.cadTime,
});

/**
 * Split per `splitM` meter (default 1 km) dari stream time + distance, seperti `splits_metric` Strava:
 * jarak & moving time per split, pace = moving time / jarak (bukan rata-rata kecepatan per titik).
 * Data dibersihkan dulu lewat `buildTrack`. Titik batas km diinterpolasi di dalam langkah sampel.
 * HR & cadence = rata-rata berbobot waktu bergerak. Sisa di akhir jadi split parsial; sisa < 50 m
 * digabung ke split sebelumnya, jadi jumlah jarak & waktu semua split = total track.
 */
export function kmSplits(streams: StreamMap, splitM = 1000, minSpeed = RUN_MOVING_SPEED): ActivitySplit[] {
  if (!streams.time?.length || !streams.distance?.length) return [];
  const track = buildTrack(streams.time, streams.distance, minSpeed);
  if (!track) return [];
  const { t, d, moving, src } = track;
  const hr = streams.heartrate;
  const cad = streams.cadence;

  const done: Acc[] = [];
  let acc = emptyAcc();
  let boundary = splitM;

  const add = (dd: number, dt: number, isMoving: boolean, h: number | null | undefined, c: number | null | undefined) => {
    acc.dist += dd;
    if (!isMoving || dt <= 0) return;
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

  for (let k = 1; k < t.length; k++) {
    const h = hr?.[src[k]];
    const c = cad?.[src[k]];
    let from = d[k - 1];
    let rem = t[k] - t[k - 1];
    while (d[k] >= boundary && from < boundary) {
      const frac = (boundary - from) / (d[k] - from);
      add(boundary - from, rem * frac, moving[k], h, c);
      done.push(acc);
      acc = emptyAcc();
      rem -= rem * frac;
      from = boundary;
      boundary += splitM;
    }
    add(d[k] - from, rem, moving[k], h, c);
  }
  if (acc.dist > 0) {
    if (acc.dist < MIN_LAST_SPLIT_M && done.length) done[done.length - 1] = merge(done[done.length - 1], acc);
    else if (acc.dist >= MIN_LAST_SPLIT_M) done.push(acc);
  }
  return done.map((a, i) => toSplit(i + 1, a));
}
