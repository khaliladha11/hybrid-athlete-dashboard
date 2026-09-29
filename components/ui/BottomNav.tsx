"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Profil", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" },
  { href: "/run", label: "Lari", icon: "M13 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M9.5 21l2-6 3 2v4m-7-9 3-3 3 1 2 3 3 1" },
  { href: "/strength", label: "Strength", icon: "M3 10v4m3-6v8m0-4h12m0-4v8m3-6v4" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-3">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" || pathname.startsWith("/activity") : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? "text-accent-600 dark:text-accent-400" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
