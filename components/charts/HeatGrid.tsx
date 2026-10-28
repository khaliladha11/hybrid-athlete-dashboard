"use client";

import type { DayClass, HeatWeek } from "@/lib/insight/activity-heatmap";
import { placeLabels } from "./chart-scale";
import { useWidth } from "./useWidth";

const LEFT = 30;
const TOP = 18;
const GAP_RATIO = 0.18;
const ROW_LABELS: [number, string][] = [
  [0, "Sen"],
  [2, "Rab"],
  [4, "Jum"],
  [6, "Min"],
];

const FILL: Record<DayClass, string> = {
  run: "fill-brand",
  st: "fill-brand-soft stroke-brand",
  both: "fill-brand",
  rest: "fill-subtle",
  future: "fill-none stroke-line",
};

const MONTH = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" });
const monthOf = (d: string) => MONTH.format(new Date(`${d}T00:00:00Z`)).replace(".", "");

/**
 * Kalender heatmap (0.15.1): kolom = minggu (lama → baru), baris = Senin sampai Minggu. Lari `brand`, ST `brand-soft`
 * bergaris `brand`, lari + ST `brand` dengan titik `surface`, istirahat `subtle`, hari mendatang hanya garis.
 * Label bulan di atas kolom pertama tiap bulan. Tanpa animasi dan tanpa hover; detail lewat tabel.
 */
export function HeatGrid({ weeks, ariaLabel }: { weeks: HeatWeek[]; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = weeks.length;
  const slot = Math.min(26, (width - LEFT) / Math.max(1, n));
  const cell = slot * (1 - GAP_RATIO);
  const height = TOP + slot * 7;
  const x = (i: number) => LEFT + i * slot;
  const months = weeks.flatMap((w, i) => (i === 0 || w.start.slice(5, 7) !== weeks[i - 1].start.slice(5, 7) ? [{ x: x(i) + cell / 2, text: monthOf(w.start) }] : []));

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="block">
        {placeLabels(months, LEFT, width).map((m) => (
          <text key={m.text + m.x} x={m.x} y={11} textAnchor="middle" className="fill-muted font-mono text-[11px]">
            {m.text}
          </text>
        ))}
        {ROW_LABELS.map(([r, t]) => (
          <text key={t} x={0} y={TOP + r * slot + cell / 2} dy="0.32em" className="fill-muted font-mono text-[11px]">
            {t}
          </text>
        ))}
        {weeks.map((w, i) =>
          w.days.map((d, r) => (
            <g key={d.date}>
              <rect x={x(i)} y={TOP + r * slot} width={cell} height={cell} rx={Math.min(4, cell / 4)} className={FILL[d.cls]} strokeWidth={1.5} />
              {d.cls === "both" && <circle cx={x(i) + cell / 2} cy={TOP + r * slot + cell / 2} r={Math.max(1.5, cell / 6)} className="fill-surface" />}
            </g>
          )),
        )}
      </svg>
    </div>
  );
}
