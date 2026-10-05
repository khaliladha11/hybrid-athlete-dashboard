"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Profil", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" },
  { href: "/run", label: "Lari", icon: "M13 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M9.5 21l2-6 3 2v4m-7-9 3-3 3 1 2 3 3 1" },
  { href: "/program", label: "Program", icon: "M5 21V4m0 0h12l-2.5 4L17 12H5" },
  { href: "/strength", label: "Strength", icon: "M3 10v4m3-6v8m0-4h12m0-4v8m3-6v4" },
  { href: "/log", label: "Log", icon: "M9 5h10M9 12h10M9 19h10M4.5 5h.01M4.5 12h.01M4.5 19h.01" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" || pathname.startsWith("/activity") : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`pressable relative flex flex-col items-center gap-0.5 py-2.5 text-[12px] ${
                  active ? "font-semibold text-brand-ink" : "text-muted hover:text-ink"
                }`}
              >
                {/* Indikator aktif: garis oranye di tepi atas. */}
                <span aria-hidden className={`absolute inset-x-4 top-0 h-[3px] rounded-b-sm ${active ? "bg-brand" : "bg-transparent"}`} />
                <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? "text-brand" : ""}`} fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
