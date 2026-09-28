import "server-only";
import { addDays, todayWib } from "@/lib/date";
import { mockActivities, mockActivityDetail, mockWellness } from "@/lib/mock-data";
import { getIntervalsConfig, intervalsGet } from "./client";
import { normalizeActivity, normalizeActivityDetail, normalizeList, normalizeWellness } from "./normalize";
import { assessReadiness, type Readiness } from "@/lib/readiness";
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
  const data = normalizeList(res.data, normalizeActivity).sort((a, b) => (b.startLocal ?? "").localeCompare(a.startLocal ?? ""));
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
  const res = await intervalsGet(`/activity/${encodeURIComponent(id)}`, { intervals: "true" });
  if (!res.ok) return res;
  const data = normalizeActivityDetail(res.data);
  return data
    ? { ok: true, data, source: "live" }
    : { ok: false, error: { code: "UNKNOWN", title: "Format data tidak dikenali", message: "Respons intervals.icu tidak sesuai format yang diharapkan." } };
}

/** Readiness untuk halaman generator; null bila data tidak bisa diambil. */
export async function getReadiness(today = todayWib()): Promise<Readiness | null> {
  const [acts, well] = await Promise.all([getActivities(15, today), getWellness(8, today)]);
  if (!acts.ok && !well.ok) return null;
  return assessReadiness(well.ok ? well.data : [], acts.ok ? acts.data : [], today);
}
