"use client";

import { CoachCard } from "@/components/generator/CoachCard";
import { suggestFor, type Advice } from "@/lib/coach";
import type { Activity } from "@/lib/intervals/types";
import { generatorHref, planToday, shortTitle, todaySession, toGenerator } from "@/lib/program/to-generator";
import { useProgramPlan } from "@/lib/program/use-program-plan";
import { planLine } from "./planText";

/**
 * Kartu "Saran hari ini" di Profil. Dengan program aktif dan sesi lari hari ini, kartu memulai dengan
 * "Rencana: … Saran: …" (PROGRAM-HIDUP §4.5); Terapkan membuka generator dengan versi yang diturunkan,
 * atau kartu long run yang dipendekkan. Tanpa program: kartu lama.
 */
export function ProfileCoach({ advice, activities, oldest, today }: { advice: Advice[]; activities: Activity[]; oldest: string; today: string }) {
  const plan = useProgramPlan({ activities, oldest, today });
  const session = plan.active && !plan.loading ? todaySession(plan.sessions, plan.results, today) : null;
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
