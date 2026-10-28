/**
 * Pengaturan program target di perangkat (`hybrid-athlete.program`) dan override sesi (docs/PROGRAM-HIDUP.md §3).
 * Murni: dipakai halaman Program, Profil, kalender, dan gabungan sinkron.
 *
 * 0.13.3 (§4.10): Hari H (`raceDate`) dipilih atlet. Program lama tanpa Hari H dimigrasikan ke mulai + panjang
 * lamanya, dengan id lama, jadi status & override tidak berubah. Mengganti Hari H/mulai/jarak di tengah program
 * mengarsipkan program lama (`archived`) beserta override-nya, lalu program baru berjalan mulai hari ini.
 *
 * 0.14.3 (model mingguan): override hanya `skip`. Entri `move` lama dibuang saat dibaca (juga di arsip dan saat
 * sinkron) karena sesi kini boleh dikerjakan di hari apa pun dalam minggunya. `weekNotesSeen` = catatan akhir minggu
 * yang sudah ditutup (`{programId}:{minggu}`), digabung union saat sinkron.
 */
import { addDays, startOfWeekMonday } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import { RACES, formatGoal, goalFromProfile, type Program, type RaceTarget } from "@/lib/program";

export interface ProgramOverride {
  sessionId: string;
  action: "skip";
  /** ISO. */
  decidedAt: string;
}

export const MAX_WEEK_NOTES = 60;

export interface ProgramSettings {
  race: RaceTarget;
  goal: string;
  /** Senin minggu pertama. */
  startDate: string;
  /** Hari H (YYYY-MM-DD). Program lama tanpa Hari H: mulai + panjang lama − 1 hari (Minggu). */
  raceDate: string;
  runsPerWeek: 3 | 4;
  overrides: ProgramOverride[];
  /** Id program (0.13.3). Kosong = format lama `{jarak}-{Senin mulai}`. */
  id?: string;
  /** Sesi sebelum tanggal ini tidak dibuat (program baru yang dimulai di tengah minggu). */
  activeFrom?: string;
  /** Konfirmasi "Saya mengerti risikonya" untuk Hari H di band merah (ISO). */
  riskAckAt?: string;
  /** Pilihan atlet "Pernah menyelesaikan jarak ini?"; kosong = dari data. */
  completedBefore?: boolean;
  /** Catatan akhir minggu yang sudah ditutup (0.14.3), `{programId}:{minggu}`. */
  weekNotesSeen?: string[];
  archived: ArchivedProgram[];
}

/** Program lama yang diarsipkan saat Hari H, mulai, atau jarak diganti. Hanya dibaca (riwayat). */
export interface ArchivedProgram {
  id: string;
  race: RaceTarget;
  goal: string;
  startDate: string;
  raceDate: string;
  runsPerWeek: 3 | 4;
  activeFrom?: string;
  /** Long run awal yang dipakai program itu, dibekukan supaya riwayat tidak bergeser. */
  baseLongRunKm?: number;
  overrides: ProgramOverride[];
  /** Tanggal program baru berlaku; sesi arsip hanya sampai sebelum tanggal ini. */
  endedAt: string;
}

export const MAX_ARCHIVED = 20;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

export function isOverride(x: unknown): x is ProgramOverride {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.sessionId !== "string" || !o.sessionId || o.sessionId.length > 120 || !isIso(o.decidedAt)) return false;
  // 0.14.3: `move` tidak berlaku lagi di model mingguan → dibuang (migrasi).
  return o.action === "skip";
}

/** Override bersih (tanpa field lama `toDate`). */
const cleanOverride = (o: ProgramOverride): ProgramOverride => ({ sessionId: o.sessionId, action: "skip", decidedAt: o.decidedAt });

/** Daftar catatan minggu yang sudah ditutup: valid, unik, urut, maksimal 60 terbaru. */
export function mergeWeekNotes(...lists: unknown[]): string[] {
  const all = lists.flatMap((l) => (Array.isArray(l) ? l : [])).filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 120);
  return [...new Set(all)].sort().slice(-MAX_WEEK_NOTES);
}

/** Hari H panjang lama (0.13.2 ke bawah): Minggu terakhir program panjang standar. */
export const legacyRaceDate = (race: RaceTarget, startDate: string) => addDays(startOfWeekMonday(startDate), RACES[race].weeks * 7 - 1);

export function defaultProgramSettings(today: string, race: RaceTarget = "10k"): ProgramSettings {
  const startDate = startOfWeekMonday(today);
  return { race, goal: formatGoal(goalFromProfile(race)), startDate, raceDate: legacyRaceDate(race, startDate), runsPerWeek: 3, overrides: [], archived: [] };
}

const isRace = (v: unknown): v is RaceTarget => typeof v === "string" && v in RACES;
const isDate = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

export function isArchived(x: unknown): x is ArchivedProgram {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    !!a.id &&
    a.id.length <= 80 &&
    isRace(a.race) &&
    typeof a.goal === "string" &&
    isDate(a.startDate) &&
    isDate(a.raceDate) &&
    (a.runsPerWeek === 3 || a.runsPerWeek === 4) &&
    isDate(a.endedAt) &&
    (a.activeFrom === undefined || isDate(a.activeFrom)) &&
    (a.baseLongRunKm === undefined || (typeof a.baseLongRunKm === "number" && a.baseLongRunKm > 0 && a.baseLongRunKm < 100)) &&
    Array.isArray(a.overrides)
  );
}

const cleanArchived = (a: ArchivedProgram): ArchivedProgram => ({
  id: a.id,
  race: a.race,
  goal: a.goal.slice(0, 12),
  startDate: a.startDate,
  raceDate: a.raceDate,
  runsPerWeek: a.runsPerWeek,
  ...(a.activeFrom ? { activeFrom: a.activeFrom } : {}),
  ...(a.baseLongRunKm !== undefined ? { baseLongRunKm: a.baseLongRunKm } : {}),
  overrides: mergeOverrides(a.overrides.filter(isOverride)),
  endedAt: a.endedAt,
});

/**
 * Gabungan arsip per `id` (sinkron 0.13.3): gabungan dua sisi, override digabung per sesi, `endedAt` paling awal.
 * Komutatif & idempoten. Urut menurut `endedAt`, maksimal 20 (yang terbaru).
 */
export function mergeArchived(...lists: ArchivedProgram[][]): ArchivedProgram[] {
  const by = new Map<string, ArchivedProgram>();
  for (const list of lists) {
    for (const raw of list) {
      const a = cleanArchived(raw);
      const cur = by.get(a.id);
      if (!cur) {
        by.set(a.id, a);
        continue;
      }
      const keep = a.endedAt !== cur.endedAt ? (a.endedAt < cur.endedAt ? a : cur) : JSON.stringify(a) > JSON.stringify(cur) ? a : cur;
      by.set(a.id, { ...keep, overrides: mergeOverrides(cur.overrides, a.overrides) });
    }
  }
  return [...by.values()].sort((a, b) => a.endedAt.localeCompare(b.endedAt) || a.id.localeCompare(b.id)).slice(-MAX_ARCHIVED);
}

/**
 * Override yang id sesinya milik program arsip dipindahkan ke arsip itu (mis. keputusan dari perangkat lain
 * yang belum tahu programnya sudah diganti), supaya riwayat tidak kehilangan keputusan.
 */
export function routeOverrides(overrides: ProgramOverride[], archived: ArchivedProgram[]): { overrides: ProgramOverride[]; archived: ArchivedProgram[] } {
  const owner = (o: ProgramOverride) => archived.find((a) => o.sessionId.startsWith(`${a.id}:`));
  const moved = new Map<string, ProgramOverride[]>();
  const keep: ProgramOverride[] = [];
  for (const o of overrides) {
    const a = owner(o);
    if (a) moved.set(a.id, [...(moved.get(a.id) ?? []), o]);
    else keep.push(o);
  }
  if (!moved.size) return { overrides, archived };
  return { overrides: keep, archived: archived.map((a) => (moved.has(a.id) ? { ...a, overrides: mergeOverrides(a.overrides, moved.get(a.id)!) } : a)) };
}

/** Isi localStorage → pengaturan; rusak atau kosong → default (pratinjau, bukan program aktif). */
export function parseProgramSettings(raw: string | null | undefined, today: string): ProgramSettings {
  try {
    const s = JSON.parse(raw ?? "") as Partial<Record<keyof ProgramSettings, unknown>>;
    const base = defaultProgramSettings(today, isRace(s.race) ? s.race : "10k");
    const startDate = isDate(s.startDate) ? s.startDate : base.startDate;
    // Migrasi (0.13.3): tanpa Hari H → Minggu terakhir panjang lama, id lama tetap.
    const raceDate = isDate(s.raceDate) && s.raceDate > startDate ? s.raceDate : legacyRaceDate(base.race, startDate);
    const routed = routeOverrides(
      Array.isArray(s.overrides) ? mergeOverrides(s.overrides.filter(isOverride)) : [],
      Array.isArray(s.archived) ? mergeArchived(s.archived.filter(isArchived)) : [],
    );
    return {
      race: base.race,
      goal: typeof s.goal === "string" ? s.goal : base.goal,
      startDate,
      raceDate,
      runsPerWeek: s.runsPerWeek === 4 ? 4 : 3,
      overrides: routed.overrides,
      ...(typeof s.id === "string" && s.id && s.id.length <= 80 ? { id: s.id } : {}),
      ...(isDate(s.activeFrom) ? { activeFrom: s.activeFrom } : {}),
      ...(isIso(s.riskAckAt) ? { riskAckAt: s.riskAckAt } : {}),
      ...(typeof s.completedBefore === "boolean" ? { completedBefore: s.completedBefore } : {}),
      ...(Array.isArray(s.weekNotesSeen) && mergeWeekNotes(s.weekNotesSeen).length ? { weekNotesSeen: mergeWeekNotes(s.weekNotesSeen) } : {}),
      archived: routed.archived,
    };
  } catch {
    return defaultProgramSettings(today);
  }
}

/** Urutan kunci tetap supaya perbandingan & sinkron stabil. Override kosong tidak ditulis. */
export function serializeProgramSettings(s: ProgramSettings): string {
  const out: Record<string, unknown> = { race: s.race, goal: s.goal, startDate: s.startDate, raceDate: s.raceDate, runsPerWeek: s.runsPerWeek };
  if (s.id) out.id = s.id;
  if (s.activeFrom) out.activeFrom = s.activeFrom;
  if (s.riskAckAt) out.riskAckAt = s.riskAckAt;
  if (s.completedBefore !== undefined) out.completedBefore = s.completedBefore;
  if (s.weekNotesSeen?.length) out.weekNotesSeen = mergeWeekNotes(s.weekNotesSeen);
  if (s.overrides.length) out.overrides = mergeOverrides(s.overrides);
  if (s.archived.length) out.archived = mergeArchived(s.archived);
  return JSON.stringify(out);
}

/**
 * Id program. Program lama (tanpa `id`): `{jarak}-{Senin mulai}`. Program yang dibuat sejak 0.13.3 menyimpan id
 * `{jarak}-{Senin mulai}-{Hari H}`, jadi mengganti Hari H di minggu yang sama tetap memberi id baru.
 */
export const programIdOf = (s: Pick<ProgramSettings, "race" | "startDate"> & { id?: string }) => s.id ?? `${s.race}-${startOfWeekMonday(s.startDate)}`;
export const newProgramId = (race: RaceTarget, startDate: string, raceDate: string) => `${race}-${startOfWeekMonday(startDate)}-${raceDate}`;

/** Gabungan override per `sessionId`: keputusan terbaru menang, seri → isi. Komutatif & idempoten. */
export function mergeOverrides(...lists: ProgramOverride[][]): ProgramOverride[] {
  const by = new Map<string, ProgramOverride>();
  for (const list of lists) {
    for (const raw of list) {
      if (!isOverride(raw)) continue;
      const o = cleanOverride(raw);
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

export interface ProgramDraft {
  race: RaceTarget;
  goal: string;
  startDate: string;
  raceDate: string;
  runsPerWeek: 3 | 4;
  riskAckAt?: string;
  completedBefore?: boolean;
}

/**
 * "Buat program" (0.13.3, §4.10 I). Program lama yang sudah punya sesi sebelum hari ini diarsipkan beserta override
 * dan long run awalnya. Bila program lama sedang berjalan, program baru dimulai minggu ini dengan `activeFrom` =
 * hari ini (sesi sebelum hari ini tidak dibuat). Id baru memuat Hari H; id yang sudah dipakai arsip diberi akhiran.
 */
export function createProgram(
  current: ProgramSettings | null,
  draft: ProgramDraft,
  ctx: { today: string; active: boolean; hasHistory: boolean; baseLongRunKm?: number },
): ProgramSettings {
  const archived =
    current && ctx.hasHistory
      ? mergeArchived(current.archived, [
          {
            id: programIdOf(current),
            race: current.race,
            goal: current.goal,
            startDate: current.startDate,
            raceDate: current.raceDate,
            runsPerWeek: current.runsPerWeek,
            ...(current.activeFrom ? { activeFrom: current.activeFrom } : {}),
            ...(ctx.baseLongRunKm !== undefined ? { baseLongRunKm: ctx.baseLongRunKm } : {}),
            overrides: current.overrides,
            endedAt: ctx.today,
          },
        ])
      : (current?.archived ?? []);
  const startDate = current && ctx.active ? startOfWeekMonday(ctx.today) : startOfWeekMonday(draft.startDate);
  const activeFrom = current && ctx.active && ctx.today > startDate ? ctx.today : undefined;
  let id = newProgramId(draft.race, startDate, draft.raceDate);
  const taken = new Set([...archived.map((a) => a.id), ...(current ? [programIdOf(current)] : [])]);
  for (let i = 2; taken.has(id); i++) id = `${newProgramId(draft.race, startDate, draft.raceDate)}-${i}`;
  return {
    race: draft.race,
    goal: draft.goal,
    startDate,
    raceDate: draft.raceDate,
    runsPerWeek: draft.runsPerWeek,
    overrides: [],
    id,
    ...(activeFrom ? { activeFrom } : {}),
    ...(draft.riskAckAt ? { riskAckAt: draft.riskAckAt } : {}),
    ...(draft.completedBefore !== undefined ? { completedBefore: draft.completedBefore } : {}),
    archived,
  };
}
