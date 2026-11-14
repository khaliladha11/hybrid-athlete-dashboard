"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { ChartCard, Swatch } from "@/components/charts/ChartCard";
import { HeatGrid } from "@/components/charts/HeatGrid";
import { Segmented } from "@/components/ui/Segmented";
import { heatmapSummary, heatmapWeeks } from "@/lib/insight/activity-heatmap";
import { complianceSummary, type ComplianceCount, type ComplianceWeek } from "@/lib/insight/compliance-trend";
import { weekLabel } from "@/lib/insight/weeks";
import type { Activity } from "@/lib/intervals/types";
import type { StSession } from "@/lib/st-session";
import { useLocale, useT } from "@/lib/i18n/client";
import { INSIGHT } from "@/lib/i18n/messages/insight";
import type { Locale } from "@/lib/i18n/locale";

const weekRow = (r: { start: string; current: boolean }, l: Locale) => `${weekLabel(r.start, l)}${r.current ? INSIGHT[l].unfinishedWeek : ""}`;
const countText = (c: ComplianceCount, l: Locale) => (c.total ? `${c.terpenuhi}/${c.total}${c.sebagian ? INSIGHT[l].compliance.partialCount(c.sebagian) : ""}` : undefined);

/** #10 Kepatuhan mingguan: lari dan ST terpisah, tanpa merah dan tanpa streak. */
export function ComplianceTrend({ rows }: { rows: ComplianceWeek[] }) {
  const locale = useLocale();
  const s = complianceSummary(rows, locale);
  const t = useT(INSIGHT);
  const current = rows.findIndex((r) => r.current);
  const chart = (k: "run" | "st", title: string) => (
    <div>
      <h3 className="t-label mb-1">{title}</h3>
      <BarChart
        ariaLabel={t.compliance.aria(title, s.text)}
        labels={rows.map((r) => weekLabel(r.start, locale))}
        stacks={[
          { values: rows.map((r) => r[k].terpenuhi), tone: "brand" },
          { values: rows.map((r) => r[k].sebagian), tone: "brandSoft" },
          { values: rows.map((r) => r[k].belum), tone: "track" },
        ]}
        partial={current >= 0 ? current : undefined}
        integer
      />
    </div>
  );
  return (
    <ChartCard
      title={t.compliance.title}
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label={t.compliance.done} />
          <Swatch className="border border-brand bg-brand-soft" label={t.compliance.partial} />
          <Swatch className="bg-track" label={t.compliance.open} />
          <span>{t.compliance.skipped}</span>
        </>
      }
      table={{ columns: [t.cols.week, t.compliance.run, t.compliance.st], rows: [...rows].reverse().filter((r) => r.run.total + r.st.total > 0).map((r) => [weekRow(r, locale), countText(r.run, locale), countText(r.st, locale)]) }}
    >
      <div className="space-y-4">
        {chart("run", t.compliance.run)}
        {chart("st", t.compliance.st)}
      </div>
    </ChartCard>
  );
}

/** #11 Kalender heatmap 12/26 minggu. */
export function ActivityHeatmap({ activities, stSessions, logDates, today }: { activities: Activity[]; stSessions: StSession[]; logDates: string[]; today: string }) {
  const [weeks, setWeeks] = useState<12 | 26>(12);
  const locale = useLocale();
  const t = useT(INSIGHT);
  const h = t.heatmap;
  const rows = useMemo(() => heatmapWeeks(activities, stSessions, logDates, today, weeks), [activities, stSessions, logDates, today, weeks]);
  const s = heatmapSummary(rows, locale);
  const count = (r: (typeof rows)[number], c: string) => r.days.filter((d) => d.cls === c).length;
  return (
    <ChartCard
      title={h.title}
      summary={s.text}
      drawable={s.drawable}
      header={<Segmented label={t.range} value={weeks} options={[{ value: 12, label: t.weeksOption(12) }, { value: 26, label: t.weeksOption(26) }]} onChange={(v) => setWeeks(v)} />}
      legend={
        <>
          <Swatch className="bg-brand" label={h.run} />
          <Swatch className="border border-brand bg-brand-soft" label={h.st} />
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="relative h-2.5 w-2.5 rounded-[3px] bg-brand">
              <span className="absolute inset-[3px] rounded-full bg-surface" />
            </span>
            {h.both}
          </span>
          <Swatch className="bg-subtle" label={h.rest} />
        </>
      }
      table={{
        columns: [t.cols.week, h.run, h.st, h.both, h.rest],
        rows: [...rows].reverse().map((r) => [weekRow(r, locale), String(count(r, "run")), String(count(r, "st")), String(count(r, "both")), String(count(r, "rest"))]),
      }}
    >
      <HeatGrid weeks={rows} ariaLabel={h.aria(weeks, s.text)} />
    </ChartCard>
  );
}
