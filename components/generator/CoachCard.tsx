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
    <aside
      role="note"
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span aria-hidden className="text-base leading-none">
          ⚠︎
        </span>
        <p className="flex-1 text-sm font-semibold">Saran hari ini</p>
        {onApply &&
          actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                if (a.apply.difficulty) setAppliedLevel(a.apply.difficulty);
                onApply(a.apply);
              }}
              className="pressable relative shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-900 after:absolute after:-inset-2 after:content-[''] hover:bg-amber-500/30 dark:text-amber-200"
            >
              → {a.label}
            </button>
          ))}
      </div>
      <ul className="mt-1.5 space-y-1 text-xs leading-snug text-amber-900/90 dark:text-amber-200/90">
        {relevant.map((a) => (
          <li key={a.id + a.message} className="flex gap-1.5">
            <span aria-hidden>•</span>
            <span>{a.message}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] text-amber-900/60 dark:text-amber-200/60">Hanya saran — kamu tetap bebas memilih.</p>
    </aside>
  );
}
