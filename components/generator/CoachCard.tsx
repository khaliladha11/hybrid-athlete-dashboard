"use client";

import { useState } from "react";
import { suggestFor, type Advice, type AdviceTarget, type Suggestion } from "@/lib/coach";
import { DIFFICULTY_LABEL, STRENGTH_TYPE_LABEL, type Difficulty, type Duration, type StrengthType } from "@/lib/generator/types";

/**
 * Saran hari ini (non-blokir): readiness + konteks mingguan.
 * Tanpa `target`, semua saran tampil tanpa tombol aksi (halaman Profil).
 */
export function CoachCard({
  advice,
  target,
  current,
  onApply,
}: {
  advice: Advice[];
  target?: AdviceTarget;
  current?: { difficulty: Difficulty; duration: Duration; type?: StrengthType };
  onApply?: (s: Suggestion) => void;
}) {
  // Level hasil menerapkan saran; selama user tetap di level ini, "turun satu level"
  // tidak ditawarkan lagi (supaya tidak turun berantai High → Moderate → Easy).
  const [appliedLevel, setAppliedLevel] = useState<Difficulty | null>(null);
  const relevant = target ? advice.filter((a) => a.targets.includes(target)) : advice;
  if (!relevant.length) return null;

  const s =
    target && current
      ? suggestFor(advice, target, current, { ignoreLowerBy: appliedLevel === current.difficulty })
      : {};
  const actions: { label: string; apply: Suggestion }[] = [
    ...(s.difficulty ? [{ label: DIFFICULTY_LABEL[s.difficulty], apply: { difficulty: s.difficulty } }] : []),
    ...(s.duration ? [{ label: `${s.duration}'`, apply: { duration: s.duration } }] : []),
    ...(s.type ? [{ label: STRENGTH_TYPE_LABEL[s.type], apply: { type: s.type } }] : []),
  ];

  return (
    <aside role="note" className="rounded-card border border-line border-l-[3px] border-l-brand bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01" />
        </svg>
        <h2 className="flex-1 shrink-0 text-base font-semibold whitespace-nowrap">Saran hari ini</h2>
        {onApply &&
          actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                if (a.apply.difficulty) setAppliedLevel(a.apply.difficulty);
                onApply(a.apply);
              }}
              className="pressable relative min-h-8 shrink-0 rounded-control bg-brand px-3 text-[13px] font-semibold text-on-brand after:absolute after:-inset-1.5 after:content-[''] hover:bg-brand-hover"
            >
              → {a.label}
            </button>
          ))}
      </div>
      <ul className="mt-3 space-y-2 text-[14px] leading-snug text-ink">
        {relevant.map((a) => (
          <li key={a.id + a.message} className="flex gap-2">
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span>{a.message}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-faint">Hanya saran — kamu tetap bebas memilih.</p>
    </aside>
  );
}
