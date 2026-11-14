"use client";

import { ChartCard, Swatch } from "@/components/charts/ChartCard";
import { LineChart } from "@/components/charts/LineChart";
import { Card } from "@/components/ui/Card";
import type { Checkin } from "@/lib/checkin";
import { checkinDays, checkinSummary } from "@/lib/insight/checkin-trend";
import { monthlyLines, type MonthlySummary } from "@/lib/insight/monthly";
import { useLocale, useT } from "@/lib/i18n/client";
import { INSIGHT } from "@/lib/i18n/messages/insight";
import { DAY_MONTH, formatDay } from "@/lib/i18n/format";

/** Tren check-in: nyeri shin (0–10) dan kualitas tidur (1–5) per hari. */
export function CheckinTrend({ checkins, today, weeks }: { checkins: Checkin[]; today: string; weeks: number }) {
  const days = checkinDays(checkins, today, weeks);
  const locale = useLocale();
  const s = checkinSummary(days, weeks, locale);
  const t = useT(INSIGHT).checkin;
  const dayLabel = (d: string) => formatDay(locale, d, DAY_MONTH).replace(".", "");
  return (
    <ChartCard
      title={t.title}
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label={t.shin} line />
          <Swatch className="bg-muted" label={t.sleep} line />
          <span>{t.gaps}</span>
        </>
      }
      table={{
        columns: [...t.cols],
        rows: [...days]
          .reverse()
          .filter((d) => d.shin !== undefined || d.sleep !== undefined || d.soreness !== undefined || d.mood !== undefined)
          .map((d) => [dayLabel(d.date), d.shin?.toString(), d.soreness?.toString(), d.sleep?.toString(), d.mood?.toString()]),
      }}
    >
      <LineChart
        ariaLabel={t.aria(weeks, s.text)}
        labels={days.map((d) => dayLabel(d.date))}
        series={[
          { values: days.map((d) => d.shin), tone: "brand", dots: true },
          { values: days.map((d) => d.sleep), tone: "muted", dots: true },
        ]}
      />
    </ChartCard>
  );
}

/** Status ambang pribadi vs umum. */
export function ThresholdCard({ lines }: { lines: string[] }) {
  const t = useT(INSIGHT).threshold;
  return (
    <Card title={t.title}>
      <ul className="space-y-2 text-[13px] text-ink">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">{t.note}</p>
    </Card>
  );
}

/** Ringkasan bulan yang baru selesai. */
export function MonthlyCard({ summary, action }: { summary: MonthlySummary; action?: React.ReactNode }) {
  const t = useT(INSIGHT);
  const locale = useLocale();
  return (
    <Card title={t.monthly(summary.label)} action={action}>
      <ul className="space-y-1.5 text-[14px]">
        {monthlyLines(summary, locale).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Card>
  );
}
