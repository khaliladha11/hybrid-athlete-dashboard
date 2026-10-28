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
import { MuscleHeatmap, PrTrend, StrengthVolume, availableMovements } from "./StrengthTrends";

const PATTERNS = patternMap(baseProfile.movementLibrary);

const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLabel = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`)).replace(".", "");
const weekRow = (r: { start: string; current: boolean }) => `${weekLabel(r.start)}${r.current ? " (minggu ini)" : ""}`;
const DOT: Record<Confidence, DotStyle> = { tinggi: "filled", sedang: "ring", rendah: "thin" };

/**
 * Insight (docs/INSIGHT.md §4). Lari (0.15.0): CTL/ATL/Form, km mingguan 80/20, easy run pace/HR/cadence, VDOT.
 * Kekuatan (0.15.1): volume ST per pola & session-RPE, heatmap otot, tren PR. Program & kalender (0.15.1): kepatuhan
 * mingguan, kalender heatmap. Data intervals.icu dari server (sekali per buka halaman), data perangkat (sesi ST, log ★,
 * PR, hasil lomba, program, blok) di sini. Demo Mode menambah data ST fiktif tanpa menulis ke perangkat. Pilihan
 * 6/12 minggu hanya memotong data yang sudah ada. Grafik tidak mengubah saran (I3).
 */
export function InsightView({ activities, wellness, today }: { activities: FetchResult<Activity[]>; wellness: FetchResult<Wellness[]>; today: string }) {
  const [weeks, setWeeks] = useState<RangeWeeks>(6);
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
  const compliance = useMemo(
    // Hanya program yang benar-benar disimpan (bukan pratinjau default) dan arsipnya.
    () => complianceWeeks(plan.saved ? [...plan.sessions, ...plan.archived.flatMap((a) => a.sessions)] : [], plan.results, today, weeks),
    [plan.saved, plan.sessions, plan.archived, plan.results, today, weeks],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-display text-brand-ink">Tren</h1>
        <p className="mt-1 text-body text-muted">Mingguan, Senin sampai Minggu. Grafik hanya menampilkan data, saran harian tetap dari coach.</p>
      </div>
      <Segmented
        label="Rentang"
        value={weeks}
        options={RANGE_OPTIONS.map((w) => ({ value: w, label: `${w} minggu` }))}
        onChange={(v) => setWeeks(v)}
      />

      <h2 className="t-label pt-2 text-ink">Lari</h2>
      {wellness.ok ? <Fitness wellness={wellness.data} today={today} weeks={weeks} /> : <SourceError title="Kebugaran CTL/ATL" result={wellness} />}
      {activities.ok ? (
        <>
          <Volume rows={rows} />
          <Easy rows={rows} kind="pace" />
          <Easy rows={rows} kind="hr" />
          <Easy rows={rows} kind="cadence" target={cadenceGoal(acts, today)} />
          <Vdot activities={acts} today={today} weeks={weeks} raceResults={athlete.raceResults} goal={goal} />
        </>
      ) : (
        <SourceError title="Tren lari" result={activities} />
      )}

      <h2 className="t-label pt-2 text-ink">Kekuatan</h2>
      <StrengthVolume rows={stRows} />
      <MuscleHeatmap work={work} today={today} available={available} />
      <PrTrend prs={prs} log={log} capOf={capOf} />

      <h2 className="t-label pt-2 text-ink">Program & kalender</h2>
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
  const fmt = (v: number | undefined) => (v === undefined ? undefined : num1(v));
  return (
    <ChartCard
      title="Kebugaran CTL/ATL"
      summary={s.summary}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label="CTL" line />
          <Swatch className="bg-muted" label="ATL" line />
          <Swatch className="bg-track" label="Form" />
          <Swatch className="bg-subtle border border-line" label={`Pita Form ${String(FORM_BAND[0]).replace("-", "−")} sampai +${FORM_BAND[1]}`} />
        </>
      }
      table={{
        columns: ["Tanggal", "CTL", "ATL", "Form"],
        rows: [...s.days].reverse().map((d) => [dayLabel(d.date), fmt(d.ctl), fmt(d.atl), fmt(d.form)]),
      }}
    >
      <LineChart
        ariaLabel={`Grafik CTL, ATL, dan Form harian ${weeks} minggu. ${s.summary}`}
        labels={s.days.map((d) => dayLabel(d.date))}
        series={[
          { values: s.days.map((d) => d.ctl), tone: "brand" },
          { values: s.days.map((d) => d.atl), tone: "muted" },
        ]}
        area={s.days.map((d) => d.form)}
        band={FORM_BAND}
        yFormat={(v) => String(v)}
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
  const current = rows.findIndex((r) => r.current);
  return (
    <ChartCard
      title="Km mingguan 80/20"
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-success" label="Easy" />
          <Swatch className="bg-danger" label="Berat" />
          {rows.some((r) => r.jump) && <span>+% naik lebih dari 30%</span>}
          {rows.some((r) => r.cutback) && <span>CB cutback</span>}
          {rows.some((r) => r.deload) && <span>DL deload</span>}
        </>
      }
      table={{
        columns: ["Minggu", "Km", "Easy", "Berat", "Perubahan"],
        rows: [...rows].reverse().map((r) => [
          `${weekRow(r)}${r.runs ? "" : " · tanpa lari"}${r.cutback ? " · cutback" : ""}${r.deload ? " · deload" : ""}`,
          num1(r.km),
          num1(r.easyKm),
          num1(r.hardKm),
          r.change === undefined ? undefined : `${r.change > 0 ? "+" : ""}${Math.round(r.change * 100)}%${r.jump ? " ▲" : ""}`.replace("-", "−"),
        ]),
      }}
    >
      <BarChart
        ariaLabel={`Grafik batang km lari per minggu, easy dan berat, ${rows.length} minggu. ${s.text}`}
        labels={rows.map((r) => weekLabel(r.start))}
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

const EASY: Record<EasyKey, { title: string; column: string; fmt: (v: number) => string; count: (r: RunWeek) => number }> = {
  pace: { title: "Easy run: pace", column: "Median pace", fmt: (v) => `${formatPaceTag(v)}/km`, count: (r) => r.easy.runs },
  hr: { title: "Easy run: HR", column: "Median HR", fmt: (v) => `${v} bpm`, count: (r) => r.easy.hrRuns },
  cadence: { title: "Easy run: cadence", column: "Median cadence", fmt: (v) => `${v} SPM`, count: (r) => r.easy.cadenceRuns },
};

function Easy({ rows, kind, target }: { rows: RunWeek[]; kind: EasyKey; target?: number }) {
  const s = easySummary(rows, kind, target);
  const cfg = EASY[kind];
  const missing = kind === "pace" ? "·" : "tidak ada data";
  return (
    <ChartCard
      title={cfg.title}
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label={cfg.column} line />
          {target !== undefined && <Swatch className="bg-ink" label={`Target ${target} SPM`} line />}
          {kind === "pace" && <span>Lebih tinggi = lebih cepat</span>}
        </>
      }
      table={{
        columns: ["Minggu", cfg.column, "Lari"],
        rows: [...rows].reverse().map((r) => {
          const v = easyValue(r, kind);
          return [weekRow(r), v === undefined ? (r.easy.runs ? missing : undefined) : cfg.fmt(v), String(cfg.count(r))];
        }),
      }}
    >
      <LineChart
        ariaLabel={`Grafik ${cfg.column.toLowerCase()} easy run per minggu. ${s.text}`}
        labels={rows.map((r) => weekLabel(r.start))}
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
  return (
    <ChartCard
      title="VDOT"
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          {rows.some((r) => r.confidence === "tinggi") && <Swatch className="bg-brand" label="Keyakinan tinggi (lomba)" />}
          {rows.some((r) => r.confidence === "rendah") && <Swatch className="border border-brand bg-surface" label="Keyakinan rendah (lari latihan)" />}
          {goal && <Swatch className="bg-ink" label={`Target ${goal.label} ${num1(goal.vdot)}`} line />}
        </>
      }
      table={{
        columns: ["Minggu", "VDOT", "Keyakinan", "Sumber"],
        rows: [...rows].reverse().map((r) => [
          weekRow(r),
          r.vdot === undefined ? undefined : num1(r.vdot),
          r.confidence,
          r.source === "race" ? "lomba" : r.source === "activity" ? "lari terbaik" : undefined,
        ]),
      }}
    >
      <LineChart
        ariaLabel={`Grafik VDOT per minggu. ${s.text}`}
        labels={rows.map((r) => weekLabel(r.start))}
        series={[{ values: rows.map((r) => r.vdot), tone: "brand", dots: rows.map((r) => DOT[r.confidence ?? "rendah"]) }]}
        target={goal?.vdot}
        yFormat={(v) => String(v)}
      />
    </ChartCard>
  );
}
