"use client";

/**
 * Program di perangkat + aktivitas dari server → sesi rencana & kepatuhan (docs/PROGRAM-HIDUP.md D3).
 * Halaman mengirim aktivitas yang sudah diambil server; bila program butuh data lebih lama (mulai program
 * − 30 hari untuk dasar long run), sisanya diambil sekali lewat `/api/activities`. Kepatuhan dihitung di client
 * dengan modul murni; API key tidak pernah keluar dari server.
 */
import { useEffect, useMemo, useState } from "react";
import { addDays } from "@/lib/date";
import type { Activity, IntervalsError } from "@/lib/intervals/types";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { buildProgram, parseGoal, type Program } from "@/lib/program";
import { useResolvedProfile } from "@/lib/settings-store";
import { useStSessions } from "@/lib/st-session-store";
import { useTrainingLog } from "@/lib/training-log";
import { evaluateCompliance, type SessionResult } from "./compliance";
import { planSessions, type PlannedSession } from "./sessions";
import { programShape } from "./timeline";
import {
  baseLongRunKm,
  createProgram,
  isProgramActive,
  mergeOverrides,
  parseProgramSettings,
  programDataOldest,
  programIdOf,
  serializeProgramSettings,
  type ArchivedProgram,
  type ProgramDraft,
  type ProgramOverride,
  type ProgramSettings,
} from "./settings";

type Fetched = { ok: true; data: Activity[] } | { ok: false; error: IntervalsError };
const cache = new Map<string, Promise<Fetched>>();

function fetchSince(oldest: string): Promise<Fetched> {
  const hit = cache.get(oldest);
  if (hit) return hit;
  const p = fetch(`/api/activities?oldest=${oldest}`, { cache: "no-store" })
    .then((r) => r.json() as Promise<Fetched>)
    .catch((): Fetched => ({ ok: false, error: { code: "NETWORK", title: "Tidak bisa terhubung", message: "Periksa koneksi lalu muat ulang halaman." } }));
  cache.set(oldest, p);
  // Gagal tidak disimpan supaya bisa dicoba lagi saat halaman dibuka ulang.
  void p.then((r) => !r.ok && cache.delete(oldest));
  return p;
}

export interface ProgramPlan {
  /** Pengaturan program pernah disimpan di perangkat ini (bukan pratinjau default). */
  saved: boolean;
  settings: ProgramSettings;
  /** Simpan perubahan pengaturan (override ikut dipertahankan). */
  save: (patch: Partial<ProgramSettings>) => void;
  /** Keputusan geser/lewati satu sesi (0.13.2); digabung per sesi, keputusan terbaru menang. */
  decide: (o: Pick<ProgramOverride, "sessionId" | "action" | "toDate">) => void;
  /** "Buat program" (0.13.3): program lama yang punya riwayat diarsipkan. */
  create: (draft: ProgramDraft) => void;
  /** Program arsip (riwayat): sesi sebelum program berikutnya berlaku, statusnya ada di `results`. */
  archived: { archive: ArchivedProgram; program: Program; sessions: PlannedSession[] }[];
  reset: () => void;
  program: Program | null;
  /** Program tersimpan dan hari ini di rentangnya. */
  active: boolean;
  sessions: PlannedSession[];
  results: Map<string, SessionResult>;
  activities: Activity[];
  baseLongRunKm?: number;
  loading: boolean;
  error?: IntervalsError;
}

export function useProgramPlan({ activities, oldest, today }: { activities: Activity[]; oldest: string; today: string }): ProgramPlan {
  const [raw, setRaw] = useStoredString(PREF_KEYS.program, "");
  const settings = useMemo(() => parseProgramSettings(raw, today), [raw, today]);
  const p = useResolvedProfile();
  const log = useTrainingLog();
  const stSessions = useStSessions();
  const saved = !!raw;

  // Data cukup untuk program sekarang dan arsip (dasar long run 30 hari sebelum mulai), maksimal 200 hari.
  const floorDate = addDays(today, -199);
  const wanted = saved ? [settings.startDate, ...settings.archived.map((a) => a.startDate)].map(programDataOldest).sort()[0] : null;
  const needOldest = wanted ? (wanted < floorDate ? floorDate : wanted) : null;
  const needFetch = needOldest !== null && needOldest < oldest;
  const [extra, setExtra] = useState<{ key: string; result: Fetched } | null>(null);
  useEffect(() => {
    if (!needFetch || !needOldest) return;
    let alive = true;
    void fetchSince(needOldest).then((result) => alive && setExtra({ key: needOldest, result }));
    return () => {
      alive = false;
    };
  }, [needFetch, needOldest]);
  const fetched = needFetch && extra?.key === needOldest ? extra.result : null;
  const loading = needFetch && !fetched;

  const all = useMemo(() => {
    if (!fetched?.ok) return activities;
    const byId = new Map(activities.map((a) => [a.id, a]));
    for (const a of fetched.data) if (!byId.has(a.id)) byId.set(a.id, a);
    return [...byId.values()].sort((a, b) => (b.startLocal ?? "").localeCompare(a.startLocal ?? ""));
  }, [activities, fetched]);

  const base = useMemo(() => baseLongRunKm(all, settings.startDate, today), [all, settings.startDate, today]);
  const goalSec = parseGoal(settings.goal);
  const program = useMemo(() => {
    const shape = programShape(settings.race, settings.startDate, settings.raceDate);
    if (!goalSec || !shape) return null;
    return buildProgram(
      {
        race: settings.race,
        goalSec,
        startDate: settings.startDate,
        runsPerWeek: settings.runsPerWeek,
        currentLongRunKm: base,
        weeks: shape.mainWeeks,
        preBaseWeeks: shape.preBaseWeeks,
        rawLongestKm: base,
        raceDate: settings.raceDate,
      },
      p,
    );
  }, [goalSec, settings.race, settings.startDate, settings.raceDate, settings.runsPerWeek, base, p]);
  const sessions = useMemo(() => (program ? planSessions(program, programIdOf(settings), settings.overrides, settings.activeFrom) : []), [program, settings]);
  const logDates = useMemo(() => log.map((e) => e.date), [log]);

  // Arsip: dibangun ulang dari pengaturan beku, hanya sesi sebelum program berikutnya berlaku.
  const archived = useMemo(
    () =>
      settings.archived.flatMap((a) => {
        const g = parseGoal(a.goal);
        const shape = programShape(a.race, a.startDate, a.raceDate);
        if (!g || !shape) return [];
        const prog = buildProgram(
          {
            race: a.race,
            goalSec: g,
            startDate: a.startDate,
            runsPerWeek: a.runsPerWeek,
            currentLongRunKm: a.baseLongRunKm,
            weeks: shape.mainWeeks,
            preBaseWeeks: shape.preBaseWeeks,
            rawLongestKm: a.baseLongRunKm,
            raceDate: a.raceDate,
          },
          p,
        );
        return [{ archive: a, program: prog, sessions: planSessions(prog, a.id, a.overrides, a.activeFrom).filter((s) => s.plannedDate < a.endedAt) }];
      }),
    [settings.archived, p],
  );
  const results = useMemo(() => {
    const m = evaluateCompliance(sessions, all, logDates, today, stSessions);
    // Arsip dinilai terpisah supaya aktivitas program sekarang tidak "dicuri" sesi arsip.
    for (const a of archived) for (const [k, v] of evaluateCompliance(a.sessions, all, logDates, today, stSessions)) m.set(k, v);
    return m;
  }, [sessions, archived, all, logDates, today, stSessions]);

  const save = (patch: Partial<ProgramSettings>) => {
    const next = { ...settings, ...patch };
    // Program baru (jarak / tanggal mulai berganti): override program lama tidak berlaku lagi.
    if (programIdOf(next) !== programIdOf(settings)) next.overrides = [];
    setRaw(serializeProgramSettings(next));
  };

  const decide = (o: Pick<ProgramOverride, "sessionId" | "action" | "toDate">) =>
    save({ overrides: mergeOverrides(settings.overrides, [{ ...o, decidedAt: new Date().toISOString() }]) });

  const active = isProgramActive(raw, program, today);
  const create = (draft: ProgramDraft) =>
    setRaw(
      serializeProgramSettings(
        createProgram(saved ? settings : null, draft, { today, active, hasHistory: saved && sessions.some((s) => s.plannedDate < today), baseLongRunKm: base }),
      ),
    );

  return {
    saved,
    settings,
    save,
    decide,
    create,
    archived,
    reset: () => setRaw(null),
    program,
    active,
    sessions,
    results,
    activities: all,
    baseLongRunKm: base,
    loading,
    ...(fetched && !fetched.ok ? { error: fetched.error } : {}),
  };
}
