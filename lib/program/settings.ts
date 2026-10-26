/**
 * Pengaturan program target di perangkat (`hybrid-athlete.program`) dan override sesi (docs/PROGRAM-HIDUP.md §3).
 * Murni: dipakai halaman Program, Profil, kalender, dan gabungan sinkron.
 */
import { addDays, startOfWeekMonday } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import { RACES, formatGoal, goalFromProfile, type Program, type RaceTarget } from "@/lib/program";

export interface ProgramOverride {
  sessionId: string;
  action: "move" | "skip";
  /** YYYY-MM-DD WIB, untuk `move`. */
  toDate?: string;
  /** ISO. */
  decidedAt: string;
}

export interface ProgramSettings {
  race: RaceTarget;
  goal: string;
  /** Senin minggu pertama. */
  startDate: string;
  runsPerWeek: 3 | 4;
  overrides: ProgramOverride[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

export function isOverride(x: unknown): x is ProgramOverride {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.sessionId !== "string" || !o.sessionId || o.sessionId.length > 120 || !isIso(o.decidedAt)) return false;
  if (o.action === "skip") return o.toDate === undefined || (typeof o.toDate === "string" && DATE_RE.test(o.toDate));
  return o.action === "move" && typeof o.toDate === "string" && DATE_RE.test(o.toDate);
}

export function defaultProgramSettings(today: string, race: RaceTarget = "10k"): ProgramSettings {
  return { race, goal: formatGoal(goalFromProfile(race)), startDate: startOfWeekMonday(today), runsPerWeek: 3, overrides: [] };
}

/** Isi localStorage → pengaturan; rusak atau kosong → default (pratinjau, bukan program aktif). */
export function parseProgramSettings(raw: string | null | undefined, today: string): ProgramSettings {
  try {
    const s = JSON.parse(raw ?? "") as Partial<ProgramSettings> & { overrides?: unknown };
    const base = defaultProgramSettings(today, s.race && s.race in RACES ? s.race : "10k");
    return {
      race: base.race,
      goal: typeof s.goal === "string" ? s.goal : base.goal,
      startDate: typeof s.startDate === "string" && DATE_RE.test(s.startDate) ? s.startDate : base.startDate,
      runsPerWeek: s.runsPerWeek === 4 ? 4 : 3,
      overrides: Array.isArray(s.overrides) ? mergeOverrides(s.overrides.filter(isOverride)) : [],
    };
  } catch {
    return defaultProgramSettings(today);
  }
}

/** Urutan kunci tetap supaya perbandingan & sinkron stabil. Override kosong tidak ditulis. */
export function serializeProgramSettings(s: ProgramSettings): string {
  const out: Record<string, unknown> = { race: s.race, goal: s.goal, startDate: s.startDate, runsPerWeek: s.runsPerWeek };
  if (s.overrides.length) out.overrides = mergeOverrides(s.overrides);
  return JSON.stringify(out);
}

/** Id program: ganti jarak lomba atau tanggal mulai → id baru (sesi & override lama tidak terbawa). */
export const programIdOf = (s: Pick<ProgramSettings, "race" | "startDate">) => `${s.race}-${startOfWeekMonday(s.startDate)}`;

/** Gabungan override per `sessionId`: keputusan terbaru menang, seri → isi. Komutatif & idempoten. */
export function mergeOverrides(...lists: ProgramOverride[][]): ProgramOverride[] {
  const by = new Map<string, ProgramOverride>();
  for (const list of lists) {
    for (const o of list) {
      const cur = by.get(o.sessionId);
      if (!cur) by.set(o.sessionId, o);
      else if (o.decidedAt !== cur.decidedAt) by.set(o.sessionId, o.decidedAt > cur.decidedAt ? o : cur);
      else by.set(o.sessionId, JSON.stringify(o) > JSON.stringify(cur) ? o : cur);
    }
  }
  return [...by.values()].sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

/** Program aktif = pengaturan pernah disimpan dan hari ini di antara mulai dan sehari setelah lomba. */
export function isProgramActive(raw: string | null | undefined, program: Pick<Program, "input" | "raceDate"> | null, today: string): boolean {
  if (!raw || !program) return false;
  return today >= program.input.startDate && today <= addDays(program.raceDate, 1);
}

/**
 * Long run awal program: lari terjauh dalam 30 hari sebelum program mulai (berhenti di hari ini bila
 * program belum mulai). Setelah program berjalan nilainya tetap, sehingga target long run minggu yang
 * sudah lewat tidak bergeser.
 */
export function baseLongRunKm(activities: Activity[], startDate: string, today: string): number | undefined {
  const end = addDays(startDate, -1) < today ? addDays(startDate, -1) : today;
  const begin = addDays(end, -29);
  const longest = Math.max(0, ...activities.filter((a) => a.category === "run" && a.date && a.date >= begin && a.date <= end).map((a) => a.distanceKm ?? 0));
  return longest > 0 ? Math.round(longest * 10) / 10 : undefined;
}

/** Tanggal paling awal yang dibutuhkan untuk program ini (dasar long run 30 hari sebelum mulai). */
export const programDataOldest = (startDate: string) => addDays(startOfWeekMonday(startDate), -30);
