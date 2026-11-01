/**
 * Teks dan logika murni "Kirim ke jam" (0.17, docs/RELEASE-1.0.md #6): status kirim, pesan error dengan langkah
 * berikutnya, catatan perangkat, antrean offline, dan catatan "sudah dikirim" di perangkat ini. Tanpa I/O.
 *
 * Fakta perangkat dari halaman integrasi dan pengumuman forum intervals.icu (Huawei 2026, Garmin 2020, Coros 2023);
 * lihat docs/RELEASE-1.0.md §3.
 */
import type { SendErrorCode, SendRequest, SendResponse } from "./calendar";

const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const DAY_MONTH = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

/** "Rabu 4 Nov". */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAY.format(d)} ${DAY_MONTH.format(d).replace(".", "")}`;
}

export const SEND_LABEL = "Kirim ke jam";
export const RESEND_LABEL = "Kirim ulang";
export const REMOVE_LABEL = "Hapus dari kalender";

export const sentText = (date: string) => `Terkirim ke kalender intervals.icu · ${dayLabel(date)}`;
export const removedText = "Dihapus dari kalender intervals.icu.";
export const queuedText = (action: SendRequest["action"]) =>
  action === "delete" ? "Sedang offline. Penghapusan dikirim saat online lagi." : "Sedang offline. Workout dikirim saat online lagi.";
export const demoText = "Mode demo: tidak ada yang dikirim. Isi INTERVALS_API_KEY di Vercel untuk mengirim ke kalender.";
export const changedText = "Workout berubah sejak dikirim. Kirim ulang untuk memperbarui event yang sama.";

/** Satu kalimat catatan perangkat di bawah tombol. */
export const DEVICE_NOTE = "Huawei menerima satu lari terencana berikutnya dalam seminggu, di Courses › Custom Courses. Garmin dan Coros menerima seminggu ke depan.";

/** Isi lembar "Apa ini?": merek, yang diterima, dan pengaturan di intervals.icu. */
export const DEVICE_HELP: { brand: string; receives: string; setting: string }[] = [
  {
    brand: "Huawei",
    receives: "Hanya lari, jalan, dan hiking. Satu workout: lari terencana berikutnya dalam seminggu. Di jam: Workout › Outdoor Run › Courses › Custom Courses.",
    setting: "Settings › Connections › HUAWEI Health › centang Upload planned workouts.",
  },
  { brand: "Garmin", receives: "Workout terencana seminggu ke depan, muncul setelah sinkron Garmin Connect.", setting: "Settings › Garmin › centang Upload planned workouts." },
  { brand: "Coros", receives: "Workout terencana seminggu ke depan. Tambahkan Intervals.icu Training Plan ke kalender aplikasi Coros bila belum muncul.", setting: "Settings › Coros › aktifkan unggah workout terencana." },
  { brand: "Lainnya", receives: "Mengikuti halaman integrasi intervals.icu. Tanpa jam yang terhubung, pakai Copy Set.", setting: "intervals.icu › Settings › Connections." },
];

export const HUAWEI_LIMITS = [
  "Kalau workout lain yang muncul, buka event di kalender intervals.icu lalu pilih Upload to Huawei.",
  "Setiap langkah dikirim dengan target pace, termasuk jalan dan jog, karena Huawei membuang langkah tanpa target.",
  "Tampilan ulangan di jam bisa berbeda. Periksa jumlah repetisi sebelum mulai.",
];

/** Pesan error singkat: penyebab dan langkah berikutnya, tanpa stack trace atau key. */
export function sendErrorText(code: SendErrorCode, retryAfterSec?: number): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Key ditolak intervals.icu. Periksa INTERVALS_API_KEY di Vercel lalu coba lagi.";
    case "FORBIDDEN":
      return "Key tidak punya akses ke atlet ini. Periksa INTERVALS_ATHLETE_ID di Vercel.";
    case "RATE_LIMITED": {
      const min = retryAfterSec ? Math.max(1, Math.ceil(retryAfterSec / 60)) : undefined;
      return min ? `Batas permintaan intervals.icu tercapai. Coba lagi dalam ${min} menit.` : "Batas permintaan intervals.icu tercapai. Coba lagi beberapa menit lagi.";
    }
    case "NETWORK":
      return "Tidak tersambung ke intervals.icu. Kiriman disimpan dan dicoba lagi saat online.";
    case "SERVER_ERROR":
      return "intervals.icu sedang bermasalah. Coba lagi beberapa menit lagi.";
    case "LOCKED":
      return "Aplikasi terkunci. Buka dengan sandi lalu kirim lagi.";
    case "NOT_FOUND":
      return "Atlet tidak ditemukan di intervals.icu. Periksa INTERVALS_ATHLETE_ID di Vercel.";
    case "INVALID":
      return "Workout ini tidak bisa dikirim. Buat ulang lalu coba lagi.";
    default:
      return "Gagal mengirim ke intervals.icu. Coba lagi.";
  }
}

/** Error yang layak diulang otomatis saat online (antrean); lainnya butuh tindakan pengguna. */
export const retryable = (code: SendErrorCode) => code === "NETWORK" || code === "SERVER_ERROR" || code === "RATE_LIMITED";

/** "3 terkirim · 1 gagal · 1 menunggu online". */
export function batchSummary(r: { sent: number; failed: number; queued: number; skipped?: number }): string {
  const parts = [
    r.sent ? `${r.sent} terkirim` : "",
    r.queued ? `${r.queued} menunggu online` : "",
    r.failed ? `${r.failed} gagal` : "",
    r.skipped ? `${r.skipped} tidak dikirim` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Tidak ada sesi lari tersisa minggu ini.";
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
