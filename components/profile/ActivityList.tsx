import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId, formatTimeOfDay } from "@/lib/date";
import { CATEGORY_LABEL, formatDuration, formatPace } from "@/lib/intervals/summary";
import type { Activity, ActivityCategory, FetchResult } from "@/lib/intervals/types";

export const CATEGORY_DOT: Record<ActivityCategory, string> = {
  run: "bg-brand",
  walk: "bg-faint",
  strength: "bg-info",
  ride: "bg-brand/50",
  other: "bg-faint",
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
    <Card title="10 aktivitas terakhir" flush className="!pb-1">
      {list.length === 0 ? (
        <p className="px-4 pb-3 text-body text-muted">Belum ada aktivitas dalam 30 hari terakhir.</p>
      ) : (
        <ul className="-mt-1 divide-y divide-line">
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
                  className="flex items-start gap-3 px-4 py-3 hover:bg-subtle"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[a.category]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-body font-semibold">{a.name}</p>
                      <span className="shrink-0 text-[12px] text-muted">
                        {formatDateId(a.date)} {formatTimeOfDay(a.startLocal)}
                      </span>
                    </div>
                    <p className="tabular truncate text-[13px] text-muted">
                      <span className="text-faint">{CATEGORY_LABEL[a.category]} · </span>
                      {meta.join(" · ")}
                    </p>
                    {extra.length > 0 && <p className="tabular truncate text-[13px] text-faint">{extra.join(" · ")}</p>}
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
