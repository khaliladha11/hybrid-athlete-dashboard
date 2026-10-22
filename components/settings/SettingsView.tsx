"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveProfile } from "@/lib/athlete-settings";
import { baseProfile } from "@/lib/profile";
import { useAthleteSettings } from "@/lib/settings-store";
import { ConditionsSettings } from "./ConditionsSettings";
import { DataBackupCard } from "./DataBackupCard";
import { EquipmentSettings } from "./EquipmentSettings";
import { MovementSettings } from "./MovementSettings";
import { PreferencesCard } from "./PreferencesCard";
import { ProfileSettings } from "./ProfileSettings";
import { RunZonesSettings } from "./RunZonesSettings";

const SECTIONS = [
  ["profil", "Profil"],
  ["kondisi", "Kondisi"],
  ["zona", "Zona lari"],
  ["alat", "Alat"],
  ["gerakan", "Gerakan"],
  ["tampilan", "Tampilan"],
  ["data", "Data"],
] as const;
type SectionId = (typeof SECTIONS)[number][0];

const FLASH_MS = 1300;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Jalankan `done` setelah scroll selesai: event `scrollend` bila didukung, selain itu posisi stabil ±120 ms. Maks 3 detik (scroll jauh bisa lama). */
function afterScroll(done: () => void) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener("scrollend", finish);
    clearTimeout(cap);
    done();
  };
  const cap = window.setTimeout(finish, 3000);
  // Cek lewat salinan bertipe Window supaya `window` tidak dipersempit jadi never oleh TS.
  const w: Window = window;
  if ("onscrollend" in w) {
    window.addEventListener("scrollend", finish, { once: true });
    return;
  }
  let y = window.scrollY;
  const poll = () => {
    if (finished) return;
    if (window.scrollY === y) finish();
    else {
      y = window.scrollY;
      window.setTimeout(poll, 120);
    }
  };
  window.setTimeout(poll, 120);
}

/** Apakah scroll ke `el` (dengan scroll-margin) benar-benar akan menggeser halaman? */
function needsScroll(el: HTMLElement): boolean {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.min(max, Math.max(0, window.scrollY + el.getBoundingClientRect().top - margin));
  return Math.abs(target - window.scrollY) > 2;
}

export function SettingsView() {
  const [settings, save] = useAthleteSettings();
  const resolved = useMemo(() => resolveProfile(baseProfile, settings), [settings]);
  const [active, setActive] = useState<SectionId>("kondisi");
  const [flash, setFlash] = useState<{ id: SectionId; key: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const jumping = useRef(false);

  // Scroll spy: section aktif = yang terakhir melewati bawah nav sticky; di dasar halaman = section terakhir.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (jumping.current) return;
      const navBottom = (navRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let current: SectionId = SECTIONS[0][0];
      for (const [id] of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= navBottom) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = SECTIONS[SECTIONS.length - 1][0];
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Chip aktif selalu terlihat di nav yang bisa digeser horizontal.
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!nav || !chip) return;
    const left = chip.offsetLeft - 16;
    const right = chip.offsetLeft + chip.offsetWidth + 16 - nav.clientWidth;
    if (nav.scrollLeft > left) nav.scrollTo({ left, behavior: reducedMotion() ? "auto" : "smooth" });
    else if (nav.scrollLeft < right) nav.scrollTo({ left: right, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [active]);

  // Hapus highlight setelah animasinya selesai.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const jumpTo = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    jumping.current = true;
    setActive(id);
    history.replaceState(null, "", `#${id}`);
    const arrived = () => {
      jumping.current = false;
      setFlash({ id, key: Date.now() });
    };
    if (!needsScroll(el)) return arrived();
    el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    afterScroll(arrived);
  }, []);

  // Highlight = overlay terpisah (key baru tiap lompatan) supaya animasi bisa diulang
  // tanpa me-remount kartu — isian yang sedang diketik tidak hilang.
  const section = (id: SectionId, children: React.ReactNode) => (
    <div id={id} className="relative scroll-mt-[calc(env(safe-area-inset-top)+4.25rem)]">
      {children}
      {flash?.id === id && <span key={flash.key} aria-hidden className="section-flash" />}
    </div>
  );

  return (
    <div className="space-y-4">
      <nav
        ref={navRef}
        aria-label="Bagian setting"
        className="sticky top-[env(safe-area-inset-top)] z-10 -mx-4 overflow-x-auto bg-bg/95 px-4 py-2 backdrop-blur [scrollbar-width:none]"
      >
        <ul className="flex gap-2">
          {SECTIONS.map(([id, label]) => {
            const on = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  data-section={id}
                  aria-current={on ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    jumpTo(id);
                  }}
                  className={`pressable inline-flex min-h-9 items-center rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap ${
                    on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface text-ink hover:bg-subtle"
                  }`}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      {section("profil", <ProfileSettings settings={settings} onChange={save} />)}
      {section("kondisi", <ConditionsSettings settings={settings} onChange={save} warnings={resolved.warnings} />)}
      {section("zona", <RunZonesSettings settings={settings} onChange={save} />)}
      {section("alat", <EquipmentSettings settings={settings} onChange={save} />)}
      {section("gerakan", <MovementSettings settings={settings} onChange={save} resolved={resolved} />)}
      {section("tampilan", <PreferencesCard />)}
      {section("data", <DataBackupCard />)}
    </div>
  );
}
