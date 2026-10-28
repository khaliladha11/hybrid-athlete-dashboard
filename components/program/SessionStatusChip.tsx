import type { SessionResult } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";

const DAY = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const dayOf = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`));
const CHIP = "inline-flex h-[22px] shrink-0 items-center rounded-full px-[9px] font-mono text-[11px] font-medium tracking-[0.08em] uppercase";

/**
 * Label & warna status sesi (0.14.3, model mingguan). Terpenuhi = oranye lembut dengan hari aslinya
 * ("dipenuhi Rabu"); belum = netral, tanpa merah.
 */
export function statusLabel(_s: PlannedSession, r: SessionResult | undefined): { text: string; className: string } | null {
  switch (r?.status) {
    case "terpenuhi":
      return { text: r.actualDate ? `Dipenuhi ${dayOf(r.actualDate)}` : "Terpenuhi", className: "bg-brand-soft text-brand-ink" };
    case "sebagian":
      return { text: r.actualDate ? `Sebagian, ${dayOf(r.actualDate)}` : "Sebagian", className: "bg-subtle-strong text-ink" };
    case "dilewati":
      return { text: "Dilewati", className: "bg-subtle text-faint" };
    case "belum":
      return { text: "Belum", className: "border border-line-strong text-muted" };
    default:
      return null;
  }
}

export function SessionStatusChip({ session, result }: { session: PlannedSession; result: SessionResult | undefined }) {
  const label = statusLabel(session, result);
  if (!label) return null;
  return <span className={`${CHIP} ${label.className}`}>{label.text}</span>;
}

/** Catatan kecil di bawah sesi (mis. easy yang dikerjakan berat). */
export function sessionNote(r: SessionResult | undefined): string | null {
  if (r?.note === "lebih-berat") return "Dikerjakan lebih berat dari rencana";
  if (r?.logDate) return "Tercatat dari log Strength";
  if (r?.stSessionId) return "Tercatat dari mode latihan";
  return null;
}
