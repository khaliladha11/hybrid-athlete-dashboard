import { Card, StatRow } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId } from "@/lib/date";
import type { FetchResult, Wellness } from "@/lib/intervals/types";

function fmt(v: number | undefined, digits = 0) {
  return v === undefined ? undefined : v.toFixed(digits);
}

function sleep(sec: number | undefined) {
  if (!sec) return undefined;
  return `${Math.floor(sec / 3600)}j ${String(Math.round((sec % 3600) / 60)).padStart(2, "0")}m`;
}

export function WellnessCard({ result, today }: { result: FetchResult<Wellness[]>; today: string }) {
  if (!result.ok) {
    return (
      <Card title="Wellness">
        <ErrorState error={result.error} compact />
      </Card>
    );
  }
  // Entri terbaru yang punya minimal satu metrik.
  const latest = [...result.data].reverse().find((w) => w.hrv ?? w.restingHr ?? w.ctl ?? w.atl ?? w.sleepSecs);
  if (!latest) {
    return (
      <Card title="Wellness">
        <p className="text-body text-muted">
          Belum ada data wellness 7 hari terakhir. Pastikan HRV/resting HR tersinkron ke intervals.icu.
        </p>
      </Card>
    );
  }
  const form = latest.ctl !== undefined && latest.atl !== undefined ? latest.ctl - latest.atl : undefined;
  const missing = (["hrv", "restingHr", "sleepSecs", "ctl", "atl"] as const).filter((k) => latest[k] === undefined).length;
  const isToday = latest.date === today;

  return (
    <Card
      title="Wellness"
      action={
        <span className={`text-[13px] font-semibold ${isToday ? "text-success-ink" : "text-danger-ink"}`}>
          {isToday ? "✓ Data hari ini" : `✕ Terakhir ${formatDateId(latest.date)}`}
        </span>
      }
    >
      <StatRow
        items={[
          { label: "HRV", value: fmt(latest.hrv), unit: "ms" },
          { label: "RHR", value: fmt(latest.restingHr), unit: "bpm" },
          { label: "Tidur", value: sleep(latest.sleepSecs), unit: "durasi" },
          { label: "CTL", value: fmt(latest.ctl, 1), unit: "fitness" },
          { label: "ATL", value: fmt(latest.atl, 1), unit: "fatigue" },
          { label: "Form", value: form === undefined ? undefined : `${form > 0 ? "+" : ""}${form.toFixed(1)}`, unit: "CTL − ATL" },
        ]}
      />
      {missing > 0 && (
        <p className="mt-4 rounded-inner bg-subtle px-3 py-2 text-[13px] text-muted">
          {missing} metrik kosong (·). Biasanya karena jam belum sinkron atau tidak dipakai saat tidur.
        </p>
      )}
    </Card>
  );
}
