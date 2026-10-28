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

const weekRow = (r: { start: string; current: boolean }) => `${weekLabel(r.start)}${r.current ? " (belum selesai)" : ""}`;
const countText = (c: ComplianceCount) => (c.total ? `${c.terpenuhi}/${c.total}${c.sebagian ? ` · ${c.sebagian} sebagian` : ""}` : undefined);

/** #10 Kepatuhan mingguan: lari dan ST terpisah, tanpa merah dan tanpa streak. */
export function ComplianceTrend({ rows }: { rows: ComplianceWeek[] }) {
  const s = complianceSummary(rows);
  const current = rows.findIndex((r) => r.current);
  const chart = (k: "run" | "st", title: string) => (
    <div>
      <h3 className="t-label mb-1">{title}</h3>
      <BarChart
        ariaLabel={`Grafik sesi ${title.toLowerCase()} per minggu program: terpenuhi, sebagian, belum. ${s.text}`}
        labels={rows.map((r) => weekLabel(r.start))}
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
      title="Kepatuhan program"
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label="Terpenuhi" />
          <Swatch className="border border-brand bg-brand-soft" label="Sebagian" />
          <Swatch className="bg-track" label="Belum" />
          <span>Dilewati tidak dihitung</span>
        </>
      }
      table={{ columns: ["Minggu", "Lari", "ST"], rows: [...rows].reverse().filter((r) => r.run.total + r.st.total > 0).map((r) => [weekRow(r), countText(r.run), countText(r.st)]) }}
    >
      <div className="space-y-4">
        {chart("run", "Lari")}
        {chart("st", "ST")}
      </div>
    </ChartCard>
  );
}

/** #11 Kalender heatmap 12/26 minggu. */
export function ActivityHeatmap({ activities, stSessions, logDates, today }: { activities: Activity[]; stSessions: StSession[]; logDates: string[]; today: string }) {
  const [weeks, setWeeks] = useState<12 | 26>(12);
  const rows = useMemo(() => heatmapWeeks(activities, stSessions, logDates, today, weeks), [activities, stSessions, logDates, today, weeks]);
  const s = heatmapSummary(rows);
  const count = (r: (typeof rows)[number], c: string) => r.days.filter((d) => d.cls === c).length;
  return (
    <ChartCard
      title="Kalender aktivitas"
      summary={s.text}
      drawable={s.drawable}
      header={<Segmented label="Rentang" value={weeks} options={[{ value: 12, label: "12 minggu" }, { value: 26, label: "26 minggu" }]} onChange={(v) => setWeeks(v)} />}
      legend={
        <>
          <Swatch className="bg-brand" label="Lari" />
          <Swatch className="border border-brand bg-brand-soft" label="ST" />
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="relative h-2.5 w-2.5 rounded-[3px] bg-brand">
              <span className="absolute inset-[3px] rounded-full bg-surface" />
            </span>
            Lari + ST
          </span>
          <Swatch className="bg-subtle" label="Istirahat" />
        </>
      }
      table={{
        columns: ["Minggu", "Lari", "ST", "Lari + ST", "Istirahat"],
        rows: [...rows].reverse().map((r) => [weekRow(r), String(count(r, "run")), String(count(r, "st")), String(count(r, "both")), String(count(r, "rest"))]),
      }}
    >
      <HeatGrid weeks={rows} ariaLabel={`Kalender aktivitas ${weeks} minggu, kolom per minggu, baris Senin sampai Minggu. ${s.text}`} />
    </ChartCard>
  );
}
