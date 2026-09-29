import { Card, Chip, Stat } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId } from "@/lib/date";
import { CATEGORY_LABEL, formatPace, summarizeLast7Days } from "@/lib/intervals/summary";
import { KM_INCREASE_LIMIT, MAX_HARD_RUNS_7D, weekStats } from "@/lib/coach";
import type { Activity, ActivityCategory, FetchResult } from "@/lib/intervals/types";

export function WeeklySummary({ result, today }: { result: FetchResult<Activity[]>; today: string }) {
  if (!result.ok) {
    return (
      <Card title="7 hari terakhir">
        <ErrorState error={result.error} compact />
      </Card>
    );
  }
  const s = summarizeLast7Days(result.data, today);
  const sessions = Object.entries(s.sessions) as [ActivityCategory, number][];

  return (
    <Card
      title="7 hari terakhir"
      action={
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatDateId(s.from)} – {formatDateId(s.to)}
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <Stat label="Total lari" value={s.runKm.toFixed(1)} sub="km" />
        <Stat label="Avg pace" value={formatPace(s.avgPaceSecPerKm).replace("/km", "")} sub="/km" muted={!s.avgPaceSecPerKm} />
        <Stat label="Avg HR lari" value={s.avgRunHr ? Math.round(s.avgRunHr) : "—"} sub="bpm" muted={!s.avgRunHr} />
        <Stat
          label="Long run"
          value={s.longestRun ? s.longestRun.km.toFixed(1) : "—"}
          sub={s.longestRun ? `km · ${formatDateId(s.longestRun.date)}` : "km"}
          muted={!s.longestRun}
        />
        <Stat label="Load" value={Math.round(s.totalLoad)} sub="total" />
        <Stat label="Sesi" value={s.totalSessions} sub="aktivitas" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {sessions.length === 0 ? (
          <span className="text-xs text-zinc-500">Belum ada aktivitas.</span>
        ) : (
          sessions.map(([cat, n]) => (
            <Chip key={cat} tone={cat === "run" ? "accent" : "neutral"}>
              {CATEGORY_LABEL[cat]} ×{n}
            </Chip>
          ))
        )}
      </div>
      <IntensityAndTrend activities={result.data} today={today} />
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Minggu ini (Sen–Min): <span className="tabular font-medium text-zinc-700 dark:text-zinc-300">{s.calendarWeek.runKm.toFixed(1)} km</span> lari
      </p>
    </Card>
  );
}

/** Distribusi easy/berat (acuan 80/20) dan perubahan km vs 7 hari sebelumnya. */
function IntensityAndTrend({ activities, today }: { activities: Activity[]; today: string }) {
  const w = weekStats(activities, today);
  if (!w.runs7) return null;
  const easy = w.runs7 - w.hardRuns7;
  const easyPct = Math.round((easy / w.runs7) * 100);
  const tooHard = w.hardRuns7 >= MAX_HARD_RUNS_7D;
  const tooFast = w.kmChange !== undefined && w.kmChange > KM_INCREASE_LIMIT;
  return (
    <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <div>
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Intensitas lari (acuan 80/20)</span>
          <span className={`tabular font-medium ${tooHard ? "text-amber-600 dark:text-amber-400" : ""}`}>
            {easy} easy · {w.hardRuns7} berat
          </span>
        </div>
        <div className="relative mt-1 flex h-1.5 overflow-hidden rounded-full bg-rose-400/80" aria-hidden>
          <div className="bg-accent-500" style={{ width: `${easyPct}%` }} />
          <div className="absolute inset-y-0 left-[80%] w-px bg-zinc-900/50 dark:bg-white/60" />
        </div>
      </div>
      {w.kmChange !== undefined && (
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Jarak vs 7 hari sebelumnya ({w.runKmPrev7.toFixed(1)} km)</span>
          <span className={`tabular font-semibold ${tooFast ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"}`}>
            {w.kmChange >= 0 ? "+" : ""}
            {Math.round(w.kmChange * 100)}%{tooFast ? " ⚠︎" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
