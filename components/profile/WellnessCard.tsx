import { ReadinessBasis } from "./ReadinessBasis";
import { Card, StatRow } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId } from "@/lib/date";
import type { FetchResult, Wellness } from "@/lib/intervals/types";
import { availableSignals, joinId, SIGNAL_LABEL, WELLNESS_SIGNALS, type WellnessSignal } from "@/lib/wellness-signals";

function fmt(v: number | undefined, digits = 0) {
  return v === undefined ? undefined : v.toFixed(digits);
}

function sleep(sec: number | undefined) {
  if (!sec) return undefined;
  return `${Math.floor(sec / 3600)}j ${String(Math.round((sec % 3600) / 60)).padStart(2, "0")}m`;
}

/** `basis`: kalimat sinyal yang dipakai readiness (0.14.3). Sinyal yang tidak dikirim jam dalam 14 hari tidak ditampilkan. */
export function WellnessCard({ result, today, basis, used, thresholds }: { result: FetchResult<Wellness[]>; today: string; basis?: string; used?: string[]; thresholds?: string[] }) {
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
          Belum ada data wellness 14 hari terakhir. Pastikan resting HR atau HRV tersinkron ke intervals.icu.
        </p>
      </Card>
    );
  }
  const form = latest.ctl !== undefined && latest.atl !== undefined ? latest.ctl - latest.atl : undefined;
  const signals = availableSignals(result.data, today);
  const absent = WELLNESS_SIGNALS.filter((s) => !signals.has(s));
  const value: Record<WellnessSignal, unknown[]> = { hrv: [latest.hrv], restingHr: [latest.restingHr], sleep: [latest.sleepSecs], load: [latest.ctl, latest.atl] };
  // Kosong hanya dihitung untuk sinyal yang memang dikirim jam.
  const missing = [...signals].filter((s) => value[s].some((v) => v === undefined)).length;
  const items = [
    ...(signals.has("hrv") ? [{ label: "HRV", value: fmt(latest.hrv), unit: "ms" }] : []),
    ...(signals.has("restingHr") ? [{ label: "RHR", value: fmt(latest.restingHr), unit: "bpm" }] : []),
    ...(signals.has("sleep") ? [{ label: "Tidur", value: sleep(latest.sleepSecs), unit: "durasi" }] : []),
    ...(signals.has("load")
      ? [
          { label: "CTL", value: fmt(latest.ctl, 1), unit: "fitness" },
          { label: "ATL", value: fmt(latest.atl, 1), unit: "fatigue" },
          { label: "Form", value: form === undefined ? undefined : `${form > 0 ? "+" : ""}${form.toFixed(1)}`, unit: "CTL − ATL" },
        ]
      : []),
  ];
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
      <StatRow items={items} />
      {missing > 0 && (
        <p className="mt-4 rounded-inner bg-subtle px-3 py-2 text-[13px] text-muted">
          {missing} metrik kosong (·). Biasanya karena jam belum sinkron atau tidak dipakai saat tidur.
        </p>
      )}
      {(basis || used || absent.length > 0) && (
        <p className="mt-3 text-[13px] text-muted">
          {used ? <ReadinessBasis used={used} today={today} /> : basis}
          {absent.length > 0 && ` Jammu tidak mengirim ${joinId(absent.map((s) => SIGNAL_LABEL[s]))} dalam 14 hari terakhir, jadi tidak ditampilkan.`}
        </p>
      )}
      {thresholds && (
        <ul className="mt-2 space-y-1 text-[13px] text-muted">
          {thresholds.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
