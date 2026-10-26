"use client";

import Link from "next/link";
import type { Activity } from "@/lib/intervals/types";
import { PHASE_LABEL, currentWeekIndex, postRaceOffer } from "@/lib/program";
import { weekSummary } from "@/lib/program/compliance";
import { todaySession } from "@/lib/program/to-generator";
import { useProgramPlan } from "@/lib/program/use-program-plan";
import { useAthleteSettings } from "@/lib/settings-store";
import { MissedSessions } from "./MissedSessions";
import { PostRaceOffer, countdownText } from "./RaceDay";
import { TodaySessionAction } from "./TodaySessionAction";

/**
 * Ringkasan minggu program di Profil (docs/PROGRAM-HIDUP.md §4.3):
 * `MINGGU 5/12 · BUILD · 3/5 SESI · LONG RUN 14 KM ✓`, hitung mundur lomba (§4.9), sesi terlewat yang
 * menunggu keputusan (§4.8, maks. 2), dan tombol "Kerjakan sesi hari ini" (§4.4).
 * Tanpa program aktif tidak tampil, kecuali tawaran mencatat hasil sampai 14 hari setelah lomba.
 */
export function ProgramWeekSummary({ activities, oldest, today }: { activities: Activity[]; oldest: string; today: string }) {
  const plan = useProgramPlan({ activities, oldest, today });
  const [athlete] = useAthleteSettings();
  const program = plan.program;
  if (!plan.saved || !program || plan.loading) return null;
  // Setelah lomba (H+1 masih terhitung aktif) ringkasan diganti tawaran mencatat hasil.
  if (postRaceOffer(program, athlete.raceResults, today)) return <PostRaceOffer program={program} />;
  if (!plan.active) return null;
  const index = currentWeekIndex(program, today);
  const week = program.weeks.find((w) => w.index === index);
  if (!week) return null;
  const sum = weekSummary(plan.sessions, plan.results, index);
  const long = sum.longRun;
  const longText = long
    ? `${week.raceWeek ? "Lomba" : "Long run"} ${long.km ?? "·"} km${long.status === "selesai" ? " ✓" : long.status === "terlewat" ? " ✕" : long.status === "sebagian" ? " · sebagian" : ""}`
    : null;
  const parts = [`Minggu ${index}/${program.spec.weeks}`, PHASE_LABEL[week.phase], `${sum.done}/${sum.total} sesi`, longText].filter(Boolean);
  const countdown = countdownText(program, today);
  const todayS = todaySession(plan.sessions, plan.results, today);
  return (
    <div className="space-y-2 rounded-card border border-line bg-surface p-2 shadow-card">
      <Link
        href="/program#minggu-ini"
        className="pressable flex min-h-12 items-center gap-3 rounded-inner px-2 py-1.5 hover:bg-subtle"
        aria-label={`Program ${program.spec.label}: ${parts.join(", ")}${countdown ? `, ${countdown}` : ""}. Buka Program`}
      >
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
        <span className="min-w-0 flex-1">
          <span className="t-label tabular block text-ink">{parts.join(" · ")}</span>
          {countdown && <span className="t-label tabular mt-1 block">{countdown}</span>}
        </span>
        <span aria-hidden className="text-[13px] text-faint">
          ›
        </span>
      </Link>
      <div className="empty:hidden">
        <MissedSessions plan={plan} today={today} max={2} />
      </div>
      {todayS && <TodaySessionAction session={todayS} program={program} where="profile" />}
    </div>
  );
}
