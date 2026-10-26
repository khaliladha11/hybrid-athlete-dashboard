"use client";

import Link from "next/link";
import type { Activity } from "@/lib/intervals/types";
import { PHASE_LABEL, currentWeekIndex } from "@/lib/program";
import { weekSummary } from "@/lib/program/compliance";
import { useProgramPlan } from "@/lib/program/use-program-plan";

/**
 * Ringkasan minggu program di Profil (docs/PROGRAM-HIDUP.md §4.3):
 * `MINGGU 5/12 · BUILD · 3/5 SESI · LONG RUN 14 KM ✓`. Tanpa program aktif tidak tampil.
 */
export function ProgramWeekSummary({ activities, oldest, today }: { activities: Activity[]; oldest: string; today: string }) {
  const plan = useProgramPlan({ activities, oldest, today });
  const program = plan.program;
  if (!plan.active || !program || plan.loading) return null;
  const index = currentWeekIndex(program, today);
  const week = program.weeks.find((w) => w.index === index);
  if (!week) return null;
  const sum = weekSummary(plan.sessions, plan.results, index);
  const long = sum.longRun;
  const longText = long
    ? `${week.raceWeek ? "Lomba" : "Long run"} ${long.km ?? "·"} km${long.status === "selesai" ? " ✓" : long.status === "terlewat" ? " ✕" : long.status === "sebagian" ? " · sebagian" : ""}`
    : null;
  const parts = [`Minggu ${index}/${program.spec.weeks}`, PHASE_LABEL[week.phase], `${sum.done}/${sum.total} sesi`, longText].filter(Boolean);
  return (
    <Link
      href="/program#minggu-ini"
      className="pressable flex min-h-12 items-center gap-3 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card hover:bg-subtle"
      aria-label={`Program ${program.spec.label}: ${parts.join(", ")}. Buka Program`}
    >
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
      <span className="t-label tabular min-w-0 flex-1 text-ink">{parts.join(" · ")}</span>
      <span aria-hidden className="text-[13px] text-faint">
        ›
      </span>
    </Link>
  );
}
