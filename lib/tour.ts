/** Tur in-app setelah onboarding (docs/ONBOARDING.md §4 Tur). Murni: langkah & posisi popover. */

export interface TourStep {
  id: string;
  /** Halaman tempat elemen sorotan berada. */
  route: string;
  /** Nilai `data-tour` yang dicari, berurutan; yang pertama ditemukan dipakai. */
  targets: string[];
  title: string;
  body: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "saran",
    route: "/",
    targets: ["saran"],
    title: "Saran hari ini",
    body: "Kesiapanmu hari ini dari tidur, HRV, dan beban latihan. Saran yang sama bisa dipakai langsung di generator Lari dan Strength.",
  },
  {
    id: "run",
    route: "/run",
    targets: ["run-generator"],
    title: "Generator lari",
    body: "Pilih durasi dan kesulitan, sesi tersusun sendiri. Copy Set menyalin langkahnya untuk jam; Variasi lain memberi susunan berbeda.",
  },
  {
    id: "strength",
    route: "/strength",
    targets: ["strength-log", "strength-generator"],
    title: "Strength & gerakan ★",
    body: "Sesi disusun dari alat dan gerakan aktifmu. Setelah latihan, catat beban gerakan ★ supaya beban minggu berikutnya bisa dihitung.",
  },
  {
    id: "program",
    route: "/program",
    targets: ["program-target"],
    title: "Program target",
    body: "Pilih 5K, 10K, HM, atau FM, target waktu, dan tanggal mulai. Program mingguan disusun dari sini.",
  },
  {
    id: "backup",
    route: "/setting",
    targets: ["data-backup"],
    title: "Data & cadangan",
    body: "Semua data hanya ada di perangkat ini. Ekspor JSON secara berkala dan impor di HP baru. Tur ini bisa diulang dari Setting › Tampilan.",
  },
];

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** Safe area (notch, home indicator). */
  insetTop?: number;
  insetBottom?: number;
}

export type PopoverSide = "top" | "bottom" | "center";

/**
 * Posisi popover tur: di bawah elemen bila muat, lalu di atas, lalu menempel di sisi yang lebih lega
 * (menumpuk elemen tinggi). Tanpa elemen → tengah layar. Selalu dijepit ke viewport & safe area.
 */
export function placePopover(
  target: Rect | null,
  viewport: Viewport,
  size: { width: number; height: number },
  { gap = 12, margin = 16 } = {},
): { top: number; left: number; width: number; side: PopoverSide } {
  const width = Math.max(0, Math.min(size.width, viewport.width - 2 * margin));
  const minY = (viewport.insetTop ?? 0) + margin;
  const maxY = viewport.height - (viewport.insetBottom ?? 0) - margin;
  const clampY = (y: number) => Math.max(minY, Math.min(y, maxY - size.height));
  const clampX = (x: number) => Math.max(margin, Math.min(x, viewport.width - margin - width));

  if (!target) return { top: clampY((viewport.height - size.height) / 2), left: clampX((viewport.width - width) / 2), width, side: "center" };

  const left = clampX(target.left + target.width / 2 - width / 2);
  const below = target.top + target.height + gap;
  if (below + size.height <= maxY) return { top: below, left, width, side: "bottom" };
  const above = target.top - gap - size.height;
  if (above >= minY) return { top: above, left, width, side: "top" };

  // Tidak muat di atas maupun bawah: tempel ke sisi yang lebih lega.
  const roomBelow = maxY - (target.top + target.height);
  const roomAbove = target.top - minY;
  return roomBelow >= roomAbove
    ? { top: clampY(maxY - size.height), left, width, side: "bottom" }
    : { top: clampY(minY), left, width, side: "top" };
}

/** Lubang spotlight: elemen + padding, dipotong ke viewport. Null bila elemen di luar layar. */
export function holeRect(target: Rect, viewport: Viewport, pad = 8): Rect | null {
  const top = Math.max(0, target.top - pad);
  const left = Math.max(0, target.left - pad);
  const bottom = Math.min(viewport.height, target.top + target.height + pad);
  const right = Math.min(viewport.width, target.left + target.width + pad);
  return bottom > top && right > left ? { top, left, width: right - left, height: bottom - top } : null;
}
