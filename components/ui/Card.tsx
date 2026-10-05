/**
 * Kartu: permukaan putih, radius 4px, border nyaris tak terlihat + bayangan kartu.
 * Struktur dipisah oleh spasi, bukan garis.
 */
export function Card({
  title,
  action,
  children,
  className = "",
  flush = false,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Isi (mis. list) menempel ke tepi kiri/kanan kartu; judul tetap ber-padding. */
  flush?: boolean;
}) {
  return (
    <section className={`rounded-sm border border-line bg-surface shadow-card ${flush ? "py-4" : "p-4"} ${className}`}>
      {(title || action) && (
        <header className={`mb-3 flex items-center justify-between gap-2 ${flush ? "px-4" : ""}`}>
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Statistik: label kecil, angka tegas, satuan redup. */
export function Stat({ label, value, sub, muted }: { label: string; value: React.ReactNode; sub?: React.ReactNode; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-muted">{label}</div>
      <div className={`tabular truncate text-[22px] leading-tight font-semibold ${muted ? "text-faint" : "text-ink"}`}>{value}</div>
      {sub && <div className="truncate text-[12px] text-faint">{sub}</div>}
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "warn" }) {
  const tones = {
    neutral: "bg-subtle-strong text-ink",
    accent: "bg-brand-soft text-brand-ink",
    warn: "bg-brand-soft text-brand-ink",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Tombol standar design system: primary (oranye), secondary (garis), inverse (hitam). */
export const BUTTON = {
  base: "pressable inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-4 text-base font-semibold disabled:cursor-not-allowed",
  primary: "bg-brand text-on-brand hover:bg-brand-hover disabled:bg-subtle-strong disabled:text-faint",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-subtle",
  inverse: "bg-inverse text-on-inverse hover:opacity-90",
} as const;
