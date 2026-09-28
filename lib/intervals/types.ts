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

export interface ActivityDetail extends Activity {
  intervals: ActivityInterval[];
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
