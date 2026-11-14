import type { SyncMeta } from "@/lib/sync/engine";
import { dict } from "@/lib/i18n/dict";
import { formatInstant } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";

export const SYNC_STATUS = dict(
  {
    never: "belum pernah",
    justNow: "baru saja",
    minutes: (n: number) => `${n} menit lalu`,
    hours: (n: number) => `${n} jam lalu`,
    off: "Tidak aktif",
    pending: "Belum terkirim",
    conflict: "Konflik",
    synced: (ago: string) => `Tersinkron · ${ago}`,
    alertConflict: "Sinkron konflik. Buka Setting",
    alertPending: "Ada perubahan yang belum terkirim. Buka Setting",
  },
  {
    never: "never",
    justNow: "just now",
    minutes: (n) => `${n} min ago`,
    hours: (n) => `${n} h ago`,
    off: "Off",
    pending: "Not sent yet",
    conflict: "Conflict",
    synced: (ago) => `Synced · ${ago}`,
    alertConflict: "Sync conflict. Open Settings",
    alertPending: "Some changes are not sent yet. Open Settings",
  },
);

/** Batas "belum terkirim" sebelum titik status muncul di AppBar (docs/SYNC.md §7). */
export const PENDING_ALERT_MS = 10 * 60 * 1000;

export function formatAgo(iso: string | undefined, nowMs: number, locale: Locale = "id"): string {
  const t = SYNC_STATUS[locale];
  if (!iso) return t.never;
  const min = Math.floor((nowMs - Date.parse(iso)) / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutes(min);
  const h = Math.floor(min / 60);
  if (h < 24) return t.hours(h);
  return formatInstant(locale, iso, { day: "numeric", month: "short" });
}

export type StatusView = { label: string; tone: "success" | "danger" | "neutral" };

export function statusView(m: SyncMeta, nowMs: number, locale: Locale = "id"): StatusView {
  const t = SYNC_STATUS[locale];
  switch (m.state) {
    case "off":
      return { label: t.off, tone: "neutral" };
    case "pending":
      return { label: t.pending, tone: "danger" };
    case "conflict":
      return { label: t.conflict, tone: "danger" };
    default:
      return { label: t.synced(formatAgo(m.lastSyncAt, nowMs, locale)), tone: "success" };
  }
}

/** Titik di AppBar hanya bila ada masalah: konflik, atau belum terkirim lebih dari 10 menit. */
export function needsAttention(m: SyncMeta, nowMs: number): boolean {
  if (m.state === "conflict") return true;
  return m.state === "pending" && !!m.pendingSince && nowMs - Date.parse(m.pendingSince) > PENDING_ALERT_MS;
}
