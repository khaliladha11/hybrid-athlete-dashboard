import Link from "next/link";
import { SegmentSkyline } from "@/components/charts/SegmentSkyline";
import { doneSegments, splitSegments, summarizeDone } from "@/components/charts/skyline-scale";
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

type Detail = Extract<Awaited<ReturnType<typeof getActivityDetail>>, { ok: true }>["data"];

function ActivityDetailView({ data }: { data: Detail }) {
  const empty = (v: number | undefined) => (v ? undefined : true);
  const dur = compactDuration(data.movingTimeSec);
  const onFoot = data.category === "run" || data.category === "walk";

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
        {data.source === "STRAVA" && (
          <p className="mt-4 border-t border-line pt-4 text-[13px] text-muted">
            Aktivitas ini datang dari Strava. intervals.icu tidak boleh meneruskan isi aktivitas Strava lewat API, jadi datanya kosong di sini. Sambungkan jam langsung ke intervals.icu agar datanya lengkap.
          </p>
        )}
      </Card>

      {data.splits.length > 0 ? (
        <SplitsCard data={data} />
      ) : (
        onFoot &&
        data.intervals.length <= 1 && (
          <Card title="Split per km">
            <p className="text-body text-muted">Split belum tersedia: aktivitas ini tidak punya data jarak per detik (stream GPS) di intervals.icu.</p>
          </Card>
        )
      )}

      {/* Satu interval = seluruh sesi, sama dengan ringkasan di atas; hanya tampil bila ada struktur atau lap. */}
      {data.intervals.length > 1 && <IntervalsCard data={data} />}
    </>
  );
}

/** Label split: nomor km, atau jarak untuk sisa terakhir yang kurang dari 1 km. */
const splitLabel = (km: number, index: number) => (km >= 0.995 ? String(index) : km.toFixed(2));

function SplitsCard({ data }: { data: Detail }) {
  const segments = splitSegments(data.splits);
  const full = data.splits.filter((s) => s.distanceKm >= 0.995 && s.avgPaceSecPerKm);
  const fastest = full.length > 1 ? full.reduce((a, b) => (b.avgPaceSecPerKm! < a.avgPaceSecPerKm! ? b : a)) : undefined;
  const cell = "py-2.5 text-right";
  const faint = <span className="text-faint">·</span>;

  return (
    <Card title="Split per km" flush action={<span className="t-label">{data.splits.length} split</span>}>
      {segments.length > 1 && (
        <div className="px-5 pb-4">
          <SegmentSkyline
            mode="done"
            segments={segments}
            ariaLabel={`Pace per km ${data.name}: ${data.splits.map((s) => `${splitLabel(s.distanceKm, s.index)} ${formatPaceTag(s.avgPaceSecPerKm)}`).join(", ")}.`}
          />
          {fastest && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="t-label">Lebar = waktu · tinggi = kecepatan</span>
              <span className="t-label font-semibold text-brand-ink">
                Km {fastest.index} tercepat {formatPaceTag(fastest.avgPaceSecPerKm)}/km
              </span>
            </div>
          )}
        </div>
      )}
      <table className="tabular w-full border-collapse text-body">
        <thead>
          <tr className="border-y border-line">
            <th scope="col" className="t-label py-2 pl-5 text-left font-normal">
              Km
            </th>
            <th scope="col" className="t-label py-2 text-right font-normal">
              Pace
            </th>
            <th scope="col" className="t-label py-2 text-right font-normal">
              HR
            </th>
            <th scope="col" className="t-label py-2 pr-5 text-right font-normal">
              spm
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.splits.map((s) => (
            <tr key={s.index}>
              <th scope="row" className="py-2.5 pl-5 text-left font-medium">
                {splitLabel(s.distanceKm, s.index)}
              </th>
              <td className={`${cell} ${s === fastest ? "font-semibold text-brand-ink" : "font-semibold"}`}>{s.avgPaceSecPerKm ? formatPaceTag(s.avgPaceSecPerKm) : faint}</td>
              <td className={`${cell} text-muted`}>{s.avgHr ? Math.round(s.avgHr) : faint}</td>
              <td className={`${cell} pr-5 text-muted`}>{s.cadenceSpm ?? faint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function IntervalsCard({ data }: { data: Detail }) {
  const segments = doneSegments(data.intervals);
  const summary = summarizeDone(segments);
  return (
    <Card title="Interval / lap" flush>
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
                iv.movingTimeSec ? formatDuration(iv.movingTimeSec) : null,
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
    </Card>
  );
}
