"use client";

import Link from "next/link";
import { useState } from "react";
import { suggestFor, type Advice, type AdviceTarget, type Suggestion } from "@/lib/coach";
import { DIFFICULTY_LABEL, type Difficulty, type Duration } from "@/lib/generator/types";

/**
 * Saran hari ini versi ringkas untuk halaman generator: satu baris ringkasan,
 * tombol "Gunakan" yang mengisi durasi & kesulitan, dan link ke detail di Profil.
 */
export function CoachStrip({
  advice,
  target,
  current,
  onApply,
}: {
  advice: Advice[];
  target: AdviceTarget;
  current: { difficulty: Difficulty; duration: Duration };
  onApply: (s: Suggestion) => void;
}) {
  // Sama seperti CoachCard: "turun satu level" tidak ditawarkan berantai.
  const [appliedLevel, setAppliedLevel] = useState<Difficulty | null>(null);
  const relevant = advice.filter((a) => a.targets.includes(target));
  if (!relevant.length) return null;

  const s = suggestFor(advice, target, current, { ignoreLowerBy: appliedLevel === current.difficulty });
  const actionable = !!(s.difficulty || s.duration);
  const difficulty = s.difficulty ?? current.difficulty;
  const duration = s.duration ?? current.duration;
  // Ringkas supaya muat satu baris di layar 360px: "Moderate · 30'".
  const summary = `${DIFFICULTY_LABEL[difficulty]} · ${duration}'`;
  const spoken = `${DIFFICULTY_LABEL[difficulty]} ${duration} menit`;

  return (
    <aside
      role="note"
      aria-label="Saran hari ini"
      title={relevant.map((a) => a.title).join(" · ")}
      className="flex min-h-12 items-center gap-1.5 rounded-card border border-line border-l-[3px] border-l-brand bg-surface py-1.5 pr-1.5 pl-2.5"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01" />
      </svg>
      <p className="min-w-0 flex-1 truncate text-[14px]">
        {actionable ? (
          <>
            <span className="text-muted">Saran: </span>
            <span className="font-semibold text-ink">{summary}</span>
          </>
        ) : (
          <span className="font-semibold text-success-ink">✓ Sesuai saran: {summary}</span>
        )}
      </p>
      <Link href="/#saran" className="shrink-0 px-0.5 text-[12px] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
        Lihat detail
      </Link>
      {actionable && (
        <button
          type="button"
          aria-label={`Gunakan saran ini: ${spoken}`}
          onClick={() => {
            if (s.difficulty) setAppliedLevel(s.difficulty);
            onApply({ difficulty: s.difficulty, duration: s.duration });
          }}
          className="pressable relative ml-0.5 min-h-8 shrink-0 rounded-control bg-brand px-2.5 text-[13px] font-semibold text-on-brand after:absolute after:-inset-1.5 after:content-[''] hover:bg-brand-hover"
        >
          Gunakan
        </button>
      )}
    </aside>
  );
}
