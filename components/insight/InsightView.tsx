"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { ChartCard, Swatch } from "@/components/charts/ChartCard";
import { LineChart, type DotStyle } from "@/components/charts/LineChart";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Segmented } from "@/components/ui/Segmented";
import { formatPaceTag } from "@/components/ui/format";
import { addDays } from "@/lib/date";
import { FORM_BAND, fitnessSeries } from "@/lib/insight/fitness";
import { num1 } from "@/lib/insight/format";
import { cadenceGoal, cutbackStarts, deloadStarts, easySummary, easyValue, runWeeks, volumeSummary, type EasyKey, type RunWeek } from "@/lib/insight/run-trends";
import { goalVdot, vdotSummary, vdotWeeks } from "@/lib/insight/vdot-trend";
import { RANGE_OPTIONS, weekBuckets, weekLabel, type RangeWeeks } from "@/lib/insight/weeks";
import type { Activity, FetchResult, Wellness } from "@/lib/intervals/types";
import type { Confidence } from "@/lib/program/prediction";
import { useProgramPlan } from "@/lib/program/use-program-plan";
import { useAthleteSettings, useBlockMode, useResolvedProfile } from "@/lib/settings-store";
import { complianceWeeks } from "@/lib/insight/compliance-trend";
import { patternMap, stWork, strengthWeeks } from "@/lib/insight/strength-trends";
import { DEMO_BARBELL_CAP_KG, mockInsightStrength } from "@/lib/mock-data";
import { usePrs } from "@/lib/pr-store";
import { baseProfile, findMovement } from "@/lib/profile";
import { mergePrs } from "@/lib/prs";
import { mergeSessions } from "@/lib/st-session";
import { useStSessions } from "@/lib/st-session-store";
import { useTrainingLog } from "@/lib/training-log";
import { ActivityHeatmap, ComplianceTrend } from "./ProgramCalendarTrends";
import { CheckinTrend, MonthlyCard, ThresholdCard } from "./BodyTrends";
import { mergeCheckins } from "@/lib/checkin";
import { useCheckins } from "@/lib/checkin-store";
import { monthlySummary } from "@/lib/insight/monthly";
import { mockInsightCheckins } from "@/lib/mock-data";
import { hrvBaseline, rhrBaseline, thresholdLines, type HardRunThreshold } from "@/lib/thresholds";
import { availableSignals } from "@/lib/wellness-signals";
import { MuscleHeatmap, PrTrend, StrengthVolume, availableMovements } from "./StrengthTrends";
import { useLocale, useT } from "@/lib/i18n/client";
import { INSIGHT } from "@/lib/i18n/messages/insight";
import { DAY_MONTH, formatDay } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";

const PATTERNS = patternMap(baseProfile.movementLibrary);

const dayLabel = (d: string, l: Locale) => formatDay(l, d, DAY_MONTH).replace(".", "");
const weekRow = (r: { start: string; current: boolean }, l: Locale) => `${weekLabel(r.start, l)}${r.current ? INSIGHT[l].currentWeek : ""}`;
const DOT: Record<Confidence, DotStyle> = { tinggi: "filled", sedang: "ring", rendah: "thin" };

/**
 * Insight (docs/INSIGHT.md §4). Lari (0.15.0): CTL/ATL/Form, km mingguan 80/20, easy run pace/HR/cadence, VDOT.
 * Kekuatan (0.15.1): volume ST per pola & session-RPE, heatmap otot, tren PR. Program & kalender (0.15.1): kepatuhan
 * mingguan, kalender heatmap. Data intervals.icu dari server (sekali per buka halaman), data perangkat (sesi ST, log ★,
 * PR, hasil lomba, program, blok) di sini. Demo Mode menambah data ST fiktif tanpa menulis ke perangkat. Pilihan
 * 6/12 minggu hanya memotong data yang sudah ada. Grafik tidak mengubah saran (I3).
 */
export function InsightView({
  activities,
  wellness,
  today,
  runThreshold,
  week,
}: {
  /** Ringkasan 7 hari + Week Ledger (1.1.0, pindah dari Profil); dirender server di atas pilihan rentang. */
  week?: React.ReactNode;
  activities: FetchResult<Activity[]>;
  wellness: FetchResult<Wellness[]>;
  today: string;
  runThreshold: HardRunThreshold;
}) {
  const [weeks, setWeeks] = useState<RangeWeeks>(6);
  const t = useT(INSIGHT);
  const locale = useLocale();
  const acts = useMemo(() => (activities.ok ? activities.data : []), [activities]);
  const plan = useProgramPlan({ activities: acts, oldest: addDays(today, -181), today });
  const [athlete] = useAthleteSettings();
  const [blockOn] = useBlockMode();
  const profile = useResolvedProfile();

  const marks = useMemo(() => {
    const buckets = weekBuckets(today, weeks);
    return {
      cutback: plan.saved ? cutbackStarts(plan.program) : [],
      deload: blockOn ? deloadStarts(buckets, profile.training?.blockStart, profile.training?.blockWeeks) : [],
    };
  }, [today, weeks, plan.saved, plan.program, blockOn, profile.training?.blockStart, profile.training?.blockWeeks]);
  const rows = useMemo(() => runWeeks(acts, today, weeks, marks), [acts, today, weeks, marks]);
  const goal = plan.active ? goalVdot(plan.program) : undefined;

  // Kekuatan: data perangkat (+ data ST fiktif di Demo Mode, tidak pernah disimpan).
  const demo = activities.ok && activities.source === "demo";
  const deviceSessions = useStSessions();
  const deviceLog = useTrainingLog();
  const devicePrs = usePrs();
  const demoSt = useMemo(() => (demo ? mockInsightStrength(today) : null), [demo, today]);
  const stSessions = useMemo(() => (demoSt ? mergeSessions(deviceSessions, demoSt.sessions) : deviceSessions), [deviceSessions, demoSt]);
  const log = useMemo(() => (demoSt ? [...deviceLog, ...demoSt.log] : deviceLog), [deviceLog, demoSt]);
  const prs = useMemo(() => (demoSt ? mergePrs(devicePrs, demoSt.prs) : devicePrs), [devicePrs, demoSt]);
  const work = useMemo(() => stWork(stSessions, log), [stSessions, log]);
  const stRows = useMemo(() => strengthWeeks(work, stSessions, PATTERNS, today, weeks), [work, stSessions, today, weeks]);
  const available = useMemo(() => availableMovements(profile), [profile]);
  // Batas alat: batas beban 0.14.0 bila aktif, selain itu beban terberat yang bisa dirakit.
  const capOf = (movement: string) => {
    const m = findMovement(movement, profile.movementLibrary);
    const cap = m && m.available !== false ? (m.cap?.kg ?? (m.loads?.length ? Math.max(...m.loads) : undefined)) : undefined;
    return cap ?? (demo && movement === "Barbell Squat" ? DEMO_BARBELL_CAP_KG : undefined);
  };
  const logDates = useMemo(() => log.map((e) => e.date), [log]);

  // Tubuh (0.15.2): check-in perangkat (+ fiktif di Demo Mode), status ambang, ringkasan bulan lalu.
  const deviceCheckins = useCheckins();
  const checkins = useMemo(() => (demo ? mergeCheckins(deviceCheckins, mockInsightCheckins(today)) : deviceCheckins), [demo, deviceCheckins, today]);
  const thresholds = useMemo(() => {
    const w = wellness.ok ? wellness.data : [];
    const signals = availableSignals(w, today);
    return thresholdLines({ hard: runThreshold, hrv: hrvBaseline(w, today), restingHr: rhrBaseline(w, today), hrvAvailable: signals.has("hrv"), rhrAvailable: signals.has("restingHr") }, locale);
  }, [wellness, today, runThreshold, locale]);
  const monthly = useMemo(
    () => monthlySummary({ today, activities: acts, stSessions, log, prs, raceResults: athlete.raceResults, available }),
    [today, acts, stSessions, log, prs, athlete.raceResults, available],
  );
  const compliance = useMemo(
    // Hanya program yang benar-benar disimpan (bukan pratinjau default) dan arsipnya.
    () => complianceWeeks(plan.saved ? [...plan.sessions, ...plan.archived.flatMap((a) => a.sessions)] : [], plan.results, today, weeks),
    [plan.saved, plan.sessions, plan.archived, plan.results, today, weeks],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-display text-brand-ink">{t.title}</h1>
        <p className="mt-1 text-body text-muted">{t.intro}</p>
      </div>
      {week}
      <Segmented
        label={t.range}
        value={weeks}
        options={RANGE_OPTIONS.map((w) => ({ value: w, label: t.weeksOption(w) }))}
        onChange={(v) => setWeeks(v)}
      />

      <h2 className="t-label pt-2 text-ink">{t.sections.run}</h2>
      {wellness.ok ? <Fitness wellness={wellness.data} today={today} weeks={weeks} /> : <SourceError title={t.fitness.title} result={wellness} />}
      {activities.ok ? (
        <>
          <Volume rows={rows} />
          <Easy rows={rows} kind="pace" />
          <Easy rows={rows} kind="hr" />
          <Easy rows={rows} kind="cadence" target={cadenceGoal(acts, today)} />
          <Vdot activities={acts} today={today} weeks={weeks} raceResults={athlete.raceResults} goal={goal} />
        </>
      ) : (
        <SourceError title={t.runTrends} result={activities} />
      )}

      <h2 className="t-label pt-2 text-ink">{t.sections.strength}</h2>
      <StrengthVolume rows={stRows} />
      <MuscleHeatmap work={work} today={today} available={available} />
      <PrTrend prs={prs} log={log} capOf={capOf} />

      <h2 className="t-label pt-2 text-ink">{t.sections.body}</h2>
      <CheckinTrend checkins={checkins} today={today} weeks={weeks} />
      <ThresholdCard lines={thresholds} />
      <MonthlyCard summary={monthly} />

      <h2 className="t-label pt-2 text-ink">{t.sections.program}</h2>
      {!plan.loading && <ComplianceTrend rows={compliance} />}
      <ActivityHeatmap activities={acts} stSessions={stSessions} logDates={logDates} today={today} />
    </div>
  );
}

function SourceError({ title, result }: { title: string; result: Extract<FetchResult<unknown>, { ok: false }> }) {
  return (
    <Card title={title}>
      <ErrorState error={result.error} compact />
    </Card>
  );
}

function Fitness({ wellness, today, weeks }: { wellness: Wellness[]; today: string; weeks: number }) {
  const s = fitnessSeries(wellness, today, weeks);
  const locale = useLocale();
  const t = useT(INSIGHT);
  const fmt = (v: number | undefined) => (v === undefined ? undefined : num1(v));
  return (
    <ChartCard
      title={t.fitness.title}
      summary={s.summary}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label="CTL" line />
          <Swatch className="bg-muted" label="ATL" line />
          <Swatch className="bg-track" label="Form" />
          <Swatch className="bg-subtle border border-line" label={t.fitness.band(String(FORM_BAND[0]).replace("-", "−"), FORM_BAND[1])} />
        </>
      }
      table={{
        columns: [t.cols.date, "CTL", "ATL", "Form"],
        rows: [...s.days].reverse().map((d) => [dayLabel(d.date, locale), fmt(d.ctl), fmt(d.atl), fmt(d.form)]),
      }}
    >
      <LineChart
        ariaLabel={t.fitness.aria(weeks, s.summary)}
        labels={s.days.map((d) => dayLabel(d.date, locale))}
        series={[
          { values: s.days.map((d) => d.ctl), tone: "brand" },
          { values: s.days.map((d) => d.atl), tone: "muted" },
        ]}
        area={s.days.map((d) => d.form)}
        band={FORM_BAND}
      />
    </ChartCard>
  );
}

function markText(r: RunWeek): string | undefined {
  const parts = [r.jump && r.change !== undefined ? `+${Math.round(r.change * 100)}%` : null, r.cutback ? "CB" : null, r.deload ? "DL" : null].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function Volume({ rows }: { rows: RunWeek[] }) {
  const s = volumeSummary(rows);
  const locale = useLocale();
  const t = useT(INSIGHT);
  const current = rows.findIndex((r) => r.current);
  return (
    <ChartCard
      title={t.volume.title}
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-success" label="Easy" />
          <Swatch className="bg-danger" label={t.cols.hard} />
          {rows.some((r) => r.jump) && <span>{t.volume.jump}</span>}
          {rows.some((r) => r.cutback) && <span>{t.volume.cutback}</span>}
          {rows.some((r) => r.deload) && <span>{t.volume.deload}</span>}
        </>
      }
      table={{
        columns: [t.cols.week, t.cols.km, t.cols.easy, t.cols.hard, t.cols.change],
        rows: [...rows].reverse().map((r) => [
          `${weekRow(r, locale)}${r.runs ? "" : t.volume.noRun}${r.cutback ? t.volume.cutbackRow : ""}${r.deload ? t.volume.deloadRow : ""}`,
          num1(r.km),
          num1(r.easyKm),
          num1(r.hardKm),
          r.change === undefined ? undefined : `${r.change > 0 ? "+" : ""}${Math.round(r.change * 100)}%${r.jump ? " ▲" : ""}`.replace("-", "−"),
        ]),
      }}
    >
      <BarChart
        ariaLabel={t.volume.aria(rows.length, s.text)}
        labels={rows.map((r) => weekLabel(r.start, locale))}
        stacks={[
          { values: rows.map((r) => r.easyKm), tone: "success" },
          { values: rows.map((r) => r.hardKm), tone: "danger" },
        ]}
        marks={rows.map(markText)}
        partial={current >= 0 ? current : undefined}
      />
    </ChartCard>
  );
}

const EASY: Record<EasyKey, { title: "pace" | "hr" | "cadence"; column: "medianPace" | "medianHr" | "medianCadence"; fmt: (v: number) => string; count: (r: RunWeek) => number }> = {
  pace: { title: "pace", column: "medianPace", fmt: (v) => `${formatPaceTag(v)}/km`, count: (r) => r.easy.runs },
  hr: { title: "hr", column: "medianHr", fmt: (v) => `${v} bpm`, count: (r) => r.easy.hrRuns },
  cadence: { title: "cadence", column: "medianCadence", fmt: (v) => `${v} SPM`, count: (r) => r.easy.cadenceRuns },
};

function Easy({ rows, kind, target }: { rows: RunWeek[]; kind: EasyKey; target?: number }) {
  const s = easySummary(rows, kind, target);
  const cfg = EASY[kind];
  const locale = useLocale();
  const t = useT(INSIGHT);
  const column = t.easy[cfg.column];
  const missing = kind === "pace" ? "·" : t.easy.noData;
  return (
    <ChartCard
      title={t.easy[cfg.title]}
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label={column} line />
          {target !== undefined && <Swatch className="bg-ink" label={t.easy.target(target)} line />}
          {kind === "pace" && <span>{t.easy.faster}</span>}
        </>
      }
      table={{
        columns: [t.cols.week, column, t.cols.runs],
        rows: [...rows].reverse().map((r) => {
          const v = easyValue(r, kind);
          return [weekRow(r, locale), v === undefined ? (r.easy.runs ? missing : undefined) : cfg.fmt(v), String(cfg.count(r))];
        }),
      }}
    >
      <LineChart
        ariaLabel={t.easy.aria(column, s.text)}
        labels={rows.map((r) => weekLabel(r.start, locale))}
        series={[{ values: rows.map((r) => easyValue(r, kind)), tone: "brand", dots: true }]}
        target={target}
        invert={kind === "pace"}
        yFormat={kind === "pace" ? formatPaceTag : (v) => String(v)}
      />
    </ChartCard>
  );
}

function Vdot({
  activities,
  today,
  weeks,
  raceResults,
  goal,
}: {
  activities: Activity[];
  today: string;
  weeks: number;
  raceResults: Parameters<typeof vdotWeeks>[1];
  goal: ReturnType<typeof goalVdot>;
}) {
  const rows = vdotWeeks(activities, raceResults, today, weeks);
  const s = vdotSummary(rows, goal);
  const locale = useLocale();
  const t = useT(INSIGHT).vdot;
  const cols = useT(INSIGHT).cols;
  return (
    <ChartCard
      title="VDOT"
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          {rows.some((r) => r.confidence === "tinggi") && <Swatch className="bg-brand" label={t.high} />}
          {rows.some((r) => r.confidence === "rendah") && <Swatch className="border border-brand bg-surface" label={t.low} />}
          {goal && <Swatch className="bg-ink" label={t.target(goal.label, num1(goal.vdot))} line />}
        </>
      }
      table={{
        columns: [cols.week, "VDOT", t.confidence, t.source],
        rows: [...rows].reverse().map((r) => [
          weekRow(r, locale),
          r.vdot === undefined ? undefined : num1(r.vdot),
          r.confidence ? t.level[r.confidence] : undefined,
          r.source === "race" ? t.race : r.source === "activity" ? t.bestRun : undefined,
        ]),
      }}
    >
      <LineChart
        ariaLabel={t.aria(s.text)}
        labels={rows.map((r) => weekLabel(r.start, locale))}
        series={[{ values: rows.map((r) => r.vdot), tone: "brand", dots: rows.map((r) => DOT[r.confidence ?? "rendah"]) }]}
        target={goal?.vdot}
      />
    </ChartCard>
  );
}
