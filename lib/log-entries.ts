/**
 * Entri log ST untuk sinkron (murni): migrasi, tombstone, dan gabungan per `id` (docs/SYNC.md §4).
 *
 * - Entri lama tanpa `id` diberi id deterministik dari isinya, jadi dua perangkat yang memigrasi
 *   entri yang sama menghasilkan id yang sama. Entri tanpa `updatedAt` diberi tengah malam UTC tanggalnya.
 * - Hapus = tombstone (`deletedAt`), bukan hapus fisik, supaya hapus di satu perangkat ikut ke perangkat lain.
 * - Gabungan memilih maksimum menurut urutan total (tombstone > hidup, lalu `updatedAt`, lalu isi),
 *   sehingga komutatif, asosiatif, dan idempoten: urutan sinkron tidak memengaruhi hasil.
 */
import { isLogEntry, type LogEntry } from "./progression";

export const TOMBSTONE_TTL_DAYS = 90;

export const isLive = (e: LogEntry) => !e.deletedAt;

function fnv1a(s: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Id deterministik untuk entri lama tanpa `id`. */
export function contentId(r: Record<string, unknown>): string {
  const t = (r.target ?? {}) as Record<string, unknown>;
  const key = JSON.stringify([r.date, r.movement, r.load ?? null, r.band ?? null, r.value, r.valueUnit, r.rpe, r.targetRpe, r.deload, r.blockIndex, t.lo, t.hi]);
  return `m-${fnv1a(key, 0x811c9dc5)}${fnv1a(key, 0x9e3779b9)}`;
}

/** Satu entri mentah → entri valid lengkap dengan `id` & `updatedAt`, atau null. */
export function normalizeLogEntry(x: unknown): LogEntry | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const r = x as Record<string, unknown>;
  const withId = typeof r.id === "string" && r.id ? r : { ...r, id: contentId(r) };
  if (!isLogEntry(withId)) return null;
  return withId.updatedAt ? withId : { ...withId, updatedAt: `${withId.date}T00:00:00.000Z` };
}

const rank = (e: LogEntry): [number, string, string] => [e.deletedAt ? 1 : 0, e.updatedAt ?? "", JSON.stringify(e)];

/** Pemenang dua versi entri ber-id sama (simetris). */
export function pickEntry(a: LogEntry, b: LogEntry): LogEntry {
  const [ra, rb] = [rank(a), rank(b)];
  for (let i = 0; i < 3; i++) {
    if (ra[i] === rb[i]) continue;
    return ra[i] > rb[i] ? a : b;
  }
  return a;
}

/** Gabungkan beberapa daftar per `id`; urutan hasil stabil (tanggal, lalu id). */
export function mergeLogs(...lists: LogEntry[][]): LogEntry[] {
  const byId = new Map<string, LogEntry>();
  for (const list of lists) for (const e of list) byId.set(e.id, byId.has(e.id) ? pickEntry(byId.get(e.id)!, e) : e);
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Daftar mentah → daftar ternormalisasi tanpa duplikat. `changed` = isinya berbeda dari masukan. */
export function normalizeLog(raw: unknown): { entries: LogEntry[]; changed: boolean } {
  const list = Array.isArray(raw) ? raw : [];
  const valid = list.map(normalizeLogEntry).filter((e): e is LogEntry => e !== null);
  const entries = mergeLogs(valid);
  const changed = entries.length !== list.length || entries.some((e, i) => e !== list[i]);
  return { entries, changed };
}

export function tombstone(e: LogEntry, now: string): LogEntry {
  return e.deletedAt ? e : { ...e, deletedAt: now, updatedAt: now };
}

/** Buang tombstone yang lebih tua dari 90 hari (dipakai server saat menulis). */
export function compactTombstones(entries: LogEntry[], nowMs: number): LogEntry[] {
  const cutoff = nowMs - TOMBSTONE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return entries.filter((e) => !e.deletedAt || Date.parse(e.deletedAt) >= cutoff);
}
