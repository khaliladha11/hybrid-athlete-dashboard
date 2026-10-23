import type { SyncMeta } from "@/lib/sync/engine";

/** Batas "belum terkirim" sebelum titik status muncul di AppBar (docs/SYNC.md §7). */
export const PENDING_ALERT_MS = 10 * 60 * 1000;

export function formatAgo(iso: string | undefined, nowMs: number): string {
  if (!iso) return "belum pernah";
  const min = Math.floor((nowMs - Date.parse(iso)) / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export type StatusView = { label: string; tone: "success" | "danger" | "neutral" };

export function statusView(m: SyncMeta, nowMs: number): StatusView {
  switch (m.state) {
    case "off":
      return { label: "Tidak aktif", tone: "neutral" };
    case "pending":
      return { label: "Belum terkirim", tone: "danger" };
    case "conflict":
      return { label: "Konflik", tone: "danger" };
    default:
      return { label: `Tersinkron · ${formatAgo(m.lastSyncAt, nowMs)}`, tone: "success" };
  }
}

/** Titik di AppBar hanya bila ada masalah: konflik, atau belum terkirim lebih dari 10 menit. */
export function needsAttention(m: SyncMeta, nowMs: number): boolean {
  if (m.state === "conflict") return true;
  return m.state === "pending" && !!m.pendingSince && nowMs - Date.parse(m.pendingSince) > PENDING_ALERT_MS;
}
