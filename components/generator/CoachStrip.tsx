"use client";

import Link from "next/link";
import { useState } from "react";
import { suggestFor, type Advice, type AdviceTarget, type Suggestion } from "@/lib/coach";
import { DIFFICULTY_LABEL, type Difficulty, type Duration } from "@/lib/generator/types";
import { suggestionSeverity } from "./coach-severity";

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
  const severity = suggestionSeverity(s);

  return (
    <aside
      role="note"
      aria-label="Saran hari ini"
      title={relevant.map((a) => a.title).join(" · ")}
      className="flex min-h-14 items-center gap-2.5 rounded-card border border-line bg-surface py-2 pr-2 pl-3.5"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="t-label truncate">
          Saran hari ini · <span className={`font-semibold ${severity.className}`}>{severity.word}</span>
        </span>
        <p className="truncate text-[14px]">
          {actionable ? (
            <>
              <span className="text-muted">Saran: </span>
              <span className="font-semibold text-ink">{summary}</span>
            </>
          ) : (
            <span className="font-semibold text-success-ink">✓ Sesuai saran: {summary}</span>
          )}
        </p>
      </div>
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
