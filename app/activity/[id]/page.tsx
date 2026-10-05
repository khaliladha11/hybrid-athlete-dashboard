import Link from "next/link";
import { Card, Stat } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateId, formatTimeOfDay } from "@/lib/date";
import { getActivityDetail } from "@/lib/intervals/data-source";
import { CATEGORY_LABEL, formatDuration, formatPace } from "@/lib/intervals/summary";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getActivityDetail(decodeURIComponent(id));

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-block text-body text-muted hover:text-ink">
        ← Profil
      </Link>
      {!res.ok ? (
        <ErrorState error={res.error} />
      ) : (
        <>
          <header>
            <p className="mt-0.5 text-[13px] text-muted">
              {CATEGORY_LABEL[res.data.category]} · {formatDateId(res.data.date)} {formatTimeOfDay(res.data.startLocal)}
            </p>
            <h1 className="text-[22px] leading-tight font-semibold">{res.data.name}</h1>
          </header>
          <Card>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4">
              <Stat label="Jarak" value={res.data.distanceKm ? res.data.distanceKm.toFixed(2) : "—"} sub="km" muted={!res.data.distanceKm} />
              <Stat label="Durasi" value={formatDuration(res.data.movingTimeSec)} />
              <Stat label="Pace" value={formatPace(res.data.avgPaceSecPerKm).replace("/km", "")} sub="/km" muted={!res.data.avgPaceSecPerKm} />
              <Stat label="Avg HR" value={res.data.avgHr ? Math.round(res.data.avgHr) : "—"} sub="bpm" muted={!res.data.avgHr} />
              <Stat label="Cadence" value={res.data.cadenceSpm ?? "—"} sub="spm" muted={!res.data.cadenceSpm} />
              <Stat label="Load" value={res.data.trainingLoad ? Math.round(res.data.trainingLoad) : "—"} muted={!res.data.trainingLoad} />
            </div>
          </Card>
          <Card title="Interval / lap" flush>
            {res.data.intervals.length === 0 ? (
              <p className="px-4 text-body text-muted">Tidak ada data interval untuk aktivitas ini.</p>
            ) : (
              <ul className="divide-y divide-line text-body">
                {res.data.intervals.map((iv, i) => (
                  <li key={i} className="tabular flex items-baseline justify-between gap-3 px-4 py-2">
                    <span className="font-medium">{iv.label}</span>
                    <span className="text-right text-[13px] text-muted">
                      {[
                        formatDuration(iv.movingTimeSec),
                        iv.avgPaceSecPerKm ? formatPace(iv.avgPaceSecPerKm) : null,
                        iv.avgHr ? `♥ ${Math.round(iv.avgHr)}` : null,
                        iv.cadenceSpm ? `${iv.cadenceSpm} spm` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
