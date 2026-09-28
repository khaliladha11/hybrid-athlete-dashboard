import { datePart } from "@/lib/date";
import type { Activity, ActivityCategory, ActivityDetail, ActivityInterval, Wellness } from "./types";

type Raw = Record<string, unknown>;

/** Angka valid & positif, selain itu undefined (field Huawei sering null/0). */
export function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** Cadence per-kaki (< 120) → SPM total. */
export function normalizeCadence(v: unknown): number | undefined {
  const c = num(v);
  if (c === undefined) return undefined;
  return Math.round(c < 120 ? c * 2 : c);
}

export function categorize(type: string | undefined): ActivityCategory {
  const t = (type ?? "").toLowerCase();
  if (/run/.test(t)) return "run";
  if (/walk|hike/.test(t)) return "walk";
  if (/weight|strength|workout|crossfit|training/.test(t)) return "strength";
  if (/ride|cycl|bike/.test(t)) return "ride";
  return "other";
}

function pace(speedMs: unknown, distanceM: unknown, timeSec: unknown): number | undefined {
  const s = num(speedMs);
  if (s) return 1000 / s;
  const d = num(distanceM);
  const t = num(timeSec);
  return d && t ? t / (d / 1000) : undefined;
}

export function normalizeActivity(raw: unknown): Activity | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Raw;
  const id = r.id !== undefined && r.id !== null ? String(r.id) : undefined;
  if (!id) return null;
  const type = str(r.type) ?? "Other";
  const category = categorize(type);
  const startLocal = str(r.start_date_local) ?? str(r.start_date);
  const distanceM = num(r.distance) ?? num(r.icu_distance);
  const movingTimeSec = num(r.moving_time) ?? num(r.elapsed_time);
  return {
    id,
    name: str(r.name) ?? type,
    type,
    category,
    startLocal,
    date: datePart(startLocal),
    distanceKm: distanceM ? distanceM / 1000 : undefined,
    movingTimeSec,
    avgHr: num(r.average_heartrate) ?? num(r.icu_average_hr),
    maxHr: num(r.max_heartrate),
    avgPaceSecPerKm: category === "run" || category === "walk" ? pace(r.average_speed, distanceM, movingTimeSec) : undefined,
    cadenceSpm: normalizeCadence(r.average_cadence),
    trainingLoad: num(r.icu_training_load) ?? num(r.training_load),
  };
}

export function normalizeActivityDetail(raw: unknown): ActivityDetail | null {
  const base = normalizeActivity(raw);
  if (!base) return null;
  const list = (raw as Raw).icu_intervals;
  const intervals: ActivityInterval[] = Array.isArray(list)
    ? list
        .filter((x): x is Raw => !!x && typeof x === "object")
        .map((x, i) => ({
          label: str(x.label) ?? str(x.type) ?? `Interval ${i + 1}`,
          type: str(x.type),
          movingTimeSec: num(x.moving_time) ?? num(x.elapsed_time),
          distanceKm: num(x.distance) ? num(x.distance)! / 1000 : undefined,
          avgHr: num(x.average_heartrate),
          avgPaceSecPerKm: pace(x.average_speed, x.distance, x.moving_time),
          cadenceSpm: normalizeCadence(x.average_cadence),
        }))
    : [];
  return { ...base, intervals };
}

export function normalizeWellness(raw: unknown): Wellness | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Raw;
  const date = datePart(str(r.id) ?? str(r.date));
  if (!date) return null;
  return {
    date,
    hrv: num(r.hrv) ?? num(r.hrvSDNN),
    restingHr: num(r.restingHR),
    sleepSecs: num(r.sleepSecs),
    ctl: num(r.ctl),
    atl: num(r.atl),
  };
}

export function normalizeList<T>(raw: unknown, fn: (x: unknown) => T | null): T[] {
  return Array.isArray(raw) ? raw.map(fn).filter((x): x is T => x !== null) : [];
}
