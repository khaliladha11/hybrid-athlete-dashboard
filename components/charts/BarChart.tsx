"use client";

import { axisNumber, bandLayout, linearScale, niceTicks, placeLabels, thinLabels } from "./chart-scale";
import { useWidth } from "./useWidth";

export type BarTone = "success" | "danger" | "brand" | "brandSoft" | "track";

export interface BarStack {
  values: number[];
  tone: BarTone;
}

const FILL: Record<BarTone, string> = { success: "fill-success", danger: "fill-danger", brand: "fill-brand", brandSoft: "fill-brand-soft stroke-brand", track: "fill-track" };

const HEIGHT = 168;
const LEFT = 36;
const RIGHT = 6;
/** Ruang penanda teks di atas batang. */
const TOP = 18;
const BOTTOM = 22;

/**
 * Batang bertumpuk (mis. km easy + berat per minggu). Penanda pendek di atas batang (mis. "+35%", "CB").
 * Batang minggu berjalan digambar redup karena belum lengkap. Tanpa animasi dan tanpa tooltip hover.
 */
export function BarChart({
  ariaLabel,
  labels,
  stacks,
  marks = [],
  partial,
  integer = false,
  yFormat = axisNumber,
}: {
  ariaLabel: string;
  labels: string[];
  /** Ditumpuk dari bawah sesuai urutan. */
  stacks: BarStack[];
  marks?: (string | undefined)[];
  /** Indeks batang yang belum lengkap (minggu berjalan). */
  partial?: number;
  /** Nilai berupa hitungan: tick bilangan bulat. */
  integer?: boolean;
  yFormat?: (v: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = labels.length;
  const totals = labels.map((_, i) => stacks.reduce((t, s) => t + (s.values[i] ?? 0), 0));
  const { domain, ticks } = niceTicks(0, Math.max(0, ...totals), { zero: true, integer });
  const plotW = width - LEFT - RIGHT;
  const y = linearScale(domain, [HEIGHT - BOTTOM, TOP]);
  const bars = bandLayout(n, plotW);

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={ariaLabel} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={width - RIGHT} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={LEFT - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted font-mono text-[11px] tabular-nums">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          let base = HEIGHT - BOTTOM;
          const cx = LEFT + b.x + b.w / 2;
          return (
            <g key={i} opacity={i === partial ? 0.55 : 1}>
              {stacks.map((s, si) => {
                const v = s.values[i] ?? 0;
                if (v <= 0) return null;
                const h = Math.max(1, HEIGHT - BOTTOM - y(domain[0] + v));
                base -= h;
                return <rect key={si} x={LEFT + b.x} y={base} width={b.w} height={h} className={FILL[s.tone]} />;
              })}
              {marks[i] && (
                <text x={cx} y={base - 5} textAnchor="middle" className="fill-ink font-mono text-[10px] font-semibold">
                  {marks[i]}
                </text>
              )}
            </g>
          );
        })}
        {placeLabels(
          thinLabels(n).map((i) => ({ x: LEFT + bars[i].x + bars[i].w / 2, text: labels[i] })),
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
