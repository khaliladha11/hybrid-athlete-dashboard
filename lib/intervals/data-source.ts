import "server-only";
import { addDays, todayWib } from "@/lib/date";
import { mockActivities, mockActivityDetail, mockWellness } from "@/lib/mock-data";
import { getIntervalsConfig, intervalsGet } from "./client";
import { dedupeActivities } from "./dedupe";
import { normalizeActivity, normalizeActivityDetail, normalizeList, normalizeWellness } from "./normalize";
import { readinessAdvice, weeklyAdvice, type Advice } from "@/lib/coach";
import { assessReadiness, type Readiness } from "@/lib/readiness";
import { averageRunCadence } from "./summary";
import type { Activity, ActivityDetail, FetchResult, Wellness } from "./types";

/** Demo Mode aktif bila INTERVALS_API_KEY kosong. */
export function isDemoMode(): boolean {
  return !getIntervalsConfig().hasKey;
}

export async function getActivities(days = 30, today = todayWib()): Promise<FetchResult<Activity[]>> {
  if (isDemoMode()) return { ok: true, data: mockActivities(today), source: "demo" };
  const { athleteId } = getIntervalsConfig();
  const res = await intervalsGet(`/athlete/${encodeURIComponent(athleteId)}/activities`, {
    oldest: addDays(today, -(days - 1)),
    newest: today,
  });
  if (!res.ok) return res;
  const data = dedupeActivities(normalizeList(res.data, normalizeActivity)).sort((a, b) => (b.startLocal ?? "").localeCompare(a.startLocal ?? ""));
  return { ok: true, data, source: "live" };
}

export async function getWellness(days = 8, today = todayWib()): Promise<FetchResult<Wellness[]>> {
  if (isDemoMode()) return { ok: true, data: mockWellness(today), source: "demo" };
  const { athleteId } = getIntervalsConfig();
  const res = await intervalsGet(`/athlete/${encodeURIComponent(athleteId)}/wellness`, {
    oldest: addDays(today, -(days - 1)),
    newest: today,
  });
  if (!res.ok) return res;
  const data = normalizeList(res.data, normalizeWellness).sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, data, source: "live" };
}

export async function getActivityDetail(id: string): Promise<FetchResult<ActivityDetail>> {
  if (isDemoMode()) {
    const detail = mockActivityDetail(id, todayWib());
    return detail
      ? { ok: true, data: detail, source: "demo" }
      : { ok: false, error: { code: "NOT_FOUND", status: 404, title: "Aktivitas demo tidak ditemukan", message: "ID ini tidak ada di data dummy." } };
  }
  if (!/^[\w-]+$/.test(id)) {
    return { ok: false, error: { code: "NOT_FOUND", status: 404, title: "ID aktivitas tidak valid", message: "Periksa tautan aktivitas." } };
  }
  // Stream untuk split per km; bila gagal (mis. aktivitas tanpa GPS) detail tetap tampil tanpa split.
  const [res, streams] = await Promise.all([
    intervalsGet(`/activity/${encodeURIComponent(id)}`, { intervals: "true" }),
    intervalsGet(`/activity/${encodeURIComponent(id)}/streams`, { types: "time,distance,latlng,heartrate,cadence" }),
  ]);
  if (!res.ok) return res;
  const data = normalizeActivityDetail(res.data, streams.ok ? streams.data : undefined);
  return data
    ? { ok: true, data, source: "live" }
    : { ok: false, error: { code: "UNKNOWN", title: "Format data tidak dikenali", message: "Respons intervals.icu tidak sesuai format yang diharapkan." } };
}

export interface TrainingContext {
  readiness: Readiness | null;
  /** Saran gabungan: readiness + konteks mingguan (80/20, progresi km, concurrent). */
  advice: Advice[];
  /** Cadence lari rata-rata 14 hari (SPM total), jika ada data. */
  cadenceSpm?: number;
}

/** Konteks untuk halaman generator: readiness & cadence personal. Posisi blok dihitung di client dari profil perangkat. */
export async function getTrainingContext(today = todayWib()): Promise<TrainingContext> {
  const [acts, well] = await Promise.all([getActivities(15, today), getWellness(8, today)]);
  if (!acts.ok && !well.ok) return { readiness: null, advice: [] };
  const activities = acts.ok ? acts.data : [];
  const readiness = assessReadiness(well.ok ? well.data : [], activities, today);
  return {
    readiness,
    advice: [...readinessAdvice(readiness), ...weeklyAdvice(activities, today)],
    cadenceSpm: averageRunCadence(activities, today, 14),
  };
}
