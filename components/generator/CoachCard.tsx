"use client";

import Link from "next/link";
import { useState } from "react";
import { suggestFor, type Advice, type AdviceTarget, type Suggestion } from "@/lib/coach";
import { DIFFICULTY_LABEL, STRENGTH_TYPE_LABEL, type Difficulty, type Duration, type StrengthType } from "@/lib/generator/types";
import { adviceSeverity, suggestionSeverity } from "./coach-severity";

/**
 * Saran hari ini (non-blokir): readiness + konteks mingguan.
 * Tanpa `target`, semua saran tampil tanpa tombol aksi (halaman Profil).
 */
export function CoachCard({
  advice,
  target,
  current,
  onApply,
  id,
  tour,
  planLine,
}: {
  advice: Advice[];
  /** Anchor (mis. "saran") supaya bisa ditautkan dari halaman generator. */
  id?: string;
  /** Sasaran tur in-app (`data-tour`). */
  tour?: string;
  target?: AdviceTarget;
  current?: { difficulty: Difficulty; duration: Duration; type?: StrengthType };
  onApply?: (s: Suggestion) => void;
  /** "Rencana: … Saran: …" dari sesi program hari ini (0.13.1); `href` = Terapkan ke generator/kartu. */
  planLine?: { text: string; href?: string };
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

  const severity = target && current ? suggestionSeverity(s) : adviceSeverity(relevant);

  return (
    <aside id={id} data-tour={tour} role="note" className="scroll-mt-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        <h2 className="t-label flex-1 shrink-0 whitespace-nowrap">
          Saran hari ini · <span className={`font-semibold ${severity.className}`}>{severity.word}</span>
        </h2>
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
              Terapkan {a.label}
            </button>
          ))}
      </div>
      {planLine && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-inner bg-subtle px-3 py-2">
          <p className="min-w-0 flex-1 text-[14px] font-semibold text-ink">{planLine.text}</p>
          {planLine.href && (
            <Link
              href={planLine.href}
              className="pressable relative min-h-8 shrink-0 rounded-control bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand after:absolute after:-inset-1.5 after:content-[''] hover:bg-brand-hover"
            >
              Terapkan
            </Link>
          )}
        </div>
      )}
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
                  <span className="text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
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
