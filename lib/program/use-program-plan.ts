"use client";

/**
 * Program di perangkat + aktivitas dari server → sesi rencana & kepatuhan (docs/PROGRAM-HIDUP.md D3).
 * Halaman mengirim aktivitas yang sudah diambil server; bila program butuh data lebih lama (mulai program
 * − 30 hari untuk dasar long run), sisanya diambil sekali lewat `/api/activities`. Kepatuhan dihitung di client
 * dengan modul murni; API key tidak pernah keluar dari server.
 */
import { useEffect, useMemo, useState } from "react";
import type { Activity, IntervalsError } from "@/lib/intervals/types";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { buildProgram, parseGoal, type Program } from "@/lib/program";
import { useResolvedProfile } from "@/lib/settings-store";
import { useTrainingLog } from "@/lib/training-log";
import { evaluateCompliance, type SessionResult } from "./compliance";
import { planSessions, type PlannedSession } from "./sessions";
import { baseLongRunKm, isProgramActive, parseProgramSettings, programDataOldest, programIdOf, serializeProgramSettings, type ProgramSettings } from "./settings";

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
  const saved = !!raw;

  const needOldest = saved ? programDataOldest(settings.startDate) : null;
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
  const program = useMemo(
    () => (goalSec ? buildProgram({ race: settings.race, goalSec, startDate: settings.startDate, runsPerWeek: settings.runsPerWeek, currentLongRunKm: base }, p) : null),
    [goalSec, settings.race, settings.startDate, settings.runsPerWeek, base, p],
  );
  const sessions = useMemo(() => (program ? planSessions(program, programIdOf(settings), settings.overrides) : []), [program, settings]);
  const logDates = useMemo(() => log.map((e) => e.date), [log]);
  const results = useMemo(() => evaluateCompliance(sessions, all, logDates, today), [sessions, all, logDates, today]);

  const save = (patch: Partial<ProgramSettings>) => {
    const next = { ...settings, ...patch };
    // Program baru (jarak / tanggal mulai berganti): override program lama tidak berlaku lagi.
    if (programIdOf(next) !== programIdOf(settings)) next.overrides = [];
    setRaw(serializeProgramSettings(next));
  };

  return {
    saved,
    settings,
    save,
    reset: () => setRaw(null),
    program,
    active: isProgramActive(raw, program, today),
    sessions,
    results,
    activities: all,
    baseLongRunKm: base,
    loading,
    ...(fetched && !fetched.ok ? { error: fetched.error } : {}),
  };
}
