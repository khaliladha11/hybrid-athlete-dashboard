"use client";

import Link from "next/link";
import { useResolvedTheme, useThemePreference } from "@/lib/preferences";

/** Bilah atas: titik oranye + wordmark, dan sakelar tema terang/gelap (tersimpan di perangkat). */
export function AppBar() {
  return (
    <header className="safe-x mx-auto flex w-full max-w-xl items-center justify-between pt-3">
      <Link href="/" className="pressable flex min-h-11 items-center gap-2 rounded-control pr-2" aria-label="Beranda Hybrid Athlete">
        {/* Identitas: titik oranye + wordmark Display, tanpa logo grafis. */}
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
        <span className="t-display-sm pb-0 text-[15px] leading-none">Hybrid Athlete</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}

export function ThemeToggle() {
  const [, setTheme] = useThemePreference();
  const resolved = useResolvedTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
      title={next === "dark" ? "Mode gelap" : "Mode terang"}
      className="pressable grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface text-ink hover:bg-subtle"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {resolved === "dark" ? (
          // Sedang gelap → tampilkan matahari (ke terang)
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  );
}
