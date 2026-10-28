"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MonthlyCard } from "@/components/insight/BodyTrends";
import { availableMovements } from "@/components/insight/StrengthTrends";
import { addDays } from "@/lib/date";
import { monthlySummary, previousMonth, showMonthlyCard } from "@/lib/insight/monthly";
import type { Activity } from "@/lib/intervals/types";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { usePrs } from "@/lib/pr-store";
import { useAthleteSettings, useIsClient, useResolvedProfile } from "@/lib/settings-store";
import { useStSessions } from "@/lib/st-session-store";
import { useTrainingLog } from "@/lib/training-log";

/**
 * Kartu ringkasan bulanan di Profil (0.15.2, #12): tanggal 1–7, sekali per bulan (ditutup di perangkat ini).
 * Aktivitas 90 hari sebelum akhir bulan lalu diambil sekali lewat `/api/activities` (untuk VDOT) hanya saat kartu tampil.
 */
export function MonthlyProfileCard({ today }: { today: string }) {
  const client = useIsClient();
  const [dismissed, setDismissed] = useStoredString(PREF_KEYS.monthlyDismissed, "");
  const show = client && showMonthlyCard(today, dismissed || null);
  const month = previousMonth(today);
  const [acts, setActs] = useState<Activity[] | null>(null);
  useEffect(() => {
    if (!show) return;
    let alive = true;
    const oldest = addDays(month.end, -119);
    void fetch(`/api/activities?oldest=${oldest}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<{ ok: boolean; data?: Activity[] }>)
      .then((r) => alive && setActs(r.ok && r.data ? r.data : []))
      .catch(() => alive && setActs([]));
    return () => {
      alive = false;
    };
  }, [show, month.end]);
  const sessions = useStSessions();
  const log = useTrainingLog();
  const prs = usePrs();
  const [athlete] = useAthleteSettings();
  const profile = useResolvedProfile();
  const summary = useMemo(
    () => (acts ? monthlySummary({ today, activities: acts, stSessions: sessions, log, prs, raceResults: athlete.raceResults, available: availableMovements(profile) }) : null),
    [acts, today, sessions, log, prs, athlete.raceResults, profile],
  );
  if (!show || !summary) return null;
  return (
    <div className="space-y-1">
      <MonthlyCard
        summary={summary}
        action={
          <button type="button" onClick={() => setDismissed(summary.key)} className="pressable inline-flex min-h-11 items-center text-[13px] text-muted">
            Tutup
          </button>
        }
      />
      <Link href="/insight" className="pressable inline-flex min-h-11 items-center px-1 text-body font-semibold text-brand-ink">
        Lihat tren →
      </Link>
    </div>
  );
}
