/**
 * Check-in harian (0.15.2, docs/INSIGHT.md #6, I5). Murni.
 *
 * - Isian opsional, di bawah 10 detik: nyeri shin 0–10, pegal 0–10, kualitas tidur 1–5, mood 1–5.
 * - Satu entri per tanggal (WIB). Hapus = tombstone. Gabungan per tanggal memakai urutan total yang sama dengan log,
 *   PR, dan sesi ST (tombstone > hidup, lalu `updatedAt`, lalu isi), jadi komutatif & idempoten untuk sinkron.
 * - Saran (persetujuan pemilik 2026-10-28, TRAINING-LOGIC §5 "Check-in"): hanya menurunkan, tidak memblokir, dan
 *   "turun satu level" tidak berantai dengan readiness (`suggestFor` memakai min(cur − 1)).
 *   - nyeri shin ≥ 4: lari maks Easy + catatan prehab (MTSS di kontinum stres tulang: lebih ketat dari 5/10 untuk
 *     tendon, Silbernagel 2007);
 *   - nyeri shin ≥ 6: lari maks Easy 30 menit, istirahat/jalan dipertimbangkan, periksa bila menetap; ST Upper dulu;
 *   - pegal ≥ 7 atau tidur ≤ 2: turun satu level (Saw dkk. 2016; McLean dkk. 2010);
 *   - mood: catatan saja.
 */
import type { Advice } from "./coach";

export interface Checkin {
  /** YYYY-MM-DD (WIB). */
  date: string;
  /** Nyeri shin 0–10. */
  shin?: number;
  /** Pegal 0–10. */
  soreness?: number;
  /** Kualitas tidur 1 (buruk) – 5 (sangat baik). */
  sleep?: number;
  /** Mood 1 (buruk) – 5 (sangat baik). */
  mood?: number;
  /** ISO. */
  updatedAt: string;
  /** ISO. Ada = dihapus (tombstone sinkron). */
  deletedAt?: string;
}

export type CheckinField = "shin" | "soreness" | "sleep" | "mood";
export const CHECKIN_RANGE: Record<CheckinField, [number, number]> = { shin: [0, 10], soreness: [0, 10], sleep: [1, 5], mood: [1, 5] };
export const CHECKIN_LABEL: Record<CheckinField, string> = { shin: "Nyeri shin", soreness: "Pegal", sleep: "Kualitas tidur", mood: "Mood" };

export const SHIN_EASY = 4;
export const SHIN_REST = 6;
export const SORENESS_LOWER = 7;
export const SLEEP_LOWER = 2;
export const SHIN_REST_MINUTES = 30;
export const MAX_CHECKINS = 1000;
export const CHECKIN_TOMBSTONE_TTL_DAYS = 90;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const FIELDS: CheckinField[] = ["shin", "soreness", "sleep", "mood"];

export const isLiveCheckin = (c: Checkin) => !c.deletedAt;
/** Ada isian (bukan entri kosong). */
export const hasValues = (c: Pick<Checkin, CheckinField>) => FIELDS.some((f) => c[f] !== undefined);

export function normalizeCheckin(x: unknown): Checkin | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const r = x as Record<string, unknown>;
  if (typeof r.date !== "string" || !DATE_RE.test(r.date) || Number.isNaN(Date.parse(r.date))) return null;
  const out: Checkin = { date: r.date, updatedAt: isIso(r.updatedAt) ? r.updatedAt : `${r.date}T00:00:00.000Z` };
  for (const f of FIELDS) {
    const v = r[f];
    if (v === undefined || v === null) continue;
    const [lo, hi] = CHECKIN_RANGE[f];
    if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi) return null;
    out[f] = v;
  }
  if (isIso(r.deletedAt)) out.deletedAt = r.deletedAt;
  return out;
}

const rank = (c: Checkin): [number, string, string] => [c.deletedAt ? 1 : 0, c.updatedAt, JSON.stringify(c)];

function pick(a: Checkin, b: Checkin): Checkin {
  const [ra, rb] = [rank(a), rank(b)];
  for (let i = 0; i < 3; i++) if (ra[i] !== rb[i]) return ra[i] > rb[i] ? a : b;
  return a;
}

/** Gabungkan beberapa daftar per tanggal; urut tanggal. */
export function mergeCheckins(...lists: Checkin[][]): Checkin[] {
  const by = new Map<string, Checkin>();
  for (const list of lists) for (const c of list) by.set(c.date, by.has(c.date) ? pick(by.get(c.date)!, c) : c);
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_CHECKINS);
}

export function normalizeCheckins(raw: unknown): Checkin[] {
  const list = Array.isArray(raw) ? raw : [];
  return mergeCheckins(list.map(normalizeCheckin).filter((c): c is Checkin => c !== null));
}

export const tombstoneCheckin = (c: Checkin, now: string): Checkin => (c.deletedAt ? c : { ...c, deletedAt: now, updatedAt: now });

export function compactCheckinTombstones(list: Checkin[], nowMs: number): Checkin[] {
  const cutoff = nowMs - CHECKIN_TOMBSTONE_TTL_DAYS * 86_400_000;
  return list.filter((c) => !c.deletedAt || Date.parse(c.deletedAt) >= cutoff);
}

/** Check-in hidup untuk tanggal itu. */
export const checkinOn = (list: Checkin[], date: string) => list.find((c) => c.date === date && isLiveCheckin(c));

const PREHAB = "Prehab shin hari ini: Tibialis Wall Raise dan Eccentric Calf Raise.";

/** Saran dari check-in hari ini (hanya menurunkan; lihat kepala file). */
export function checkinAdvice(c: Checkin | undefined): Advice[] {
  if (!c || c.deletedAt) return [];
  const out: Advice[] = [];
  if (c.shin !== undefined && c.shin >= SHIN_REST) {
    out.push({
      id: "checkin-shin",
      targets: ["run"],
      title: `Nyeri shin ${c.shin}/10`,
      message: `Nyeri shin ${c.shin}/10. Pertimbangkan istirahat atau jalan; bila tetap lari, maksimal Easy ${SHIN_REST_MINUTES} menit. Bila nyeri menetap atau memburuk beberapa hari, periksakan ke tenaga profesional. ${PREHAB}`,
      maxDifficulty: "easy",
      maxDuration: SHIN_REST_MINUTES,
    });
    out.push({
      id: "checkin-shin",
      targets: ["strength"],
      title: `Nyeri shin ${c.shin}/10`,
      message: `Nyeri shin ${c.shin}/10: ST Upper didahulukan, beban kaki ditunda dulu.`,
      preferTypes: ["upperPush", "upperPull"],
    });
  } else if (c.shin !== undefined && c.shin >= SHIN_EASY) {
    out.push({
      id: "checkin-shin",
      targets: ["run"],
      title: `Nyeri shin ${c.shin}/10`,
      message: `Nyeri shin ${c.shin}/10: lari hari ini maksimal Easy, tanpa quality. ${PREHAB}`,
      maxDifficulty: "easy",
    });
  }
  if (c.soreness !== undefined && c.soreness >= SORENESS_LOWER) {
    out.push({ id: "checkin-soreness", targets: ["run", "strength"], title: `Pegal ${c.soreness}/10`, message: `Pegal ${c.soreness}/10: turun satu level hari ini.`, lowerBy: 1 });
  }
  if (c.sleep !== undefined && c.sleep <= SLEEP_LOWER) {
    out.push({ id: "checkin-sleep", targets: ["run", "strength"], title: `Tidur ${c.sleep}/5`, message: `Kualitas tidur ${c.sleep}/5: turun satu level hari ini.`, lowerBy: 1 });
  }
  return out;
}

/** Saran server + check-in hari ini (check-in yang sama tidak ditambah dua kali). */
export function withCheckin(advice: Advice[], c: Checkin | undefined): Advice[] {
  if (advice.some((a) => a.id.startsWith("checkin-"))) return advice;
  return [...advice, ...checkinAdvice(c)];
}

/** Catatan mood (tanpa aturan). */
export const moodNote = (c: Checkin | undefined) => (c?.mood !== undefined && c.mood <= 2 ? `Mood ${c.mood}/5 dicatat. Tidak mengubah saran.` : null);
