"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { completeTour } from "@/lib/onboarding";
import { useOnboardingState } from "@/lib/onboarding-store";
import { TOUR_STEPS, holeRect, placePopover, type Rect } from "@/lib/tour";

const REDUCED = "(prefers-reduced-motion: reduce)";
/** Durasi fade keluar (lebih cepat dari masuk 180ms, DESIGN-SYSTEM §5). */
const EXIT_MS = 120;
/** Batas menunggu elemen sorotan muncul setelah pindah tab. Lewat dari ini → popover di tengah tanpa lubang. */
const FIND_TIMEOUT_MS = 3000;

const TourContext = createContext<{ start: () => void; active: boolean }>({ start: () => {}, active: false });
export const useTour = () => useContext(TourContext);

/**
 * Tur in-app (docs/ONBOARDING.md §4). State hanya di memori: bertahan saat pindah tab (layout tidak
 * di-mount ulang), berakhir saat reload. Selesai atau dilewati → `tourCompletedAt`.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [onboarding, saveOnboarding] = useOnboardingState();
  const returnFocus = useRef<HTMLElement | null>(null);

  const start = useCallback(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setClosing(false);
    setIndex(0);
  }, []);

  const end = useCallback(() => {
    if (onboarding) saveOnboarding(completeTour(onboarding, new Date().toISOString()));
    setClosing(true);
    window.setTimeout(() => {
      setIndex(null);
      setClosing(false);
      const el = returnFocus.current;
      if (el?.isConnected) el.focus({ preventScroll: true });
    }, EXIT_MS);
  }, [onboarding, saveOnboarding]);

  const value = useMemo(() => ({ start, active: index !== null }), [start, index]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {index !== null && (
        <TourLayer
          index={index}
          closing={closing}
          onBack={() => setIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => (index + 1 < TOUR_STEPS.length ? setIndex(index + 1) : end())}
          onSkip={end}
        />
      )}
    </TourContext.Provider>
  );
}

function TourLayer({ index, closing, onBack, onNext, onSkip }: { index: number; closing: boolean; onBack: () => void; onNext: () => void; onSkip: () => void }) {
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const router = useRouter();
  const pathname = usePathname();
  const popRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Elemen sorotan: undefined = masih dicari, null = tidak ditemukan (popover di tengah).
  const [target, setTarget] = useState<{ index: number; el: HTMLElement | null } | undefined>();
  const found = target?.index === index ? target : undefined;

  // Pindah tab bila perlu, lalu tunggu elemen `data-tour` muncul dengan ukuran nyata.
  useEffect(() => {
    if (pathname !== step.route) {
      router.push(step.route);
      return;
    }
    const reduce = window.matchMedia(REDUCED).matches;
    const t0 = performance.now();
    let raf = 0;
    const look = () => {
      const el = step.targets
        .map((t) => document.querySelector<HTMLElement>(`[data-tour="${t}"]`))
        .find((e) => e && e.getBoundingClientRect().height > 0);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: reduce ? "instant" : "smooth" });
        setTarget({ index, el });
      } else if (performance.now() - t0 > FIND_TIMEOUT_MS) {
        setTarget({ index, el: null });
      } else raf = requestAnimationFrame(look);
    };
    raf = requestAnimationFrame(look);
    return () => cancelAnimationFrame(raf);
  }, [index, pathname, step, router]);

  // Ukuran layar & posisi elemen, diperbarui saat scroll, resize, atau elemen berubah ukuran.
  const [layout, setLayout] = useState<{ rect: Rect | null; vw: number; vh: number; insetTop: number; insetBottom: number } | null>(null);
  const [popSize, setPopSize] = useState({ width: 360, height: 220 });
  useLayoutEffect(() => {
    if (!found) return;
    const insets = readSafeArea();
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = found.el?.getBoundingClientRect();
        setLayout({
          rect: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null,
          vw: window.innerWidth,
          vh: window.innerHeight,
          ...insets,
        });
        if (popRef.current) setPopSize({ width: 360, height: popRef.current.offsetHeight });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (found.el) ro.observe(found.el);
    if (popRef.current) ro.observe(popRef.current);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [found]);

  const ready = !!found && !!layout;
  const view = layout && { width: layout.vw, height: layout.vh, insetTop: layout.insetTop, insetBottom: layout.insetBottom };
  const hole = ready && layout.rect && view ? holeRect(layout.rect, view) : null;
  const pos = ready && view ? placePopover(hole, view, popSize) : null;

  // Fokus ke tombol utama tiap sorotan siap (pembaca layar membaca judul & isi lewat aria).
  useEffect(() => {
    if (ready) primaryRef.current?.focus({ preventScroll: true });
  }, [ready, index]);

  // Escape menutup; Tab berputar di dalam popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
        return;
      }
      if (e.key !== "Tab" || !popRef.current) return;
      const items = [...popRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      if (!items.length) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      const inside = popRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && (document.activeElement === lastItem || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const originX = pos && hole ? Math.max(0, Math.min(pos.width, hole.left + hole.width / 2 - pos.left)) : null;
  const origin = !pos || pos.side === "center" || originX === null ? "center" : `${originX}px ${pos.side === "bottom" ? "top" : "bottom"}`;

  return (
    <div className="tour-layer fixed inset-0 z-50" data-closing={closing || undefined}>
      {/* Lapisan gelap: lubang = elemen sorotan; tanpa elemen → gelap penuh. Menahan klik ke halaman. */}
      {hole ? (
        <div
          aria-hidden
          className="tour-hole absolute rounded-card"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      ) : (
        <div aria-hidden className="tour-dim absolute inset-0" />
      )}
      <div
        ref={popRef}
        key={index}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={`absolute rounded-card border border-line-strong bg-surface-raised p-4 text-ink shadow-card ${pos ? "tour-pop" : "invisible"}`}
        style={{ top: pos?.top ?? 0, left: pos?.left ?? 16, width: pos?.width ?? popSize.width, transformOrigin: origin }}
      >
        <p className="t-label">
          Tur · {index + 1}/{TOUR_STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-2 text-[17px] leading-snug font-semibold">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-body text-muted">
          {step.body}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={onSkip} className={`${BUTTON.base} ${BUTTON.ghost} mr-auto px-3 text-body text-muted`}>
            Lewati tur
          </button>
          {index > 0 && (
            <button type="button" onClick={onBack} className={`${BUTTON.base} ${BUTTON.secondary} px-3 text-body`}>
              Kembali
            </button>
          )}
          <button ref={primaryRef} type="button" onClick={onNext} className={`${BUTTON.base} ${BUTTON.primary} px-4 text-body`}>
            {last ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Safe area dari CSS env() (notch & home indicator) lewat elemen ukur sementara. */
function readSafeArea(): { insetTop: number; insetBottom: number } {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = { insetTop: parseFloat(cs.paddingTop) || 0, insetBottom: parseFloat(cs.paddingBottom) || 0 };
  probe.remove();
  return out;
}
