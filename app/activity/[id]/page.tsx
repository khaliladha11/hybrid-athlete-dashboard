import Link from "next/link";
import { SegmentSkyline } from "@/components/charts/SegmentSkyline";
import { doneSegments, summarizeDone } from "@/components/charts/skyline-scale";
import { Card, StatRow } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { compactDuration, formatPaceTag } from "@/components/ui/format";
import { formatDateId, formatTimeOfDay } from "@/lib/date";
import { getActivityDetail } from "@/lib/intervals/data-source";
import { CATEGORY_LABEL, formatDuration } from "@/lib/intervals/summary";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getActivityDetail(decodeURIComponent(id));

  return (
    <div className="space-y-3">
      <Link href="/" className="inline-flex min-h-11 items-center text-body text-muted hover:text-ink">
        ← Profil
      </Link>
      {!res.ok ? (
        <ErrorState error={res.error} />
      ) : (
        <ActivityDetailView data={res.data} />
      )}
    </div>
  );
}

function ActivityDetailView({ data }: { data: Extract<Awaited<ReturnType<typeof getActivityDetail>>, { ok: true }>["data"] }) {
  const segments = doneSegments(data.intervals);
  const summary = summarizeDone(segments);
  const empty = (v: number | undefined) => (v ? undefined : true);
  const dur = compactDuration(data.movingTimeSec);

  return (
    <>
      <Card tone="tag" kicker={`${CATEGORY_LABEL[data.category]} · ${formatDateId(data.date)} ${formatTimeOfDay(data.startLocal)}`} title={<span className="block">{data.name}</span>}>
        <StatRow
          items={[
            { label: "Jarak", value: data.distanceKm ? data.distanceKm.toFixed(2) : undefined, unit: "km", muted: empty(data.distanceKm) },
            { label: "Durasi", value: dur?.value, unit: dur?.unit ?? "waktu" },
            { label: "Pace", value: formatPaceTag(data.avgPaceSecPerKm), unit: "/km", muted: empty(data.avgPaceSecPerKm) },
            { label: "Avg HR", value: data.avgHr ? Math.round(data.avgHr) : undefined, unit: "bpm" },
            { label: "Cadence", value: data.cadenceSpm, unit: "spm" },
            { label: "Load", value: data.trainingLoad ? Math.round(data.trainingLoad) : undefined, unit: "total" },
          ]}
        />
      </Card>

      <Card title="Interval / lap" flush>
        {data.intervals.length === 0 ? (
          <p className="px-5 text-body text-muted">Tidak ada data interval untuk aktivitas ini.</p>
        ) : (
          <>
            {segments.length > 1 && (
              <div className="px-5 pb-4">
                <SegmentSkyline
                  mode="done"
                  segments={segments}
                  ariaLabel={`Bentuk sesi ${data.name}: ${summary.structure}${summary.bestPace ? `, rep tercepat ${formatPaceTag(summary.bestPace)} per km` : ""}. Rincian di daftar di bawah.`}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="t-label">{summary.structure}</span>
                  {summary.bestPace && (
                    <span className="t-label font-semibold text-brand-ink">
                      {summary.hasWork ? "Best rep" : "Tercepat"} {formatPaceTag(summary.bestPace)}/km
                    </span>
                  )}
                </div>
              </div>
            )}
            <ul className="divide-y divide-line border-t border-line text-body">
              {data.intervals.map((iv, i) => (
                <li key={i} className="tabular flex items-baseline justify-between gap-3 px-5 py-2.5">
                  <span className="font-medium">{iv.label}</span>
                  <span className="text-right text-[13px] text-muted">
                    {[
                      formatDuration(iv.movingTimeSec),
                      iv.avgPaceSecPerKm ? `${formatPaceTag(iv.avgPaceSecPerKm)}/km` : null,
                      iv.avgHr ? `♥ ${Math.round(iv.avgHr)}` : null,
                      iv.cadenceSpm ? `${iv.cadenceSpm} spm` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
