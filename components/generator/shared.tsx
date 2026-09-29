"use client";

import type { Ref } from "react";
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
      className="scroll-mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      aria-live="polite"
    >
      <div key={swapKey} className="swap-in">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="tabular mb-3 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
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
  regenerateClassName,
}: {
  copyText: string;
  copyLabel: string;
  onRegenerate: () => void;
  canRegenerate: boolean;
  regenerateClassName: string;
}) {
  return (
    <div
      className="sticky z-10 rounded-2xl border border-zinc-200 bg-white/90 p-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90"
      style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="grid grid-cols-2 gap-2">
        <CopyButton
          text={copyText}
          label={copyLabel}
          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        />
        <button
          type="button"
          onClick={onRegenerate}
          disabled={!canRegenerate}
          className={`pressable min-h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 ${regenerateClassName}`}
        >
          {canRegenerate ? "↻ Generate ulang" : "Pola baku"}
        </button>
      </div>
      {!canRegenerate && (
        <p className="px-1 pt-1.5 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
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
