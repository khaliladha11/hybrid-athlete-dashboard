import { ReadinessBasis } from "./ReadinessBasis";
import { InfoCarousel } from "@/components/ui/InfoCarousel";
import { Card, StatRow } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId } from "@/lib/date";
import { getLocale } from "@/lib/i18n/server";
import { PROFILE } from "@/lib/i18n/messages/profile";
import type { FetchResult, Wellness } from "@/lib/intervals/types";
import { availableSignals, joinId, signalLabel, WELLNESS_SIGNALS, type WellnessSignal } from "@/lib/wellness-signals";

function fmt(v: number | undefined, digits = 0) {
  return v === undefined ? undefined : v.toFixed(digits);
}

function sleep(sec: number | undefined, fmt: (h: number, m: string) => string) {
  if (!sec) return undefined;
  return fmt(Math.floor(sec / 3600), String(Math.round((sec % 3600) / 60)).padStart(2, "0"));
}

/** `basis`: kalimat sinyal yang dipakai readiness (0.14.3). Sinyal yang tidak dikirim jam dalam 14 hari tidak ditampilkan. */
export async function WellnessCard({ result, today, basis, used, thresholds }: { result: FetchResult<Wellness[]>; today: string; basis?: string; used?: string[]; thresholds?: string[] }) {
  const locale = await getLocale();
  const t = PROFILE[locale].wellness;
  if (!result.ok) {
    return (
      <Card title={t.title}>
        <ErrorState error={result.error} compact />
      </Card>
    );
  }
  // Entri terbaru yang punya minimal satu metrik.
  const latest = [...result.data].reverse().find((w) => w.hrv ?? w.restingHr ?? w.ctl ?? w.atl ?? w.sleepSecs);
  if (!latest) {
    return (
      <Card title={t.title}>
        <p className="text-body text-muted">{t.empty}</p>
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
    ...(signals.has("sleep") ? [{ label: t.sleep, value: sleep(latest.sleepSecs, t.sleepValue), unit: t.duration }] : []),
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
      title={t.title}
      action={
        <span className={`text-[13px] font-semibold ${isToday ? "text-success-ink" : "text-danger-ink"}`}>
          {isToday ? t.today : t.last(formatDateId(latest.date, locale))}
        </span>
      }
    >
      <StatRow items={items} />
      <InfoCarousel
        label={t.info}
        items={[
          ...(missing > 0 ? [{ key: "missing", content: t.missing(missing) }] : []),
          ...(basis || used || absent.length > 0
            ? [
                {
                  key: "basis",
                  content: (
                    <>
                      {used ? <ReadinessBasis used={used} today={today} /> : basis}
                      {absent.length > 0 && t.absent(joinId(absent.map((s) => signalLabel(s, locale)), locale))}
                    </>
                  ),
                },
              ]
            : []),
          ...(thresholds ?? []).map((t) => ({ key: `t-${t}`, content: t })),
        ]}
      />
    </Card>
  );
}
