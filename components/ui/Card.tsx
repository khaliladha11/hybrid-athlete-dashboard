/**
 * Kartu "Tag": surface, garis rambut `line`, radius 20, padding 20. Tanpa bayangan di gelap
 * (elevasi dari tone), bayangan tipis bertint di terang. Pemisah di dalam kartu = garis rambut.
 *
 * `tone="tag"` untuk kartu ringkasan utama: label mono dengan titik oranye di kiri atas
 * (`kicker`), judul Display M, lalu isi (biasanya StatRow).
 */
export function Card({
  title,
  action,
  children,
  className = "",
  flush = false,
  tone = "default",
  kicker,
  tour,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Isi (mis. list) menempel ke tepi kiri/kanan kartu; judul tetap ber-padding. */
  flush?: boolean;
  tone?: "default" | "tag";
  /** Label mono kecil dengan titik oranye, mis. "EASY RUN". */
  kicker?: string;
  /** Sasaran tur in-app (`data-tour`). */
  tour?: string;
}) {
  const padX = flush ? "px-5" : "";
  return (
    <section data-tour={tour} className={`rounded-card border border-line bg-surface shadow-card ${flush ? "py-5" : "p-5"} ${className}`}>
      {tone === "tag" ? (
        (kicker || action || title) && (
          <header className={`mb-5 ${padX}`}>
            {(kicker || action) && (
              <div className="flex items-center justify-between gap-2">
                {kicker ? <Kicker>{kicker}</Kicker> : <span />}
                {action}
              </div>
            )}
            {title && <h2 className={`t-display-sm text-brand-ink ${kicker || action ? "mt-3" : ""}`}>{title}</h2>}
          </header>
        )
      ) : (
        (title || action || kicker) && (
          <header className={`mb-4 ${padX}`}>
            {kicker && <Kicker className="mb-2">{kicker}</Kicker>}
            {(title || action) && (
              <div className="flex items-center justify-between gap-2">
                {title && <h2 className="text-base font-semibold">{title}</h2>}
                {action}
              </div>
            )}
          </header>
        )
      )}
      {children}
    </section>
  );
}

/** Label mono dengan titik oranye 10px (penanda kartu tag). */
export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`t-label inline-flex items-center gap-2 text-ink ${className}`}>
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
      {children}
    </span>
  );
}

/** Nilai kosong ditulis "·" warna faint, bukan em dash. */
const isEmpty = (v: React.ReactNode) => v === undefined || v === null || v === "" || v === "—";

/** Satu statistik: label mono → angka tabular → satuan mono. */
export function Stat({ label, value, sub, muted }: { label: string; value: React.ReactNode; sub?: React.ReactNode; muted?: boolean }) {
  const empty = isEmpty(value);
  return (
    <div className="grid min-w-0 gap-1">
      <span className="t-label truncate">{label}</span>
      <span className={`t-stat truncate ${muted || empty ? "text-faint" : "text-ink"}`}>{empty ? "·" : value}</span>
      {sub && <span className="t-label truncate">{sub}</span>}
    </div>
  );
}

export interface StatItem {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  muted?: boolean;
}

/**
 * Baris statistik dibagi garis rambut vertikal. Maksimal `cols` kolom per baris (3 untuk 375px);
 * baris berikutnya dipisah garis horizontal.
 */
export function StatRow({ items, cols = 3, className = "" }: { items: StatItem[]; cols?: 2 | 3 | 4; className?: string }) {
  const rows: StatItem[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  const grid = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];
  return (
    <div className={className}>
      {rows.map((row, r) => (
        <div key={r} className={`grid ${grid} ${r > 0 ? "mt-4 border-t border-line pt-4" : ""}`}>
          {row.map((it, c) => (
            <div key={it.label} className={`min-w-0 ${c > 0 ? "border-l border-line pl-3" : ""} ${c < row.length - 1 ? "pr-3" : ""}`}>
              <Stat label={it.label} value={it.value} sub={it.unit} muted={it.muted} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Chip: Geist Mono 11px UPPERCASE, pill 22px. */
export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "warn" }) {
  const tones = {
    neutral: "bg-subtle-strong text-ink",
    accent: "bg-brand-soft text-brand-ink",
    warn: "bg-brand-soft text-brand-ink",
  };
  return (
    <span className={`inline-flex h-[22px] items-center rounded-full px-[9px] font-mono text-[11px] font-medium tracking-[0.08em] uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}

/**
 * Tombol standar: primary (oranye, teks gelap on-brand), secondary (garis), ghost (tanpa garis),
 * inverse. `lg` untuk CTA utama 48px.
 */
export const BUTTON = {
  base: "pressable inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-4 text-base font-semibold disabled:cursor-not-allowed",
  lg: "min-h-12",
  primary: "bg-brand text-on-brand hover:bg-brand-hover disabled:bg-subtle-strong disabled:text-faint",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-subtle disabled:text-faint",
  ghost: "bg-transparent text-ink hover:bg-subtle disabled:text-faint",
  inverse: "bg-inverse text-on-inverse hover:opacity-90",
} as const;
