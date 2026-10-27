/**
 * PR kemampuan (0.14.0, docs/STRENGTH-HIDUP.md §3b). Murni.
 *
 * - Entri: gerakan (hanya dari library), beban, set & rep (boleh tidak diketahui), tanggal, sumber manual atau log.
 * - Hapus = tombstone (`deletedAt`) dan gabungan per `id` memakai urutan total yang sama dengan log
 *   (tombstone > hidup, lalu `updatedAt`, lalu isi), jadi komutatif & idempoten untuk sinkron.
 * - PR dari log terdeteksi otomatis saat sesi mengalahkan PR terbaik sebelumnya (beban, lalu rep). Id deterministik
 *   dari id log, sehingga dua perangkat yang mendeteksi PR yang sama menghasilkan entri yang sama.
 * - PR terbaru menjadi titik awal progresi gerakan yang belum punya log (saat aturan batas beban 0.14.0 aktif).
 */
import type { LogEntry } from "./progression";

export interface PrEntry {
  id: string;
  /** Nama gerakan di movement library. */
  movement: string;
  loadKg: number;
  /** Tidak ada = tidak diketahui. */
  sets?: number;
  reps?: number;
  /** YYYY-MM-DD (WIB). */
  date: string;
  source: "manual" | "log";
  /** ISO. */
  updatedAt: string;
  /** ISO. Ada = dihapus (tombstone sinkron). */
  deletedAt?: string;
}

export const MAX_PRS = 2000;
export const PR_TOMBSTONE_TTL_DAYS = 90;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const posInt = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= max;

export const isLivePr = (e: PrEntry) => !e.deletedAt;

/** Validasi satu entri. `library` (nama gerakan) membatasi ke gerakan library bila diberikan. */
export function normalizePr(x: unknown, library?: ReadonlySet<string>): PrEntry | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const r = x as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id || r.id.length > 80) return null;
  if (typeof r.movement !== "string" || !r.movement || (library && !library.has(r.movement))) return null;
  if (typeof r.loadKg !== "number" || !Number.isFinite(r.loadKg) || r.loadKg <= 0 || r.loadKg > 500) return null;
  if (typeof r.date !== "string" || !DATE_RE.test(r.date) || Number.isNaN(Date.parse(r.date))) return null;
  if (r.source !== "manual" && r.source !== "log") return null;
  if (r.sets !== undefined && r.sets !== null && !posInt(r.sets, 20)) return null;
  if (r.reps !== undefined && r.reps !== null && !posInt(r.reps, 100)) return null;
  return {
    id: r.id,
    movement: r.movement,
    loadKg: Math.round(r.loadKg * 100) / 100,
    ...(posInt(r.sets, 20) ? { sets: r.sets as number } : {}),
    ...(posInt(r.reps, 100) ? { reps: r.reps as number } : {}),
    date: r.date,
    source: r.source,
    updatedAt: isIso(r.updatedAt) ? r.updatedAt : `${r.date}T00:00:00.000Z`,
    ...(isIso(r.deletedAt) ? { deletedAt: r.deletedAt } : {}),
  };
}

const rank = (e: PrEntry): [number, string, string] => [e.deletedAt ? 1 : 0, e.updatedAt, JSON.stringify(e)];

function pick(a: PrEntry, b: PrEntry): PrEntry {
  const [ra, rb] = [rank(a), rank(b)];
  for (let i = 0; i < 3; i++) if (ra[i] !== rb[i]) return ra[i] > rb[i] ? a : b;
  return a;
}

/** Gabungkan beberapa daftar per `id`; urutan stabil (tanggal, lalu id). */
export function mergePrs(...lists: PrEntry[][]): PrEntry[] {
  const by = new Map<string, PrEntry>();
  for (const list of lists) for (const e of list) by.set(e.id, by.has(e.id) ? pick(by.get(e.id)!, e) : e);
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).slice(-MAX_PRS);
}

/** Daftar mentah (impor, sinkron) → entri valid tanpa duplikat. */
export function normalizePrs(raw: unknown, library?: ReadonlySet<string>): PrEntry[] {
  const list = Array.isArray(raw) ? raw : [];
  return mergePrs(list.map((x) => normalizePr(x, library)).filter((e): e is PrEntry => e !== null));
}

export const tombstonePr = (e: PrEntry, now: string): PrEntry => (e.deletedAt ? e : { ...e, deletedAt: now, updatedAt: now });

/** Buang tombstone yang lebih tua dari 90 hari (dipakai server saat menulis). */
export function compactPrTombstones(entries: PrEntry[], nowMs: number): PrEntry[] {
  const cutoff = nowMs - PR_TOMBSTONE_TTL_DAYS * 86_400_000;
  return entries.filter((e) => !e.deletedAt || Date.parse(e.deletedAt) >= cutoff);
}

const better = (a: Pick<PrEntry, "loadKg" | "reps">, b: Pick<PrEntry, "loadKg" | "reps"> | undefined) =>
  !b || a.loadKg > b.loadKg + 1e-9 || (Math.abs(a.loadKg - b.loadKg) < 1e-9 && (a.reps ?? 0) > (b.reps ?? 0));

/** PR terbaik satu gerakan (beban, lalu rep), entri hidup saja. */
export function bestPr(entries: PrEntry[], movement: string): PrEntry | undefined {
  let best: PrEntry | undefined;
  for (const e of entries) if (isLivePr(e) && e.movement === movement && better(e, best)) best = e;
  return best;
}

/** PR terbaru satu gerakan (tanggal, lalu `updatedAt`). */
export function latestPr(entries: PrEntry[], movement: string): PrEntry | undefined {
  return entries
    .filter((e) => isLivePr(e) && e.movement === movement)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** Riwayat PR satu gerakan, terbaru dulu. */
export const prHistory = (entries: PrEntry[], movement: string) =>
  entries.filter((e) => isLivePr(e) && e.movement === movement).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

/**
 * PR baru dari log ST: urut tanggal, entri ber-beban (rep, bukan detik) yang mengalahkan PR terbaik sebelumnya
 * (termasuk PR manual dan PR yang baru terdeteksi) menjadi PR `source: "log"`. Set tidak tercatat di log.
 */
export function detectPrs(log: LogEntry[], prs: PrEntry[], now: string, library?: ReadonlySet<string>): PrEntry[] {
  const known = new Set(prs.map((p) => p.id));
  const best = new Map<string, Pick<PrEntry, "loadKg" | "reps">>();
  const consider = (movement: string) => best.get(movement) ?? bestPr(prs, movement);
  const out: PrEntry[] = [];
  const ordered = log
    .filter((e) => !e.deletedAt && e.valueUnit === "reps" && e.load !== undefined && e.load > 0 && (!library || library.has(e.movement)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const e of ordered) {
    const cand = { loadKg: e.load!, reps: e.value };
    if (!better(cand, consider(e.movement))) continue;
    best.set(e.movement, cand);
    const id = `log-${e.id}`;
    if (known.has(id)) continue;
    out.push({ id, movement: e.movement, loadKg: e.load!, reps: e.value, date: e.date, source: "log", updatedAt: now });
  }
  return out;
}
