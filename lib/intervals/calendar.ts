/**
 * Kirim, perbarui, dan hapus event di kalender intervals.icu (0.17, docs/RELEASE-1.0.md #6). Logika rute
 * `/api/intervals/workout`; I/O lewat parameter `api` supaya bisa diuji tanpa jaringan.
 *
 * Idempoten per `external_id` milik kita (`ha:s:…`, `ha:g:…`, `ha:st:…`). Upsert bawaan intervals.icu mencocokkan
 * `external_id` hanya untuk event "created by the same OAuth application" (spesifikasi API); untuk API key pribadi
 * tidak terdokumentasi. Jadi event dicari dulu di jendela ±14 hari (event yang digeser di kalender tetap ketemu):
 * ada → PUT (duplikat lama dihapus), tidak ada → POST. Hapus: cari lalu DELETE; tidak ada = selesai.
 *
 * Respons ke browser hanya status atau kode error: tanpa key, id event, atau isi dari intervals.icu.
 */
import { addDays } from "@/lib/date";
import { runThresholdPace } from "./normalize";
import type { FetchResult, IntervalsErrorCode } from "./types";
import { EXTERNAL_ID_RE, type ExportedEvent } from "./workout-export";

export const MAX_SEND_BODY_BYTES = 16 * 1024;
const NAME_MAX = 80;
const DESCRIPTION_MAX = 4000;
const SEARCH_DAYS = 14;

export type SendAction = "upsert" | "delete";
export interface SendRequest {
  action: SendAction;
  externalId: string;
  date: string;
  event?: ExportedEvent;
}

export type SendStatus = "created" | "updated" | "deleted" | "absent" | "demo";
export type SendErrorCode = IntervalsErrorCode | "INVALID";
/** Peringatan setelah kirim berhasil: threshold pace lari belum diisi di intervals.icu (jam menolak workout pace). */
export type SendWarning = "NO_THRESHOLD_PACE";
export type SendResponse = { status: SendStatus; warning?: SendWarning } | { status: "error"; code: SendErrorCode; retryAfterSec?: number };

type Api = (method: "GET" | "POST" | "PUT" | "DELETE", path: string, opts?: { query?: Record<string, string>; body?: unknown }) => Promise<FetchResult<unknown>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d: unknown): d is string => typeof d === "string" && DATE_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const str = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

/** Validasi body dari browser. Null = ditolak. */
export function parseSendBody(raw: unknown): SendRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (b.action !== "upsert" && b.action !== "delete") return null;
  if (typeof b.externalId !== "string" || !EXTERNAL_ID_RE.test(b.externalId) || !validDate(b.date)) return null;
  if (b.action === "delete") return { action: "delete", externalId: b.externalId, date: b.date };
  const e = b.event as Record<string, unknown> | undefined;
  if (!e || typeof e !== "object") return null;
  const note = b.externalId.startsWith("ha:st:");
  if (e.category !== (note ? "NOTE" : "WORKOUT")) return null;
  if (!str(e.name, NAME_MAX) || !str(e.description, DESCRIPTION_MAX)) return null;
  const t = e.movingTimeSec;
  if (typeof t !== "number" || !Number.isInteger(t) || t < 60 || t > 6 * 3600) return null;
  return {
    action: "upsert",
    externalId: b.externalId,
    date: b.date,
    event: { category: note ? "NOTE" : "WORKOUT", name: e.name as string, description: e.description as string, movingTimeSec: t },
  };
}

interface RemoteEvent {
  id?: number;
  external_id?: string;
}

/** Body event intervals.icu (EventEx). Tanggal tanpa jam (forum API: "must end with T00:00:00"). */
export function eventBody(req: SendRequest & { event: ExportedEvent }) {
  const e = req.event;
  return {
    category: e.category,
    start_date_local: `${req.date}T00:00:00`,
    ...(e.category === "WORKOUT" ? { type: "Run" } : {}),
    name: e.name,
    description: e.description,
    moving_time: e.movingTimeSec,
    external_id: req.externalId,
  };
}

const fail = (code: SendErrorCode, retryAfterSec?: number): SendResponse => ({ status: "error", code, ...(retryAfterSec !== undefined ? { retryAfterSec } : {}) });
const failFrom = (r: FetchResult<unknown>): SendResponse => (r.ok ? fail("UNKNOWN") : fail(r.error.code, r.error.retryAfterSec));

export async function handleSend(req: SendRequest, api: Api, athleteId: string): Promise<SendResponse> {
  const base = `/athlete/${encodeURIComponent(athleteId)}/events`;
  const list = await api("GET", base, { query: { oldest: addDays(req.date, -SEARCH_DAYS), newest: addDays(req.date, SEARCH_DAYS) } });
  if (!list.ok) return failFrom(list);
  const found = (Array.isArray(list.data) ? (list.data as RemoteEvent[]) : []).filter((e) => e.external_id === req.externalId && Number.isInteger(e.id));

  if (req.action === "delete") {
    for (const e of found) {
      const r = await api("DELETE", `${base}/${e.id}`);
      if (!r.ok && r.error.code !== "NOT_FOUND") return failFrom(r);
    }
    return { status: found.length ? "deleted" : "absent" };
  }

  const body = eventBody(req as SendRequest & { event: ExportedEvent });
  const [keep, ...dupes] = found;
  let status: SendStatus;
  if (keep) {
    const r = await api("PUT", `${base}/${keep.id}`, { body });
    if (!r.ok) return failFrom(r);
    // Duplikat dari kiriman lama (mis. dua perangkat bersamaan) dirapikan; gagal menghapusnya tidak menggagalkan kirim.
    for (const d of dupes) await api("DELETE", `${base}/${d.id}`);
    status = "updated";
  } else {
    const r = await api("POST", base, { query: { upsertOnUid: "false" }, body });
    if (!r.ok) return failFrom(r);
    status = "created";
  }
  return { status, ...(req.event?.category === "WORKOUT" && (await missingThresholdPace(api, athleteId)) ? { warning: "NO_THRESHOLD_PACE" as const } : {}) };
}

/**
 * Workout berisi target pace; tanpa threshold pace lari di intervals.icu, unggah ke jam (Huawei) gagal dengan
 * "Workout has no suitable steps" (forum intervals.icu, Juni 2026). Gagal membaca pengaturan = tidak ada peringatan.
 */
async function missingThresholdPace(api: Api, athleteId: string): Promise<boolean> {
  const r = await api("GET", `/athlete/${encodeURIComponent(athleteId)}`);
  return r.ok && runThresholdPace(r.data) === undefined;
}
