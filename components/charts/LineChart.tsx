"use client";

import { areaPath, axisNumber, extent, linePath, linearScale, niceTicks, placeLabels, thinLabels, type Point } from "./chart-scale";
import { useWidth } from "./useWidth";

export type LineTone = "brand" | "ink" | "muted";
/** Gaya titik: penuh (keyakinan tinggi), cincin tebal (sedang), cincin tipis (rendah). */
export type DotStyle = "filled" | "ring" | "thin";

export interface LineSeries {
  values: (number | undefined)[];
  tone: LineTone;
  /** Titik di setiap nilai (seri mingguan). Seri harian cukup garis. */
  dots?: boolean | DotStyle[];
  /** Penanda teks pendek di atas titik (mis. tahap progresi "R", "T", "V"). */
  marks?: (string | undefined)[];
}

const STROKE: Record<LineTone, string> = { brand: "stroke-brand", ink: "stroke-ink", muted: "stroke-muted" };
const FILL: Record<LineTone, string> = { brand: "fill-brand", ink: "fill-ink", muted: "fill-muted" };

const HEIGHT = 160;
const LEFT = 36;
const RIGHT = 6;
/** Ruang penanda teks di atas titik tertinggi. */
const TOP = 16;
const BOTTOM = 22;

/**
 * Grafik garis tipis (docs/INSIGHT.md I1/I6): skala murni di `chart-scale.ts`, token tema, label mono, tanpa
 * animasi dan tanpa tooltip hover (detail lewat "Lihat tabel"). Nilai kosong memutus garis.
 */
export function LineChart({
  ariaLabel,
  labels,
  series,
  area,
  band,
  target,
  invert = false,
  yFormat = axisNumber,
}: {
  ariaLabel: string;
  /** Label sumbu-x per indeks; ditipiskan ke ≤ 6. */
  labels: string[];
  series: LineSeries[];
  /** Area ke garis nol (mis. Form = CTL − ATL). */
  area?: (number | undefined)[];
  /** Pita netral horizontal (konteks, bukan zona bahaya). */
  band?: [number, number];
  /** Garis target putus-putus. */
  target?: number;
  /** Nilai kecil di atas (pace: lebih cepat lebih tinggi). */
  invert?: boolean;
  yFormat?: (v: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = labels.length;
  const all = [...series.flatMap((s) => s.values), ...(area ?? []), ...(band ?? []), ...(target !== undefined ? [target] : [])];
  const ext = extent(all) ?? [0, 1];
  const { domain, ticks } = niceTicks(ext[0], ext[1]);
  const plotW = width - LEFT - RIGHT;
  const y = linearScale(domain, invert ? [TOP, HEIGHT - BOTTOM] : [HEIGHT - BOTTOM, TOP]);
  const x = (i: number) => LEFT + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const pts = (vals: (number | undefined)[]): (Point | null)[] => vals.map((v, i) => (v === undefined ? null : { x: x(i), y: y(v) }));
  const zeroY = y(Math.min(Math.max(0, domain[0]), domain[1]));

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={ariaLabel} className="block">
        {band && (
          <rect
            x={LEFT}
            width={plotW}
            y={Math.min(y(band[0]), y(band[1]))}
            height={Math.abs(y(band[1]) - y(band[0]))}
            className="fill-subtle"
          />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={width - RIGHT} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={LEFT - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted font-mono text-[11px] tabular-nums">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {area && <path d={areaPath(pts(area), zeroY)} className="fill-track" opacity={0.7} />}
        {target !== undefined && (
          <line x1={LEFT} x2={width - RIGHT} y1={y(target)} y2={y(target)} className="stroke-ink" strokeWidth={1.5} strokeDasharray="4 4" />
        )}
        {series.map((s, si) => (
          <g key={si}>
            <path d={linePath(pts(s.values))} className={STROKE[s.tone]} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {s.dots &&
              s.values.map((v, i) => {
                if (v === undefined) return null;
                const style: DotStyle = Array.isArray(s.dots) ? (s.dots[i] ?? "filled") : "filled";
                return style === "filled" ? (
                  <circle key={i} cx={x(i)} cy={y(v)} r={3.5} className={FILL[s.tone]} />
                ) : (
                  <circle key={i} cx={x(i)} cy={y(v)} r={3.5} className={`${STROKE[s.tone]} fill-surface`} strokeWidth={style === "ring" ? 2 : 1.25} />
                );
              })}
            {s.marks?.map((m, i) =>
              m && s.values[i] !== undefined ? (
                <text key={`m${i}`} x={x(i)} y={y(s.values[i]!) - 8} textAnchor="middle" className="fill-ink font-mono text-[10px] font-semibold">
                  {m}
                </text>
              ) : null,
            )}
          </g>
        ))}
        {placeLabels(
          thinLabels(n).map((i) => ({ x: x(i), text: labels[i] })),
          LEFT,
          width - RIGHT,
        ).map((l) => (
          <text key={l.text} x={l.x} y={HEIGHT - 6} textAnchor="middle" className="fill-muted font-mono text-[11px]">
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
