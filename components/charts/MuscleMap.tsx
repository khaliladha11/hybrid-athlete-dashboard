import type { MuscleRegion } from "@/lib/movements/muscle-regions";
import { BODY_BACK, BODY_FRONT, OVERLAY_REGIONS, type BodyView } from "./muscle-paths";

/** Jarak antara tubuh depan dan belakang (satuan viewBox). */
const GAP = 40;
const BACK_SHIFT = 727 + GAP - 718;

/**
 * Peta otot depan & belakang (0.14.1, keputusan D7). SVG sendiri dengan path MuscleMapJS (MIT, NOTICE.md).
 * Warna dari token: otot utama `brand`, sekunder `brand-soft` dengan garis `brand` (supaya tetap terbedakan dari otot
 * lain di kedua tema), otot lain `subtle-strong`. Tanpa animasi. Daftar teks otot ditampilkan oleh pemanggil.
 *
 * Mode heatmap (0.15.1, Insight): `levels` (region → 1–4) menggambar opasitas `brand` bertingkat menggantikan
 * utama/sekunder, `dashed` memberi garis putus-putus `ink` (otot jarang dilatih), dan `onSelect` membuat region bisa
 * diketuk (daftar teks tetap jalur utama yang bisa difokus).
 */
export function MuscleMap({
  primary = [],
  secondary = [],
  levels,
  dashed = [],
  onSelect,
  label,
  className = "",
}: {
  primary?: readonly MuscleRegion[];
  secondary?: readonly MuscleRegion[];
  /** Mode heatmap: tingkat 1–4 per region. */
  levels?: Partial<Record<MuscleRegion, number>>;
  /** Region bergaris putus-putus (jarang dilatih). */
  dashed?: readonly MuscleRegion[];
  onSelect?: (region: MuscleRegion) => void;
  /** `aria-label`, mis. dari `muscleAriaLabel`. */
  label: string;
  className?: string;
}) {
  const p = new Set(primary);
  const s = new Set(secondary);
  const dash = new Set(dashed);
  const view = (side: "front" | "back", body: BodyView) => {
    const region = (slug: string) => `${side}:${slug}` as MuscleRegion;
    const level = (slug: string) => levels?.[region(slug)] ?? 0;
    const tone = (slug: string) =>
      levels ? (level(slug) > 0 ? "level" : "base") : p.has(region(slug)) ? "primary" : s.has(region(slug)) ? "secondary" : "base";
    const entries = Object.entries(body.parts);
    const base = entries.filter(([slug]) => !OVERLAY_REGIONS.includes(slug));
    const overlay = entries.filter(([slug]) => OVERLAY_REGIONS.includes(slug) && (tone(slug) !== "base" || dash.has(region(slug))));
    // Region bergaris putus-putus digambar terakhir supaya garisnya tidak tertutup region tetangga.
    const ordered = [...base, ...overlay].sort(([a], [b]) => Number(dash.has(region(a))) - Number(dash.has(region(b))));
    return ordered.map(([slug, d]) => (
      <path
        key={`${side}-${slug}`}
        d={d}
        data-region={region(slug)}
        data-tone={tone(slug)}
        className={`${FILL[tone(slug)]} ${dash.has(region(slug)) ? "!stroke-ink" : ""} ${onSelect ? "cursor-pointer" : ""}`}
        {...(tone(slug) === "level" ? { fillOpacity: LEVEL_OPACITY[level(slug)] } : {})}
        {...(dash.has(region(slug)) ? { strokeDasharray: "14 10", strokeWidth: 5 } : {})}
        {...(onSelect ? { onClick: () => onSelect(region(slug)) } : {})}
      />
    ));
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

/** Opasitas `brand` per tingkat heatmap (indeks = tingkat). */
export const LEVEL_OPACITY = [0, 0.3, 0.55, 0.8, 1];

const FILL = {
  level: "fill-brand stroke-surface",
  primary: "fill-brand stroke-surface",
  secondary: "fill-brand-soft stroke-brand",
  base: "fill-subtle-strong stroke-surface",
} as const;
