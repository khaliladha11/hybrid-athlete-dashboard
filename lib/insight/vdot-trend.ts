/**
 * #9 VDOT dari waktu ke waktu (docs/INSIGHT.md §4). Murni: tanggal dari parameter, WIB.
 *
 * - Per minggu, VDOT dihitung ulang dengan sumber 0.13.2 (`lib/program/prediction.ts`) **hanya dari data sampai akhir
 *   minggu itu** (minggu berjalan: sampai hari ini): hasil lomba 90 hari lebih diutamakan (keyakinan tinggi), lalu
 *   lari ≥ 3 km 90 hari dengan VDOT tertinggi (keyakinan rendah).
 * - Garis target dari tujuan program aktif; selisih ke target dalam detik per km dari perkiraan waktu VDOT terakhir.
 */
import type { RaceResult } from "@/lib/athlete-settings";
import type { Activity } from "@/lib/intervals/types";
import type { Program } from "@/lib/program";
import { activitySource, raceSource, targetGap, type Confidence } from "@/lib/program/prediction";
import { timeForVdot, vdot } from "@/lib/run-zones";
import { clock, num1 } from "./format";
import type { Summary } from "./run-trends";
import type { Locale } from "@/lib/i18n/locale";
import { INSIGHT_LIB } from "@/lib/i18n/messages/insight-lib";

import { weekBuckets, type WeekBucket } from "./weeks";

export interface VdotWeek extends WeekBucket {
  vdot?: number;
  confidence?: Confidence;
  source?: "race" | "activity";
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export function vdotWeeks(activities: Activity[], raceResults: RaceResult[], today: string, weeks: number): VdotWeek[] {
  return weekBuckets(today, weeks).map((b) => {
    const asOf = b.current ? today : b.end;
    const src = raceSource(raceResults, asOf) ?? activitySource(activities, asOf);
    if (!src) return b;
    return { ...b, vdot: r1(src.vdot), confidence: src.kind === "race" ? "tinggi" : "rendah", source: src.kind };
  });
}

export interface VdotGoal {
  /** Nama pendek jarak (mis. "HM 21K"). */
  label: string;
  meters: number;
  goalSec: number;
  vdot: number;
}

/** Target VDOT dari program aktif; tanpa program → tanpa garis target. */
export function goalVdot(program: Pick<Program, "input" | "spec"> | null | undefined): VdotGoal | undefined {
  if (!program || !(program.input.goalSec > 0)) return undefined;
  const meters = program.spec.km * 1000;
  return { label: program.spec.short, meters, goalSec: program.input.goalSec, vdot: r1(vdot(meters, program.input.goalSec)) };
}

/** Selisih perkiraan dari VDOT ke target: null bila sudah di jalur. */
export function goalGapSec(currentVdot: number, goal: VdotGoal): number | null {
  const gap = targetGap(timeForVdot(goal.meters, currentVdot), goal.goalSec, goal.meters);
  return gap.onTrack ? null : gap.secPerKm;
}

export function vdotSummary(rows: VdotWeek[], goal?: VdotGoal, locale: Locale = "id"): Summary {
  const L = INSIGHT_LIB[locale].vdot;
  const conf = (c: Confidence) => L.conf[c];
  const pts = rows.filter((r) => r.vdot !== undefined);
  if (!pts.length) return { drawable: false, text: L.none };
  const last = pts.at(-1)!;
  const tail = goal
    ? (() => {
        const gap = goalGapSec(last.vdot!, goal);
        return gap === null ? L.onTrack(goal.label) : L.gap(clock(gap), goal.label);
      })()
    : "";
  if (pts.length < 2) return { drawable: false, text: L.current(num1(last.vdot!, locale), conf(last.confidence!), tail) };
  const first = pts[0].vdot!;
  const d = last.vdot! - first;
  const trend = Math.abs(d) < 0.3 ? L.stable(num1(last.vdot!, locale)) : L.change(d > 0, num1(first, locale), num1(last.vdot!, locale));
  return { drawable: true, text: L.line(trend, conf(last.confidence!), tail) };
}
