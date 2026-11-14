import type { SessionResult } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";
import { useLocale } from "@/lib/i18n/client";
import { formatDay, WEEKDAY_LONG } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { PROGRAM } from "@/lib/i18n/messages/program";

const dayOf = (d: string, l: Locale) => formatDay(l, d, WEEKDAY_LONG);
const CHIP = "inline-flex h-[22px] shrink-0 items-center rounded-full px-[9px] font-mono text-[11px] font-medium tracking-[0.08em] uppercase";

/**
 * Label & warna status sesi (0.14.3, model mingguan). Terpenuhi = oranye lembut dengan hari aslinya
 * ("dipenuhi Rabu"); belum = netral, tanpa merah.
 */
export function statusLabel(_s: PlannedSession, r: SessionResult | undefined, locale: Locale = "id"): { text: string; className: string } | null {
  const t = PROGRAM[locale].status;
  switch (r?.status) {
    case "terpenuhi":
      return { text: r.actualDate ? t.fulfilledOn(dayOf(r.actualDate, locale)) : t.fulfilled, className: "bg-brand-soft text-brand-ink" };
    case "sebagian":
      return { text: r.actualDate ? t.partialOn(dayOf(r.actualDate, locale)) : t.partial, className: "bg-subtle-strong text-ink" };
    case "dilewati":
      return { text: t.skipped, className: "bg-subtle text-faint" };
    case "belum":
      return { text: t.open, className: "border border-line-strong text-muted" };
    default:
      return null;
  }
}

export function SessionStatusChip({ session, result }: { session: PlannedSession; result: SessionResult | undefined }) {
  const label = statusLabel(session, result, useLocale());
  if (!label) return null;
  return <span className={`${CHIP} ${label.className}`}>{label.text}</span>;
}

/** Catatan kecil di bawah sesi (mis. easy yang dikerjakan berat). */
export function sessionNote(r: SessionResult | undefined, locale: Locale = "id"): string | null {
  const t = PROGRAM[locale].status;
  if (r?.note === "lebih-berat") return t.harder;
  if (r?.logDate) return t.fromLog;
  if (r?.stSessionId) return t.fromSession;
  return null;
}
