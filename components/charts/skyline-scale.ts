/**
 * Logika murni Segment Skyline (docs/DESIGN-SYSTEM.md §6): lebar bar ∝ durasi, tinggi ∝ kecepatan.
 * Tanpa React/DOM supaya bisa diuji.
 */
import type { ActivityInterval, ActivitySplit } from "@/lib/intervals/types";
import type { RunStep, RunWorkout } from "@/lib/generator/types";
import { formatClock } from "@/components/ui/format";

export type SkylineTone = "work" | "track" | "success" | "warning" | "danger";

export interface SkylineSegment {
  durationSec: number;
  /** Mode selesai: pace segmen (detik/km). */
  paceSecPerKm?: number;
  /** Mode rencana: tier intensitas (jalan 1, recovery 1.5, jog/Z2 2, tempo 3, interval 4). */
  tier?: number;
  role: "work" | "rest";
  tone: SkylineTone;
}

/** Tinggi minimum supaya bar tetap terlihat. */
export const MIN_HEIGHT = 0.1;
/** Di bawah selisih pace ini (detik/km), skala dari nol supaya selisih kecil tidak terlihat dramatis. */
export const STEADY_SPREAD_SEC = 60;
/** Segmen sisa yang terlalu pendek (mis. 7 detik setelah stop) dibuang. */
export const MIN_SEGMENT_SEC = 10;
export const MAX_TIER = 4;

/**
 * Tinggi relatif (0..1) dari pace. Kecepatan = 1/pace. Bila selisih pace terlambat & tercepat
 * < 60 detik: kecepatan relatif terhadap tercepat (dari nol). Selain itu min-max.
 * Pace kosong → tinggi minimum.
 */
export function speedHeights(paces: (number | undefined)[]): number[] {
  const valid = paces.filter((p): p is number => !!p && p > 0);
  if (!valid.length) return paces.map(() => MIN_HEIGHT);
  const fast = Math.min(...valid);
  const slow = Math.max(...valid);
  const clamp = (h: number) => Math.min(1, Math.max(MIN_HEIGHT, h));
  if (slow - fast < STEADY_SPREAD_SEC) {
    return paces.map((p) => (p && p > 0 ? clamp(fast / p) : MIN_HEIGHT));
  }
  const lo = 1 / slow;
  const hi = 1 / fast;
  return paces.map((p) => (p && p > 0 ? clamp(MIN_HEIGHT + (1 - MIN_HEIGHT) * ((1 / p - lo) / (hi - lo))) : MIN_HEIGHT));
}

export function tierHeights(tiers: number[]): number[] {
  return tiers.map((t) => Math.min(1, Math.max(MIN_HEIGHT, t / MAX_TIER)));
}

function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Segmen kerja: `type === "WORK"` dari intervals.icu bila tipe itu membedakan segmen. Bila tidak ada
 * WORK, atau SEMUA segmen WORK (lap otomatis, tidak informatif): segmen yang lebih cepat dari median.
 * Lari steady (selisih pace < 60 dtk) tidak punya segmen kerja.
 */
export function detectWork(items: { type?: string; paceSecPerKm?: number }[]): boolean[] {
  const types = items.map((i) => i.type?.toUpperCase());
  if (types.includes("WORK") && !types.every((t) => t === "WORK")) return types.map((t) => t === "WORK");
  const paces = items.map((i) => i.paceSecPerKm).filter((p): p is number => !!p && p > 0);
  if (!paces.length || Math.max(...paces) - Math.min(...paces) < STEADY_SPREAD_SEC) return items.map(() => false);
  const med = median(paces)!;
  return items.map((i) => !!i.paceSecPerKm && i.paceSecPerKm < med);
}

/** Aktivitas selesai → segmen: buang < 10 detik, kerja = oranye, lainnya track. */
export function doneSegments(intervals: ActivityInterval[]): SkylineSegment[] {
  const kept = intervals.filter((iv) => (iv.movingTimeSec ?? 0) >= MIN_SEGMENT_SEC);
  const work = detectWork(kept.map((iv) => ({ type: iv.type, paceSecPerKm: iv.avgPaceSecPerKm })));
  return kept.map((iv, i) => ({
    durationSec: iv.movingTimeSec ?? 0,
    paceSecPerKm: iv.avgPaceSecPerKm,
    role: work[i] ? "work" : "rest",
    tone: work[i] ? "work" : "track",
  }));
}

/** Tier & warna langkah rencana: jalan/recovery = track, Z2 hijau, tempo kuning, interval merah. */
/**
 * Split per km: semua bar oranye (sesi selesai), lebar = waktu, tinggi = kecepatan.
 * Satu bar per baris tabel (tanpa ambang MIN_SEGMENT_SEC), jadi grafik dan tabel selalu sejajar.
 */
export function splitSegments(splits: ActivitySplit[]): SkylineSegment[] {
  return splits
    .filter((s) => s.movingTimeSec > 0)
    .map((s) => ({ durationSec: s.movingTimeSec, paceSecPerKm: s.avgPaceSecPerKm, role: "work", tone: "work" }));
}

export function stepTier(s: RunStep): { tier: number; tone: SkylineTone; role: "work" | "rest" } {
  if (s.kind === "walk") return { tier: 1, tone: "track", role: "rest" };
  if (s.kind === "jog") return { tier: 1.5, tone: "track", role: "rest" };
  if (s.rpe?.startsWith("3")) return { tier: 2, tone: "success", role: "rest" };
  if (s.rpe?.startsWith("6")) return { tier: 3, tone: "warning", role: "work" };
  return { tier: 4, tone: "danger", role: "work" };
}

/** Workout rencana → segmen (repetisi dibuka). */
export function planSegments(w: RunWorkout): SkylineSegment[] {
  return w.blocks.flatMap((b) =>
    Array.from({ length: b.repeat }, () => b.steps)
      .flat()
      .map((s) => ({ durationSec: s.durationMin * 60, ...stepTier(s) })),
  );
}

export interface BarLayout {
  x: number;
  w: number;
}

/** Posisi bar: lebar ∝ durasi; jarak antar bar mengecil otomatis untuk sesi dengan banyak segmen. */
export function layoutBars(durations: number[], width: number): { bars: BarLayout[]; gap: number } {
  const n = durations.length;
  if (!n) return { bars: [], gap: 0 };
  const gap = n > 1 ? Math.min(3, Math.max(0.5, (width / n) * 0.25)) : 0;
  const avail = Math.max(0, width - gap * (n - 1));
  const total = durations.reduce((a, d) => a + Math.max(0, d), 0) || 1;
  let x = 0;
  const bars = durations.map((d) => {
    const w = Math.max(1, (avail * Math.max(0, d)) / total);
    const bar = { x, w };
    x += w + gap;
    return bar;
  });
  return { bars, gap };
}

/** Label muat bila jarak antar pusat bar berlabel ≥ lebar label + 6px. */
export function labelsFit(centers: number[], labelWidth: number, minGap = 6): boolean {
  return centers.every((c, i) => i === 0 || c - centers[i - 1] >= labelWidth + minGap);
}

/** Jeda stagger: menyapu kiri → kanan, 30ms per bar dengan total maksimal 60ms (durasi 240ms → ≤ 300ms). */
export function staggerDelays(n: number, step = 30, maxTotal = 60): number[] {
  if (n <= 1) return [0];
  const total = Math.min(maxTotal, (n - 1) * step);
  return Array.from({ length: n }, (_, i) => Math.round((i / (n - 1)) * total));
}

/** Durasi pendek untuk struktur sesi: 60 → `1'`, 45 → `45"`, 96 → `1:36`. */
export function formatSegDuration(sec: number): string {
  const s = Math.round(sec);
  if (s % 60 === 0) return `${s / 60}'`;
  if (s < 60) return `${s}"`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Ringkasan footer mode selesai: struktur sesi di kiri, rep tercepat di kanan. */
export function summarizeDone(segments: SkylineSegment[]): { structure: string; bestPace?: number; hasWork: boolean } {
  const work = segments.filter((s) => s.role === "work");
  const paces = (xs: SkylineSegment[]) => xs.map((s) => s.paceSecPerKm).filter((p): p is number => !!p && p > 0);
  const total = segments.reduce((a, s) => a + s.durationSec, 0);
  if (!work.length) {
    const p = paces(segments);
    return { structure: `${segments.length} segmen · ${formatClock(total)}`, bestPace: p.length ? Math.min(...p) : undefined, hasWork: false };
  }
  const first = segments.findIndex((s) => s.role === "work");
  let last = -1;
  segments.forEach((s, i) => s.role === "work" && (last = i));
  const between = segments.slice(first, last + 1).filter((s) => s.role === "rest");
  const workMed = median(work.map((s) => s.durationSec)) ?? 0;
  const restMed = median(between.map((s) => s.durationSec));
  const warm = segments.slice(0, first).reduce((a, s) => a + s.durationSec, 0);
  const cool = segments.slice(last + 1).reduce((a, s) => a + s.durationSec, 0);
  const parts = [
    warm >= 180 ? `WU ${formatSegDuration(Math.round(warm / 60) * 60)}` : null,
    `${work.length}× ${formatSegDuration(workMed)}${restMed ? ` / ${formatSegDuration(restMed)}` : ""}`,
    cool >= 180 ? `CD ${formatSegDuration(Math.round(cool / 60) * 60)}` : null,
  ].filter(Boolean);
  const p = paces(work);
  return { structure: parts.join(" · "), bestPace: p.length ? Math.min(...p) : undefined, hasWork: true };
}
