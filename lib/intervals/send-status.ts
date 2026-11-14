/**
 * Teks dan logika murni "Kirim ke jam" (0.17, docs/RELEASE-1.0.md #6): status kirim, pesan error dengan langkah
 * berikutnya, catatan perangkat, antrean offline, dan catatan "sudah dikirim" di perangkat ini. Tanpa I/O.
 *
 * Fakta perangkat dari halaman integrasi dan pengumuman forum intervals.icu (Huawei 2026, Garmin 2020, Coros 2023);
 * lihat docs/RELEASE-1.0.md §3.
 */
import type { CheckResult, SendErrorCode, SendRequest, SendResponse, SendWarning } from "./calendar";
import { WATCH_LABEL, type WatchBrand } from "./watch";
import { DAY_MONTH, formatDay, WEEKDAY_LONG } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { SEND } from "@/lib/i18n/messages/send";

/** "Rabu 4 Nov" / "Wednesday 4 Nov". */
export function dayLabel(date: string, locale: Locale = "id"): string {
  return `${formatDay(locale, date, WEEKDAY_LONG)} ${formatDay(locale, date, DAY_MONTH).replace(".", "")}`;
}

export const SEND_LABEL = SEND.id.send;
export const RESEND_LABEL = SEND.id.resend;
export const REMOVE_LABEL = SEND.id.remove;

export const sentText = (date: string, locale: Locale = "id") => SEND[locale].sent(dayLabel(date, locale));
export const removedText = SEND.id.removed;
export const queuedText = (action: SendRequest["action"], locale: Locale = "id") => (action === "delete" ? SEND[locale].queuedDelete : SEND[locale].queued);
export const demoText = SEND.id.demo;
export const changedText = SEND.id.changed;
/** Kirim berhasil, tetapi intervals.icu belum punya threshold pace lari: jam menolak workout pace. */
export const thresholdPaceText = SEND.id.thresholdPace;

/** Satu kalimat catatan perangkat di bawah tombol. */
export const DEVICE_NOTE = SEND.id.deviceNote;

/** Unggah ke merek jam pengguna belum diaktifkan di intervals.icu. */
export const uploadOffText = (brand: WatchBrand, locale: Locale = "id") => SEND[locale].uploadOff(WATCH_LABEL[brand]);

/** Teks peringatan setelah kirim, berurutan. */
export function warningTexts(warnings: SendWarning[] | undefined, brand?: WatchBrand, locale: Locale = "id"): string[] {
  return (warnings ?? []).map((w) => (w === "NO_THRESHOLD_PACE" ? SEND[locale].thresholdPace : uploadOffText(brand ?? "other", locale)));
}

export const CHECK_LABEL = SEND.id.check;

/** Hasil "Cek status unggah". Tanpa error tercatat bukan bukti sudah di jam, jadi tidak diklaim. */
export function checkText(r: CheckResult, brand?: WatchBrand, locale: Locale = "id"): string {
  const t = SEND[locale];
  if (!r.found) return t.notFound;
  if (r.errors.length) return t.uploadFailed(r.errors.join(" · "));
  if (r.uploadOn === false && brand) return uploadOffText(brand, locale);
  return t.noErrors;
}

/** Isi lembar "Apa ini?": merek, yang diterima, dan pengaturan di intervals.icu. */
export const DEVICE_HELP: { brand: string; receives: string; setting: string }[] = SEND.id.help;

export const HUAWEI_LIMITS: string[] = SEND.id.huaweiLimits;

/** Pesan error singkat: penyebab dan langkah berikutnya, tanpa stack trace atau key. */
export function sendErrorText(code: SendErrorCode, retryAfterSec?: number, locale: Locale = "id"): string {
  const e = SEND[locale].error;
  switch (code) {
    case "UNAUTHORIZED":
    case "FORBIDDEN":
    case "NETWORK":
    case "SERVER_ERROR":
    case "LOCKED":
    case "NOT_FOUND":
    case "INVALID":
      return e[code];
    case "RATE_LIMITED": {
      const min = retryAfterSec ? Math.max(1, Math.ceil(retryAfterSec / 60)) : undefined;
      return min ? e.rateIn(min) : e.rate;
    }
    default:
      return e.other;
  }
}

/** Error yang layak diulang otomatis saat online (antrean); lainnya butuh tindakan pengguna. */
export const retryable = (code: SendErrorCode) => code === "NETWORK" || code === "SERVER_ERROR" || code === "RATE_LIMITED";

/** "3 terkirim · 1 gagal · 1 menunggu online". */
export function batchSummary(r: { sent: number; failed: number; queued: number; skipped?: number }, locale: Locale = "id"): string {
  const t = SEND[locale].batch;
  const parts = [r.sent ? t.sent(r.sent) : "", r.queued ? t.queued(r.queued) : "", r.failed ? t.failed(r.failed) : "", r.skipped ? t.skipped(r.skipped) : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : t.none;
}

// ---------- Catatan "sudah dikirim" (perangkat ini) ----------

export interface SentRecord {
  date: string;
  hash: string;
  sentAt: string;
}
export type SentMap = Record<string, SentRecord>;

/** Catatan setelah respons rute: dibuat/diperbarui = simpan, dihapus/tidak ada = buang; demo & error tidak mengubah. */
export function applySent(map: SentMap, req: SendRequest, res: SendResponse, hash: string | undefined, nowIso: string): SentMap {
  if (res.status === "created" || res.status === "updated") return { ...map, [req.externalId]: { date: req.date, hash: hash ?? "", sentAt: nowIso } };
  if (res.status === "deleted" || res.status === "absent") {
    const { [req.externalId]: _gone, ...rest } = map;
    return rest;
  }
  return map;
}

export function normalizeSent(raw: unknown): SentMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SentMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const r = v as Partial<SentRecord> | null;
    if (r && typeof r.date === "string" && typeof r.hash === "string" && typeof r.sentAt === "string") out[k] = { date: r.date, hash: r.hash, sentAt: r.sentAt };
  }
  return out;
}

/**
 * Sesi program yang pernah dikirim dari perangkat ini tetapi tidak ada lagi di program (dilewati, program diganti atau
 * dihapus) dan tanggalnya belum lewat: ditawarkan untuk dihapus juga dari kalender intervals.icu.
 */
export function orphanedSends(map: SentMap, liveSessionIds: ReadonlySet<string>, today: string): { externalId: string; date: string }[] {
  return Object.entries(map)
    .filter(([id, r]) => id.startsWith("ha:s:") && !liveSessionIds.has(id.slice(5)) && r.date >= today)
    .map(([externalId, r]) => ({ externalId, date: r.date }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const orphanText = (n: number, locale: Locale = "id") => SEND[locale].orphan(n);

/** Tanggal kirim sesi program: hari disarankan, atau hari ini bila sudah lewat. */
export const sendDateFor = (plannedDate: string, today: string) => (plannedDate < today ? today : plannedDate);

// ---------- Antrean offline ----------

export interface QueuedSend {
  req: SendRequest;
  hash?: string;
  queuedAt: string;
}
export type SendQueue = Record<string, QueuedSend>;

/** Aksi terakhir per id luar menang (kirim lalu hapus saat offline = hanya hapus). */
export const enqueue = (q: SendQueue, req: SendRequest, hash: string | undefined, nowIso: string): SendQueue => ({ ...q, [req.externalId]: { req, hash, queuedAt: nowIso } });

export function dequeue(q: SendQueue, externalId: string, queuedAt: string): SendQueue {
  // Hanya entri yang sama yang dibuang; entri yang lebih baru (diantrekan selama pengiriman) tetap.
  if (q[externalId]?.queuedAt !== queuedAt) return q;
  const { [externalId]: _done, ...rest } = q;
  return rest;
}

/** Urutan kirim: yang paling lama diantrekan dulu. */
export const queueOrder = (q: SendQueue): QueuedSend[] => Object.values(q).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));

export function normalizeQueue(raw: unknown): SendQueue {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SendQueue = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const e = v as Partial<QueuedSend> | null;
    if (e && e.req && typeof e.req === "object" && e.req.externalId === k && typeof e.queuedAt === "string") out[k] = e as QueuedSend;
  }
  return out;
}
