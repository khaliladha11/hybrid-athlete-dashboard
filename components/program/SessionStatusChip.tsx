import type { SessionResult } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";

const DAY_SHORT = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const CHIP = "inline-flex h-[22px] shrink-0 items-center rounded-full px-[9px] font-mono text-[11px] font-medium tracking-[0.08em] uppercase";

/** Label & warna status sesi. Selesai = oranye (aturan "rencana = intensitas, selesai = oranye"). */
export function statusLabel(s: PlannedSession, r: SessionResult | undefined): { text: string; className: string } | null {
  switch (r?.status) {
    case "selesai":
      return { text: "Selesai", className: "bg-brand-soft text-brand-ink" };
    case "sebagian":
      return { text: "Sebagian", className: "bg-subtle-strong text-ink" };
    case "terlewat":
      return { text: "Terlewat", className: "bg-danger-soft text-danger-ink" };
    case "hari-ini":
      return { text: r.masihBisa ? "Masih bisa hari ini" : "Hari ini", className: "border border-line-strong text-ink" };
    case "digeser":
      return { text: `Digeser ke ${DAY_SHORT.format(new Date(`${s.date}T00:00:00Z`))}`, className: "bg-subtle-strong text-ink" };
    case "dilewati":
      return { text: "Dilewati", className: "bg-subtle text-faint" };
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
  return null;
}
