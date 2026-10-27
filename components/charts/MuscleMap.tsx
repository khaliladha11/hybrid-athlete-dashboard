import type { MuscleRegion } from "@/lib/movements/muscle-regions";
import { BODY_BACK, BODY_FRONT, OVERLAY_REGIONS, type BodyView } from "./muscle-paths";

/** Jarak antara tubuh depan dan belakang (satuan viewBox). */
const GAP = 40;
const BACK_SHIFT = 727 + GAP - 718;

/**
 * Peta otot depan & belakang (0.14.1, keputusan D7). SVG sendiri dengan path MuscleMapJS (MIT, NOTICE.md).
 * Warna dari token: otot utama `brand`, sekunder `brand-soft` dengan garis `brand` (supaya tetap terbedakan dari otot
 * lain di kedua tema), otot lain `subtle-strong`. Tanpa animasi. Daftar teks otot ditampilkan oleh pemanggil.
 */
export function MuscleMap({
  primary,
  secondary,
  label,
  className = "",
}: {
  primary: readonly MuscleRegion[];
  secondary: readonly MuscleRegion[];
  /** `aria-label`, mis. dari `muscleAriaLabel`. */
  label: string;
  className?: string;
}) {
  const p = new Set(primary);
  const s = new Set(secondary);
  const view = (side: "front" | "back", body: BodyView) => {
    const tone = (slug: string) => (p.has(`${side}:${slug}`) ? "primary" : s.has(`${side}:${slug}`) ? "secondary" : "base");
    const entries = Object.entries(body.parts);
    const base = entries.filter(([slug]) => !OVERLAY_REGIONS.includes(slug));
    const overlay = entries.filter(([slug]) => OVERLAY_REGIONS.includes(slug) && tone(slug) !== "base");
    return [...base, ...overlay].map(([slug, d]) => <path key={`${side}-${slug}`} d={d} data-region={`${side}:${slug}`} data-tone={tone(slug)} className={FILL[tone(slug)]} />);
  };
  return (
    <div className={className}>
      <svg viewBox={`0 95 ${727 * 2 + GAP} 1280`} role="img" aria-label={label} className="mx-auto block h-auto w-full max-w-[320px]">
        <g strokeWidth={3} strokeLinejoin="round">{view("front", BODY_FRONT)}</g>
        <g strokeWidth={3} strokeLinejoin="round" transform={`translate(${BACK_SHIFT} 0)`}>
          {view("back", BODY_BACK)}
        </g>
      </svg>
      <div aria-hidden className="mx-auto mt-1 grid max-w-[320px] grid-cols-2 text-center text-[12px] text-muted">
        <span>Depan</span>
        <span>Belakang</span>
      </div>
    </div>
  );
}

const FILL = {
  primary: "fill-brand stroke-surface",
  secondary: "fill-brand-soft stroke-brand",
  base: "fill-subtle-strong stroke-surface",
} as const;
