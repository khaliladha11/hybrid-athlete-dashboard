"use client";

import { CoachCard } from "@/components/generator/CoachCard";
import { useMemo } from "react";
import { suggestFor, todayDone, withStSessions, type Advice } from "@/lib/coach";
import { isRunKind } from "@/lib/program/sessions";
import { useStSessions } from "@/lib/st-session-store";
import { withCheckin } from "@/lib/checkin";
import { filledCheckin, useCheckins } from "@/lib/checkin-store";
import type { Activity } from "@/lib/intervals/types";
import { generatorHref, planToday, shortTitle, toGenerator } from "@/lib/program/to-generator";
import { recommendToday, weekSessions } from "@/lib/program/week-plan";
import { useProgramPlan } from "@/lib/program/use-program-plan";
import { planLine } from "./planText";

/**
 * Kartu "Saran hari ini" di Profil. Dengan program aktif dan sesi lari hari ini, kartu memulai dengan
 * "Rencana: … Saran: …" (PROGRAM-HIDUP §4.5); Terapkan membuka generator dengan versi yang diturunkan,
 * atau kartu long run yang dipendekkan. Tanpa program: kartu lama.
 */
export function ProfileCoach({ advice: serverAdvice, activities, oldest, today }: { advice: Advice[]; activities: Activity[]; oldest: string; today: string }) {
  const plan = useProgramPlan({ activities, oldest, today });
  const stSessions = useStSessions();
  const checkins = useCheckins();
  // 0.14.3: rencana hari ini = sesi minggu ini yang direkomendasikan untuk hari ini (bukan yang jatuh di tanggal ini).
  const week = plan.active && !plan.loading ? weekSessions(plan.sessions, plan.results, today) : null;
  const session = week ? recommendToday(week.remaining, { today, weekEnd: week.end, activities: plan.activities, stSessions }).session : null;
  // Sesi mode latihan di perangkat & aturan hari yang sama (0.14.1).
  const advice = useMemo(() => {
    const plannedToday = { run: !!session && isRunKind(session.kind), strength: !!session && !isRunKind(session.kind) };
    // Check-in hari ini (0.15.2): hanya menurunkan, tidak berantai dengan readiness.
    return withCheckin(withStSessions(serverAdvice, { sessions: stSessions, today, done: todayDone(activities, today), plannedToday }), filledCheckin(checkins, today));
  }, [serverAdvice, stSessions, today, activities, session, checkins]);
  const pt = session ? planToday(session, plan.sessions) : null;
  let line: { text: string; href?: string } | undefined;
  if (session && pt) {
    const s = suggestFor(advice, "run", { difficulty: pt.difficulty, duration: pt.duration ?? 45 }, { plan: pt });
    const t = toGenerator(session);
    // Quality spesifik lomba (kartu) yang diturunkan dikerjakan sebagai lari biasa di generator.
    const card = t.to === "card";
    const target = card && pt.duration ? { to: "run" as const, difficulty: pt.difficulty, duration: pt.duration } : t;
    const text = planLine(card ? session.title : shortTitle(session.title), pt, s, card);
    let href: string | undefined;
    if (s.longRunKm !== undefined) href = `/program?long=${s.longRunKm}${s.longRunEasy ? "&easy=1" : ""}#sesi-hari-ini`;
    else if (s.difficulty || s.duration) href = generatorHref(session, target, { difficulty: s.difficulty, duration: s.duration }) ?? undefined;
    line = { text, href };
  }
  return <CoachCard id="saran" tour="saran" advice={advice} planLine={line} />;
}
