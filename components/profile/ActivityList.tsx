import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId, formatTimeOfDay } from "@/lib/date";
import { CATEGORY_LABEL, formatDuration, formatPace } from "@/lib/intervals/summary";
import type { Activity, ActivityCategory, FetchResult } from "@/lib/intervals/types";

export const CATEGORY_DOT: Record<ActivityCategory, string> = {
  run: "bg-accent-500",
  walk: "bg-sky-500",
  strength: "bg-violet-500",
  ride: "bg-orange-500",
  other: "bg-zinc-400",
};

export function ActivityList({ result }: { result: FetchResult<Activity[]> }) {
  if (!result.ok) {
    return (
      <Card title="Aktivitas terakhir">
        <ErrorState error={result.error} compact />
      </Card>
    );
  }
  const list = result.data.slice(0, 10);
  return (
    <Card title="10 aktivitas terakhir" className="!px-0 !pb-1">
      {list.length === 0 ? (
        <p className="px-4 pb-3 text-sm text-zinc-500">Belum ada aktivitas dalam 30 hari terakhir.</p>
      ) : (
        <ul className="-mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">
          {list.map((a) => {
            const meta = [
              a.distanceKm ? `${a.distanceKm.toFixed(2)} km` : null,
              formatDuration(a.movingTimeSec),
              a.category === "run" && a.avgPaceSecPerKm ? formatPace(a.avgPaceSecPerKm) : null,
            ].filter(Boolean);
            const extra = [
              a.avgHr ? `♥ ${Math.round(a.avgHr)}` : null,
              a.cadenceSpm && a.category === "run" ? `${a.cadenceSpm} spm` : null,
              a.trainingLoad ? `load ${Math.round(a.trainingLoad)}` : null,
            ].filter(Boolean);
            return (
              <li key={a.id}>
                <Link
                  href={`/activity/${encodeURIComponent(a.id)}`}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[a.category]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {formatDateId(a.date)} {formatTimeOfDay(a.startLocal)}
                      </span>
                    </div>
                    <p className="tabular truncate text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="text-zinc-400 dark:text-zinc-500">{CATEGORY_LABEL[a.category]} · </span>
                      {meta.join(" · ")}
                    </p>
                    {extra.length > 0 && <p className="tabular truncate text-xs text-zinc-400 dark:text-zinc-500">{extra.join(" · ")}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
