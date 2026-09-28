import { Card, Chip, Stat } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId } from "@/lib/date";
import { CATEGORY_LABEL, formatPace, summarizeLast7Days } from "@/lib/intervals/summary";
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
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Minggu ini (Sen–Min): <span className="tabular font-medium text-zinc-700 dark:text-zinc-300">{s.calendarWeek.runKm.toFixed(1)} km</span> lari
      </p>
    </Card>
  );
}
