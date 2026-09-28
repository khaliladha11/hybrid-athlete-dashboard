export function OutputShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" aria-live="polite">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="tabular mb-3 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      {children}
    </section>
  );
}

/** Tombol aksi menempel di atas bottom nav supaya mudah dijangkau jempol. */
export function GeneratorActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky z-10 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white/90 p-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90"
      style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </div>
  );
}
