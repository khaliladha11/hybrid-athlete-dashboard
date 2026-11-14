"use client";

import { useRef, useState, type ReactNode } from "react";
import { activeIndex, carouselMode, clampIndex, slideLabels } from "@/lib/carousel";

/**
 * Carousel info kecil (1.1.0): CSS scroll-snap tanpa library. Kartu berikutnya mengintip supaya terlihat bisa digeser,
 * titik indikator, dan tombol ‹ › untuk keyboard/desktop. Satu item = satu kartu biasa; nol item = tidak tampil.
 * Reduced motion: tombol melompat tanpa scroll halus.
 */
export function InfoCarousel({ label, items }: { label: string; items: { key: string; content: ReactNode }[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const mode = carouselMode(items.length);
  if (mode === "none") return null;
  if (mode === "single") return <div className={`${SLIDE} mt-4`}>{items[0].content}</div>;

  const labels = slideLabels(items.length);
  const offsets = () => [...(track.current?.children ?? [])].map((c) => (c as HTMLElement).offsetLeft - (track.current?.offsetLeft ?? 0));
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const target = clampIndex(i, items.length);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: offsets()[target], behavior: reduce ? "auto" : "smooth" });
    setIndex(target);
  };

  return (
    <section aria-roledescription="carousel" aria-label={label} className="mt-4">
      <div
        ref={track}
        onScroll={(e) => setIndex(activeIndex(e.currentTarget.scrollLeft, offsets()))}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto overscroll-x-contain px-5"
      >
        {items.map((it, i) => (
          <div key={it.key} role="group" aria-roledescription="slide" aria-label={labels[i]} className={`${SLIDE} w-[85%] shrink-0 snap-start`}>
            {it.content}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          {items.map((it, i) => (
            <span key={it.key} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-brand" : "bg-line-strong"}`} />
          ))}
        </div>
        <div className="flex items-center">
          <ArrowButton label="Info sebelumnya" disabled={index === 0} onClick={() => go(index - 1)}>
            ‹
          </ArrowButton>
          <ArrowButton label="Info berikutnya" disabled={index === items.length - 1} onClick={() => go(index + 1)}>
            ›
          </ArrowButton>
        </div>
      </div>
    </section>
  );
}

const SLIDE = "rounded-inner bg-subtle px-3 py-2.5 text-[13px] leading-snug text-muted";

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable inline-flex h-11 w-11 items-center justify-center rounded-control text-[18px] text-ink hover:bg-subtle disabled:text-faint disabled:hover:bg-transparent"
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}
