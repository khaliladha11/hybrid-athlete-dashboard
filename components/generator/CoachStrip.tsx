"use client";

import Link from "next/link";
import { useState } from "react";
import { suggestFor, type Advice, type AdviceTarget, type PlanToday, type Suggestion } from "@/lib/coach";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty, type Duration } from "@/lib/generator/types";
import { planLabel } from "@/components/program/planText";
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
  plan,
}: {
  advice: Advice[];
  target: AdviceTarget;
  current: { difficulty: Difficulty; duration: Duration };
  onApply: (s: Suggestion) => void;
  /** Sesi program yang mengisi generator (0.13.1): saran dihitung terhadap rencana, bukan pilihan saat ini. */
  plan?: { label: string; plan: PlanToday };
}) {
  // Sama seperti CoachCard: "turun satu level" tidak ditawarkan berantai.
  const [appliedLevel, setAppliedLevel] = useState<Difficulty | null>(null);
  const relevant = advice.filter((a) => a.targets.includes(target));
  if (!relevant.length) return null;

  const s = plan ? suggestFor(advice, target, current, { plan: plan.plan }) : suggestFor(advice, target, current, { ignoreLowerBy: appliedLevel === current.difficulty });
  const difficulty = s.difficulty ?? (plan ? plan.plan.difficulty : current.difficulty);
  const duration = s.duration ?? (plan ? (plan.plan.duration ?? current.duration) : current.duration);
  // Dengan rencana: Gunakan hanya menurunkan isian saat ini ke versi saran, tidak pernah menaikkannya.
  const lowered = plan
    ? {
        difficulty: DIFFICULTIES.indexOf(difficulty) < DIFFICULTIES.indexOf(current.difficulty) ? difficulty : undefined,
        duration: duration < current.duration ? duration : undefined,
      }
    : { difficulty: s.difficulty, duration: s.duration };
  const actionable = !!(s.difficulty || s.duration) && !!(lowered.difficulty || lowered.duration);
  // Ringkas supaya muat satu baris di layar 360px: "Moderate · 30'".
  const summary = plan
    ? `Rencana ${planLabel(plan.label, plan.plan)} · ${s.difficulty || s.duration ? `saran ${DIFFICULTY_LABEL[difficulty]} ${duration}'` : "sesuai"}`
    : `${DIFFICULTY_LABEL[difficulty]} · ${duration}'`;
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
        {/* Label di atas sudah menyebut "Saran", jadi baris ini cukup ringkasan + tautan detail. */}
        <p className="flex min-w-0 items-baseline gap-2 text-[14px]">
          <span className={`min-w-0 truncate font-semibold ${actionable ? "text-ink" : "text-success-ink"}`}>
            {actionable ? summary : `✓ ${summary}`}
          </span>
          <Link
            href="/#saran"
            className="relative shrink-0 text-[12px] font-semibold text-muted underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:text-ink hover:underline"
          >
            Lihat detail
          </Link>
        </p>
      </div>
      {actionable && (
        <button
          type="button"
          aria-label={`Gunakan saran ini: ${spoken}`}
          onClick={() => {
            if (s.difficulty) setAppliedLevel(s.difficulty);
            onApply(lowered);
          }}
          className="pressable relative ml-0.5 min-h-8 shrink-0 rounded-control bg-brand px-2.5 text-[13px] font-semibold text-on-brand after:absolute after:-inset-1.5 after:content-[''] hover:bg-brand-hover"
        >
          Gunakan
        </button>
      )}
    </aside>
  );
}
