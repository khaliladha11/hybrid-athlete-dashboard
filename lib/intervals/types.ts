export type ActivityCategory = "run" | "walk" | "strength" | "ride" | "other";

export interface Activity {
  id: string;
  name: string;
  type: string;
  category: ActivityCategory;
  date?: string; // YYYY-MM-DD (WIB/lokal)
  startLocal?: string;
  distanceKm?: number;
  movingTimeSec?: number;
  avgHr?: number;
  maxHr?: number;
  /** detik per km */
  avgPaceSecPerKm?: number;
  /** SPM total (sudah dikoreksi dari per-kaki) */
  cadenceSpm?: number;
  trainingLoad?: number;
  /** Sumber di intervals.icu (STRAVA, HUAWEI, GARMIN_CONNECT, …). Isi aktivitas STRAVA tidak tersedia lewat API. */
  source?: string;
}

export interface ActivityInterval {
  label: string;
  type?: string;
  movingTimeSec?: number;
  distanceKm?: number;
  avgHr?: number;
  avgPaceSecPerKm?: number;
  cadenceSpm?: number;
}

/** Split per km dari stream (lihat `kmSplits`). Split terakhir bisa parsial (< 1 km). */
export interface ActivitySplit {
  /** Nomor split, mulai 1. */
  index: number;
  distanceKm: number;
  movingTimeSec: number;
  avgPaceSecPerKm?: number;
  avgHr?: number;
  cadenceSpm?: number;
}

export interface ActivityDetail extends Activity {
  intervals: ActivityInterval[];
  /** Hanya untuk lari & jalan yang punya stream jarak; kosong bila tidak ada. */
  splits: ActivitySplit[];
}

export interface Wellness {
  date: string;
  hrv?: number;
  restingHr?: number;
  sleepSecs?: number;
  ctl?: number;
  atl?: number;
}

export type IntervalsErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "SERVER_ERROR" | "NETWORK" | "UNKNOWN";

export interface IntervalsError {
  code: IntervalsErrorCode;
  status?: number;
  title: string;
  message: string;
}

export type DataSource = "live" | "demo";

export type FetchResult<T> =
  | { ok: true; data: T; source: DataSource }
  | { ok: false; error: IntervalsError };
