"use client";

import { ChartCard, Swatch } from "@/components/charts/ChartCard";
import { LineChart } from "@/components/charts/LineChart";
import { Card } from "@/components/ui/Card";
import type { Checkin } from "@/lib/checkin";
import { checkinDays, checkinSummary } from "@/lib/insight/checkin-trend";
import { monthlyLines, type MonthlySummary } from "@/lib/insight/monthly";

const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLabel = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`)).replace(".", "");

/** Tren check-in: nyeri shin (0–10) dan kualitas tidur (1–5) per hari. */
export function CheckinTrend({ checkins, today, weeks }: { checkins: Checkin[]; today: string; weeks: number }) {
  const days = checkinDays(checkins, today, weeks);
  const s = checkinSummary(days, weeks);
  return (
    <ChartCard
      title="Check-in"
      summary={s.text}
      drawable={s.drawable}
      legend={
        <>
          <Swatch className="bg-brand" label="Nyeri shin (0–10)" line />
          <Swatch className="bg-muted" label="Tidur (1–5)" line />
          <span>Garis putus di hari tanpa check-in</span>
        </>
      }
      table={{
        columns: ["Tanggal", "Shin", "Pegal", "Tidur", "Mood"],
        rows: [...days]
          .reverse()
          .filter((d) => d.shin !== undefined || d.sleep !== undefined || d.soreness !== undefined || d.mood !== undefined)
          .map((d) => [dayLabel(d.date), d.shin?.toString(), d.soreness?.toString(), d.sleep?.toString(), d.mood?.toString()]),
      }}
    >
      <LineChart
        ariaLabel={`Grafik nyeri shin dan kualitas tidur harian ${weeks} minggu. ${s.text}`}
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
  return (
    <Card title="Ambang saran">
      <ul className="space-y-2 text-[13px] text-ink">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">Ambang pribadi aktif setelah 30 hari data; sebelum itu dipakai ambang umum. Sumber di TRAINING-LOGIC §5.</p>
    </Card>
  );
}

/** Ringkasan bulan yang baru selesai. */
export function MonthlyCard({ summary, action }: { summary: MonthlySummary; action?: React.ReactNode }) {
  return (
    <Card title={`Ringkasan ${summary.label}`} action={action}>
      <ul className="space-y-1.5 text-[14px]">
        {monthlyLines(summary).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Card>
  );
}
