"use client";

import type { Ref } from "react";
import { BUTTON } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";

export function OutputShell({
  title,
  subtitle,
  swapKey,
  ref,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Berubah setiap hasil generate berubah → konten memudar masuk (lihat .swap-in). */
  swapKey: string;
  ref?: Ref<HTMLElement>;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={ref}
      className="scroll-mt-4 rounded-sm border border-line bg-surface p-4 shadow-card"
      aria-live="polite"
    >
      <div key={swapKey} className="swap-in">
        <h2 className="text-lg leading-snug font-semibold">{title}</h2>
        {subtitle && <p className="tabular mt-0.5 mb-4 text-[13px] text-muted">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

/** Tombol aksi menempel di atas bottom nav supaya mudah dijangkau jempol. */
export function GeneratorActions({
  copyText,
  copyLabel,
  onRegenerate,
  canRegenerate,
}: {
  copyText: string;
  copyLabel: string;
  onRegenerate: () => void;
  canRegenerate: boolean;
}) {
  return (
    <div
      className="sticky z-10 rounded-sm border border-line bg-surface/95 p-2 shadow-card backdrop-blur"
      style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="grid grid-cols-2 gap-2">
        <CopyButton
          text={copyText}
          label={copyLabel}
          className={`${BUTTON.secondary} whitespace-nowrap px-3 text-body`}
        />
        <button
          type="button"
          onClick={onRegenerate}
          disabled={!canRegenerate}
          className={`pressable inline-flex min-h-11 items-center justify-center rounded-sm px-3 text-body font-semibold whitespace-nowrap disabled:cursor-not-allowed ${BUTTON.primary}`}
        >
          {canRegenerate ? "↻ Variasi lain" : "Pola baku"}
        </button>
      </div>
      {!canRegenerate && (
        <p className="px-1 pt-2 text-center text-[12px] text-muted">
          Kombinasi ini hanya punya satu pola. Ganti durasi/kesulitan untuk variasi lain.
        </p>
      )}
    </div>
  );
}

/**
 * Setelah generate ulang, pastikan awal hasil terlihat: tombolnya menempel
 * di bawah, jadi judul output sering sudah tergulir ke atas layar.
 */
export function revealIfScrolledPast(el: HTMLElement | null) {
  if (!el || el.getBoundingClientRect().top >= 0) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
