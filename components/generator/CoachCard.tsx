"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { coachOpen, isCollapsible, mainAdvice, nextCollapseState, parseCollapseState } from "@/lib/coach-collapse";
import { PREF_KEYS } from "@/lib/preference-keys";
import { pillClasses } from "@/components/ui/tones";
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
  collapseDay,
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
  /**
   * Profil (1.1.0): tanggal WIB hari ini. Bila diisi dan isinya banyak, kartu bisa dilipat: kalimat utama + chip
   * severity + "Lihat detail". Pilihan diingat per hari; saran baru yang lebih berat membukanya otomatis.
   */
  collapseDay?: string;
}) {
  // Level hasil menerapkan saran; selama user tetap di level ini, "turun satu level"
  // tidak ditawarkan lagi (supaya tidak turun berantai High → Moderate → Easy).
  const [appliedLevel, setAppliedLevel] = useState<Difficulty | null>(null);
  const relevant = target ? advice.filter((a) => a.targets.includes(target)) : advice;
  const severity0 = adviceSeverity(relevant);
  const collapsible = !!collapseDay && relevant.length > 0 && isCollapsible(relevant);
  const rank = severity0.rank ?? 0;
  // Server dan render pertama: tertutup. Setelah itu status hari ini dibaca dari perangkat.
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  useEffect(() => {
    if (!collapsible || !collapseDay) return;
    let stored = null;
    try {
      stored = parseCollapseState(localStorage.getItem(PREF_KEYS.coachCollapse));
    } catch {}
    const next = coachOpen(stored, collapseDay, rank);
    setOpen(next);
    try {
      localStorage.setItem(PREF_KEYS.coachCollapse, JSON.stringify(nextCollapseState(collapseDay, next, rank)));
    } catch {}
  }, [collapsible, collapseDay, rank]);
  if (!relevant.length) return null;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(PREF_KEYS.coachCollapse, JSON.stringify(nextCollapseState(collapseDay!, next, rank)));
    } catch {}
  };
  const showList = !collapsible || open;
  const main = collapsible ? mainAdvice(relevant) : undefined;

  const s =
    target && current
      ? suggestFor(advice, target, current, { ignoreLowerBy: appliedLevel === current.difficulty })
      : {};
  const actions: { label: string; apply: Suggestion }[] = [
    ...(s.difficulty ? [{ label: DIFFICULTY_LABEL[s.difficulty], apply: { difficulty: s.difficulty } }] : []),
    ...(s.duration ? [{ label: `${s.duration}'`, apply: { duration: s.duration } }] : []),
    ...(s.type ? [{ label: STRENGTH_TYPE_LABEL[s.type], apply: { type: s.type } }] : []),
  ];

  const severity = target && current ? suggestionSeverity(s) : severity0;

  return (
    <aside id={id} data-tour={tour} role="note" className="scroll-mt-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-brand-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        {collapsible ? (
          <h2 className="t-label flex flex-1 shrink-0 items-center gap-2 whitespace-nowrap">
            Saran Gita · hari ini
            <span className={severity.tone ? pillClasses(severity.tone) : "inline-flex h-[22px] items-center rounded-full bg-subtle-strong px-[9px] font-mono text-[11px] font-medium tracking-[0.08em] text-ink uppercase"}>
              {severity.word}
            </span>
          </h2>
        ) : (
          <h2 className="t-label flex-1 shrink-0 whitespace-nowrap">
            Saran Gita · hari ini · <span className={`font-semibold ${severity.className}`}>{severity.word}</span>
          </h2>
        )}
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
      {main && (
        <div className="mt-3 flex items-start gap-3">
          <p className="min-w-0 flex-1 text-[15px] leading-snug font-semibold text-ink">{main.title}</p>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={toggle}
            className="pressable -my-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 text-[13px] font-semibold text-muted hover:bg-subtle hover:text-ink"
          >
            {open ? "Tutup detail" : `Lihat detail${relevant.length > 1 ? ` · ${relevant.length}` : ""}`}
            <span aria-hidden className={`inline-block transition-transform duration-150 ease-out motion-reduce:transition-none ${open ? "rotate-90" : ""}`}>
              ›
            </span>
          </button>
        </div>
      )}
      {showList && (
      <div id={collapsible ? bodyId : undefined} className={collapsible ? "gita-detail" : undefined}>
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
      </div>
      )}
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
