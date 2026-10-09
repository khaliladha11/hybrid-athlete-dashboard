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
      <ul className="mt-2 -mx-1 divide-y divide-line">
        {relevant.map((a) => {
          const recs = recommendations(a);
          return (
            <li key={a.id + a.message}>
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-inner px-1 hover:bg-subtle">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{a.title}</span>
                  {recs[0] && <span className="shrink-0 truncate text-[12px] font-semibold text-brand-ink">{recs[0].short}</span>}
                  <span className="text-[13px] text-faint transition-transform duration-150 ease group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                    ›
                  </span>
                </summary>
                <div className="details-body space-y-2 px-1 pb-3 pl-5 text-[14px] leading-snug">
                  <p className="text-muted">{a.message}</p>
                  {recs.length > 0 && (
                    <ul className="space-y-1">
                      {recs.map((r) => (
                        <li key={r.text} className="flex gap-2 text-ink">
                          <span aria-hidden className="font-semibold text-brand-ink">→</span>
                          {r.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[12px] text-faint">Ketuk untuk detail · hanya saran, kamu tetap bebas memilih.</p>
    </aside>
  );
}

/** Rekomendasi konkret dari batasan pada saran (untuk isi dropdown). */
function recommendations(a: Advice): { short: string; text: string }[] {
  const out: { short: string; text: string }[] = [];
  if (a.lowerBy) out.push({ short: "Turun 1 level", text: "Turunkan intensitas satu level dari rencana (High → Moderate, Moderate → Easy)." });
  if (a.maxDifficulty)
    out.push({ short: `Maks. ${DIFFICULTY_LABEL[a.maxDifficulty]}`, text: `Lari maksimal ${DIFFICULTY_LABEL[a.maxDifficulty]} untuk sesi berikutnya.` });
  if (a.maxDuration) out.push({ short: `Maks. ${a.maxDuration}'`, text: `Batasi durasi lari ${a.maxDuration} menit.` });
  if (a.preferTypes?.length) {
    const types = a.preferTypes.map((t) => STRENGTH_TYPE_LABEL[t]).join(" / ");
    out.push({ short: types, text: `Untuk strength, pilih ${types}.` });
  }
  return out;
}
