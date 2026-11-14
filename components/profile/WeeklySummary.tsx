import { Card, Chip, StatRow } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatPaceTag } from "@/components/ui/format";
import { CATEGORY_LABEL, summarizeLast7Days } from "@/lib/intervals/summary";
import { KM_INCREASE_LIMIT, MAX_HARD_RUNS_7D, weekStats } from "@/lib/coach";
import type { Activity, ActivityCategory, FetchResult } from "@/lib/intervals/types";
import { StLoad7, WeekLedger } from "./WeekLedger";
import { DAY_MONTH, formatDay, WEEKDAY_SHORT } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { INSIGHT } from "@/lib/i18n/messages/insight";
import { getLocale } from "@/lib/i18n/server";

export async function WeeklySummary({ result, today }: { result: FetchResult<Activity[]>; today: string }) {
  const locale = await getLocale();
  const t = INSIGHT[locale].summary7;
  if (!result.ok) {
    return (
      <Card title={t.title}>
        <ErrorState error={result.error} compact />
      </Card>
    );
  }
  const s = summarizeLast7Days(result.data, today);
  const sessions = Object.entries(s.sessions) as [ActivityCategory, number][];

  return (
    <Card title={t.title} action={<span className="t-label">{t.range(formatDay(locale, s.from, DAY_MONTH), formatDay(locale, s.to, DAY_MONTH))}</span>}>
      <StatRow
        items={[
          { label: t.run, value: s.runKm.toFixed(1), unit: "km" },
          { label: "Pace", value: formatPaceTag(s.avgPaceSecPerKm), unit: "/km", muted: !s.avgPaceSecPerKm },
          { label: "Avg HR", value: s.avgRunHr ? Math.round(s.avgRunHr) : undefined, unit: "bpm" },
          {
            label: "Long run",
            value: s.longestRun ? s.longestRun.km.toFixed(1) : undefined,
            unit: s.longestRun?.date ? `km · ${formatDay(locale, s.longestRun.date, WEEKDAY_SHORT)}` : "km",
          },
          { label: "Load", value: s.totalLoad ? Math.round(s.totalLoad) : undefined, unit: "total" },
          { label: t.sessions, value: s.totalSessions, unit: t.activities },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {sessions.length === 0 ? (
          <span className="text-[13px] text-muted">{t.none}</span>
        ) : (
          sessions.map(([cat, n]) => (
            <Chip key={cat} tone={cat === "run" ? "accent" : "neutral"}>
              {CATEGORY_LABEL[cat]} ×{n}
            </Chip>
          ))
        )}
      </div>
      <IntensityAndTrend activities={result.data} today={today} locale={locale} />
      <StLoad7 activities={result.data} today={today} />
      <WeekLedger activities={result.data} from={s.calendarWeek.from} to={s.calendarWeek.to} totalKm={s.calendarWeek.runKm} />
    </Card>
  );
}

/** Distribusi easy/berat (acuan 80/20) dan perubahan km vs 7 hari sebelumnya. */
function IntensityAndTrend({ activities, today, locale }: { activities: Activity[]; today: string; locale: Locale }) {
  const t = INSIGHT[locale].summary7;
  const w = weekStats(activities, today);
  if (!w.runs7) return null;
  const easy = w.runs7 - w.hardRuns7;
  const easyPct = Math.round((easy / w.runs7) * 100);
  const tooHard = w.hardRuns7 >= MAX_HARD_RUNS_7D;
  const tooFast = w.kmChange !== undefined && w.kmChange > KM_INCREASE_LIMIT;
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="t-label">{t.intensity}</span>
          <span className="tabular text-[13px] font-semibold">
            <span className="text-success-ink">{t.easy(easy)}</span> · <span className="text-danger-ink">{t.hard(w.hardRuns7)}</span>
          </span>
        </div>
        <div className="relative mt-2 flex h-2 overflow-hidden rounded-full bg-danger" aria-hidden>
          <div className="bg-success" style={{ width: `${easyPct}%` }} />
          <div className="absolute inset-y-0 left-[80%] w-px bg-ink/50" />
        </div>
        <p className={`mt-1.5 text-[12px] font-semibold ${tooHard ? "text-danger-ink" : "text-success-ink"}`}>
          {tooHard ? t.tooHard : t.safe}
        </p>
      </div>
      {w.kmChange !== undefined && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] text-muted">{t.vsPrev(w.runKmPrev7.toFixed(1))}</span>
          <span className={`tabular text-[13px] font-semibold ${tooFast ? "text-danger-ink" : "text-success-ink"}`}>
            {tooFast ? "✕ " : "✓ "}
            {w.kmChange >= 0 ? "+" : ""}
            {Math.round(w.kmChange * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
