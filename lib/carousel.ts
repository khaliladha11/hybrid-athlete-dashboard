/**
 * Logika carousel info kecil (1.1.0, Wellness di Profil). Murni; scroll-snap & tombol ada di komponen.
 */

export type CarouselMode = "none" | "single" | "carousel";

/** 0 item: tidak tampil; 1 item: satu kartu biasa tanpa kontrol; 2+: carousel. */
export function carouselMode(count: number): CarouselMode {
  return count <= 0 ? "none" : count === 1 ? "single" : "carousel";
}

/** Label tiap slide untuk pembaca layar: "1 dari 4" (bahasa lain lewat `of`). */
export function slideLabels(count: number, of: (i: number, n: number) => string = (i, n) => `${i} dari ${n}`): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => of(i + 1, count));
}

export function clampIndex(i: number, count: number): number {
  return count <= 0 ? 0 : Math.min(count - 1, Math.max(0, Math.round(i)));
}

/** Slide aktif dari posisi scroll: slide yang tepi kirinya paling dekat ke `scrollLeft`. */
export function activeIndex(scrollLeft: number, offsets: number[]): number {
  let best = 0;
  offsets.forEach((o, i) => {
    if (Math.abs(o - scrollLeft) < Math.abs(offsets[best] - scrollLeft)) best = i;
  });
  return best;
}
