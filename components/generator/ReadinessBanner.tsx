"use client";

import type { Difficulty } from "@/lib/generator/types";
import { DIFFICULTY_LABEL } from "@/lib/generator/types";
import { lowerDifficulty, type Readiness } from "@/lib/readiness";

/**
 * Kartu saran non-blokir: hanya menyarankan turun satu level.
 * Di halaman generator alasan dilipat supaya hemat ruang di layar HP.
 */
export function ReadinessBanner({
  readiness,
  difficulty,
  onLower,
}: {
  readiness: Readiness | null;
  difficulty?: Difficulty;
  onLower?: (d: Difficulty) => void;
}) {
  if (!readiness?.caution) return null;
  const compact = !!onLower;
  const canLower = compact && difficulty && difficulty !== "easy";

  const reasons = (
    <ul className="mt-1.5 space-y-0.5 text-xs text-amber-900/90 dark:text-amber-200/90">
      {readiness.reasons.map((r) => (
        <li key={r}>• {r}</li>
      ))}
    </ul>
  );

  return (
    <aside
      role="note"
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-base leading-none">
          ⚠︎
        </span>
        <p className="flex-1 text-sm font-semibold">{compact ? "Tubuh butuh pemulihan" : "Saran kesiapan: pertimbangkan turun satu level"}</p>
        {canLower && (
          <button
            type="button"
            onClick={() => onLower(lowerDifficulty(difficulty))}
            className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-500/30 dark:text-amber-200"
          >
            → {DIFFICULTY_LABEL[lowerDifficulty(difficulty)]}
          </button>
        )}
      </div>
      {compact ? (
        <details className="group">
          <summary className="mt-1 cursor-pointer list-none text-xs text-amber-800/80 dark:text-amber-300/80">
            {canLower ? "Saran: turun satu level." : "Level Easy sudah tepat."}{" "}
            <span className="underline group-open:hidden">Lihat {readiness.reasons.length} alasan</span>
          </summary>
          {reasons}
        </details>
      ) : (
        <>
          {reasons}
          <p className="mt-1.5 text-xs text-amber-900/70 dark:text-amber-200/70">Ini hanya saran — kamu tetap bebas memilih.</p>
        </>
      )}
    </aside>
  );
}
