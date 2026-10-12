"use client";

import { useEffect, useRef, useState } from "react";
import { formatPaceTag } from "@/components/ui/format";
import { labelsFit, layoutBars, speedHeights, staggerDelays, tierHeights, type SkylineSegment, type SkylineTone } from "./skyline-scale";

const FILL: Record<SkylineTone, string> = {
  work: "fill-brand",
  track: "fill-track",
  success: "fill-success",
  warning: "fill-warning",
  danger: "fill-danger",
};

const HEIGHT = 128;
/** Ruang di atas bar untuk label pace. */
const TOP = 20;
/** Perkiraan lebar label `4'30"` (Geist Mono 11px). */
const LABEL_W = 40;
const DEFAULT_WIDTH = 303;

/**
 * Segment Skyline: bentuk satu sesi lari. Lebar bar = durasi, tinggi = kecepatan (selesai)
 * atau tier intensitas (rencana). Rencana = warna intensitas, selesai = oranye.
 *
 * Animasi hanya saat `animateKey` berubah setelah render pertama (hasil generate baru),
 * tidak pada re-render biasa. Daftar interval teks tetap ditampilkan konsumen di bawahnya.
 */
export function SegmentSkyline({
  segments,
  mode,
  ariaLabel,
  animateKey,
  className = "",
}: {
  segments: SkylineSegment[];
  mode: "done" | "plan";
  ariaLabel: string;
  animateKey?: string | number;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  // Render pertama tidak dianimasikan; kunci yang berubah sesudahnya memutar ulang animasi.
  const firstKey = useRef(animateKey);
  const animate = animateKey !== undefined && animateKey !== firstKey.current;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => setWidth(Math.max(120, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const heights = mode === "plan" ? tierHeights(segments.map((s) => s.tier ?? 1)) : speedHeights(segments.map((s) => s.paceSecPerKm));
  const { bars } = layoutBars(
    segments.map((s) => s.durationSec),
    width,
  );
  const plotH = HEIGHT - TOP;
  const delays = staggerDelays(segments.length);

  const work = mode === "done" ? segments.map((s, i) => ({ s, i })).filter(({ s }) => s.role === "work" && s.paceSecPerKm) : [];
  const centers = work.map(({ i }) => bars[i].x + bars[i].w / 2);
  const showLabels = work.length > 0 && labelsFit(centers, LABEL_W);

  return (
    <div ref={wrap} className={`w-full ${className}`}>
      <svg width={width} height={HEIGHT + 1} viewBox={`0 0 ${width} ${HEIGHT + 1}`} role="img" aria-label={ariaLabel} className="block overflow-visible">
        <g key={animate ? String(animateKey) : "static"}>
          {segments.map((s, i) => {
            const b = bars[i];
            const bh = Math.max(2, plotH * heights[i]);
            return (
              <rect
                key={i}
                x={b.x}
                y={HEIGHT - bh}
                width={b.w}
                height={bh}
                rx={Math.min(4, b.w / 3)}
                className={`${FILL[s.tone]} ${animate ? "skyline-bar" : ""}`}
                style={animate ? { animationDelay: `${delays[i]}ms` } : undefined}
              />
            );
          })}
          {showLabels &&
            work.map(({ s, i }) => (
              <text
                key={`l${i}`}
                x={bars[i].x + bars[i].w / 2}
                y={HEIGHT - Math.max(2, plotH * heights[i]) - 6}
                textAnchor="middle"
                className={`fill-ink font-mono text-[11px] font-semibold ${animate ? "skyline-label" : ""}`}
              >
                {formatPaceTag(s.paceSecPerKm)}
              </text>
            ))}
        </g>
        <line x1={0} x2={width} y1={HEIGHT + 0.5} y2={HEIGHT + 0.5} className="stroke-line" strokeWidth={1} />
      </svg>
    </div>
  );
}
