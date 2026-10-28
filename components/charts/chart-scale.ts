/**
 * Skala & tata letak grafik Insight (docs/INSIGHT.md I1). Murni, tanpa React/DOM, supaya bisa diuji seperti
 * `skyline-scale.ts`. Nilai kosong (`undefined`) tidak pernah dianggap nol: garis diputus, batang tidak digambar.
 */

export type Range = [number, number];

/** Batas label sumbu di layar 375px (docs/INSIGHT.md §5). */
export const MAX_LABELS = 6;

const STEPS = [1, 2, 2.5, 5, 10];

/** Nilai min & maks yang terisi, atau null bila semuanya kosong. */
export function extent(values: (number | undefined)[]): Range | null {
  const xs = values.filter((v): v is number => v !== undefined && Number.isFinite(v));
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
}

/** Angka desimal yang cukup untuk langkah tick (2,5 → 1; 0,25 → 2). */
const decimals = (step: number) => Math.max(0, Math.ceil(-Math.log10(step)) + 1);
const round = (v: number, d: number) => Number(v.toFixed(Math.min(10, d)));

/**
 * Domain dan tick "rapi" (langkah 1/2/2,5/5 × 10ⁿ) yang memuat `[min, max]`, dengan jumlah tick ≤ `maxTicks`.
 * Satu nilai atau nilai sama diberi jarak supaya garis tidak menempel di tepi. `zero` memaksa domain memuat 0 (batang).
 */
export function niceTicks(min: number, max: number, { maxTicks = 5, zero = false }: { maxTicks?: number; zero?: boolean } = {}): { domain: Range; ticks: number[] } {
  let lo = zero ? Math.min(0, min) : min;
  let hi = zero ? Math.max(0, max) : max;
  if (hi === lo) {
    const pad = Math.abs(hi) * 0.1 || 1;
    hi += pad;
    if (!zero || lo !== 0) lo -= pad;
  }
  const raw = (hi - lo) / Math.max(1, maxTicks - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (let k = 0; k < 4; k++) {
    for (const s of STEPS) {
      const step = s * mag * 10 ** k;
      const a = Math.floor(lo / step + 1e-9) * step;
      const b = Math.ceil(hi / step - 1e-9) * step;
      const n = Math.round((b - a) / step) + 1;
      if (n <= maxTicks) {
        const d = decimals(step);
        const ticks = Array.from({ length: n }, (_, i) => round(a + i * step, d));
        return { domain: [ticks[0], ticks[n - 1]], ticks };
      }
    }
  }
  return { domain: [lo, hi], ticks: [lo, hi] };
}

/** Skala linear domain → piksel. Domain nol lebar dipetakan ke tengah. */
export function linearScale([d0, d1]: Range, [r0, r1]: Range): (v: number) => number {
  if (d1 === d0) return () => (r0 + r1) / 2;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

/** Indeks label sumbu-x yang ditampilkan: ≤ `max`, tersebar rata, label terakhir selalu ada. */
export function thinLabels(n: number, max = MAX_LABELS): number[] {
  if (n <= 0) return [];
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const every = Math.ceil((n - 1) / (max - 1));
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= every) out.unshift(i);
  return out;
}

/** Perkiraan lebar label mono 11px (Geist Mono ±6,7px per karakter). */
export const labelWidth = (text: string) => Math.ceil(text.length * 6.7);

/**
 * Pusat label sumbu-x: label di tepi digeser masuk supaya tidak terpotong, dan label yang masih bertabrakan
 * (jarak < lebar + 6px) dibuang, kecuali label terakhir (data terbaru).
 */
export function placeLabels(items: { x: number; text: string }[], min: number, max: number, gap = 6): { x: number; text: string }[] {
  const placed = items.map((it) => {
    const half = labelWidth(it.text) / 2;
    return { ...it, x: Math.min(max - half, Math.max(min + half, it.x)) };
  });
  const out: typeof placed = [];
  for (let i = placed.length - 1; i >= 0; i--) {
    const it = placed[i];
    const next = out[0];
    if (next && next.x - it.x < (labelWidth(next.text) + labelWidth(it.text)) / 2 + gap) continue;
    out.unshift(it);
  }
  return out;
}

export interface Band {
  x: number;
  w: number;
}

/** Batang selebar sama mengisi `width`, jarak antar batang = `gapRatio` × lebar slot (min 2px). */
export function bandLayout(n: number, width: number, gapRatio = 0.3): Band[] {
  if (n <= 0) return [];
  const slot = width / n;
  const gap = n > 1 ? Math.max(2, slot * gapRatio) : 0;
  const w = Math.max(1, slot - gap);
  return Array.from({ length: n }, (_, i) => ({ x: i * slot + (slot - w) / 2, w }));
}

export interface Point {
  x: number;
  y: number;
}

const fmt = (v: number) => String(Math.round(v * 10) / 10);

/** Path SVG garis; titik `null` memutus garis (data kosong tidak disambung). Titik tunggal tidak menghasilkan garis. */
export function linePath(points: (Point | null)[]): string {
  const parts: string[] = [];
  let run: Point[] = [];
  const flush = () => {
    if (run.length > 1) parts.push(run.map((p, i) => `${i ? "L" : "M"}${fmt(p.x)} ${fmt(p.y)}`).join(" "));
    run = [];
  };
  for (const p of points) {
    if (p) run.push(p);
    else flush();
  }
  flush();
  return parts.join(" ");
}

/** Path area antara garis dan `baseY`, diputus di nilai kosong (mis. area Form). */
export function areaPath(points: (Point | null)[], baseY: number): string {
  const parts: string[] = [];
  let run: Point[] = [];
  const flush = () => {
    if (run.length > 1) {
      const top = run.map((p, i) => `${i ? "L" : "M"}${fmt(p.x)} ${fmt(p.y)}`).join(" ");
      parts.push(`${top} L${fmt(run.at(-1)!.x)} ${fmt(baseY)} L${fmt(run[0].x)} ${fmt(baseY)} Z`);
    }
    run = [];
  };
  for (const p of points) {
    if (p) run.push(p);
    else flush();
  }
  flush();
  return parts.join(" ");
}
