"use client";

import Link from "next/link";
import { SyncAlert } from "@/components/sync/SyncAlert";
import { LogoMark } from "@/components/ui/LogoMark";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/client";
import { CHROME } from "@/lib/i18n/messages/chrome";
import { useResolvedTheme, useThemePreference } from "@/lib/preferences";

/** Bilah atas: logo "Forward H" + wordmark, sakelar bahasa ID/EN (1.2.0), dan sakelar tema terang/gelap. */
export function AppBar() {
  const t = useT(CHROME).appBar;
  return (
    <header className="safe-x mx-auto flex w-full max-w-xl items-center justify-between pt-3">
      <Link href="/" className="pressable flex min-h-11 items-center gap-2 rounded-control pr-2" aria-label={t.home}>
        {/* Identitas: LogoMark (dekoratif, link sudah punya aria-label) + wordmark Display. Lihat docs/brand/LOGO.md. */}
        <LogoMark size={22} className="text-ink" />
        <span className="t-display-sm pb-0 text-[15px] leading-none">Hybrid Athlete</span>
      </Link>
      <div className="flex items-center gap-1">
        <SyncAlert />
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

/**
 * Sakelar bahasa (1.2.0): satu tap langsung ganti, tanpa animasi (bisa sering dipakai). Teks tombol = bahasa yang
 * sedang aktif; label aksesibel memuat teks itu lalu menyebut hasilnya.
 */
export function LanguageToggle() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT(CHROME).appBar;
  const next = locale === "id" ? "en" : "id";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      // Nama aksesibel diawali teks yang terlihat (WCAG 2.5.3 label in name), lalu hasil tombol.
      aria-label={`ID/EN · ${next === "en" ? t.toEnglish : t.toIndonesian}`}
      title={next === "en" ? t.toEnglish : t.toIndonesian}
      data-testid="language-toggle"
      className="pressable inline-flex h-11 min-w-11 items-center gap-1 rounded-full border border-line-strong bg-surface px-3 font-mono text-[12px] tracking-[0.08em] hover:bg-subtle"
    >
      {/* Bahasa aktif tebal + ink, yang lain muted (kontras AA); arti tidak hanya dari warna. */}
      <span aria-hidden className={locale === "id" ? "font-semibold text-ink" : "text-muted"}>
        ID
      </span>
      <span aria-hidden className="text-muted">
        /
      </span>
      <span aria-hidden className={locale === "en" ? "font-semibold text-ink" : "text-muted"}>
        EN
      </span>
    </button>
  );
}

export function ThemeToggle() {
  const t = useT(CHROME).appBar;
  const [, setTheme] = useThemePreference();
  const resolved = useResolvedTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? t.toDark : t.toLight}
      title={next === "dark" ? t.darkTitle : t.lightTitle}
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
