"use client";

import { useEffect, useRef } from "react";
import { BUTTON } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { CADENCE_NOTES, runTargets } from "@/lib/generator";
import { formatPaceSec, type Program } from "@/lib/program";
import type { PlannedSession } from "@/lib/program/sessions";
import { sessionCardText } from "@/lib/program/to-generator";
import { useResolvedProfile } from "@/lib/settings-store";

const kmText = (v: number) => v.toLocaleString("id-ID");
// Catatan cue lama di lib memakai em dash; tampilan memakai titik (DESIGN-SYSTEM §7).
const tidy = (t: string) => t.replace(/\s—\s/g, ". ");
// Jarak ditampilkan terpisah, jadi "Long run 14 km" cukup "Long run".
const titleOf = (t: string) => t.replace(/\s+[\d.,]+\s*km$/i, "");

/**
 * Kartu sesi program untuk long run, lomba, dan sesi spesifik lomba (PROGRAM-HIDUP D4): tidak dibuat ulang lewat
 * generator 30/45/60 menit. Menampilkan jarak, target dari rencana, cue kondisi aktif, dan teks salin format Copy Set.
 */
export function ProgramSessionCard({ session, program, km, easyOnly }: { session: PlannedSession; program: Program; km?: number; easyOnly?: boolean }) {
  const p = useResolvedProfile();
  const t = runTargets(p);
  const ref = useRef<HTMLDivElement>(null);
  // Kartu muncul setelah data program dimuat, jadi lompatan #sesi-hari-ini bawaan browser sudah lewat.
  useEffect(() => {
    if (window.location.hash === "#sesi-hari-ini") ref.current?.scrollIntoView({ block: "start" });
  }, []);
  const adjusted = km !== undefined && session.km !== undefined && km < session.km;
  const s = easyOnly ? { ...session, intensity: "easy" as const } : session;
  const text = sessionCardText(s, { easyPace: t.easy.pace ?? "", racePace: formatPaceSec(program.racePaceSec), km });
  const cues = [
    ...(p.rules.cadenceCue ? [CADENCE_NOTES[0]] : []),
    ...(p.rules.crossoverCue ? [CADENCE_NOTES[1]] : []),
    ...p.rules.runNotes,
    ...p.customConditions.map((c) => `Catatan kondisimu: ${c}`),
  ].map(tidy);
  return (
    <div ref={ref} id="sesi-hari-ini" className="scroll-mt-4 rounded-inner border border-line-strong p-3">
      <p className="t-label">Sesi program</p>
      <p className="mt-1 text-body font-semibold">
        {titleOf(session.title)}
        {session.km !== undefined && (
          <span className="tabular ml-2 font-normal text-muted">
            {adjusted ? `${kmText(km!)} km · rencana ${kmText(session.km)} km` : `${kmText(session.km)} km`}
          </span>
        )}
      </p>
      {adjusted && <p className="mt-1 text-[13px] font-semibold text-ink">Dipendekkan sesuai saran hari ini{easyOnly ? ", seluruhnya pace easy" : ""}.</p>}
      {session.detail && <p className="mt-1 text-[13px] text-muted">{tidy(session.detail)}</p>}
      {cues.length > 0 && (
        <ul className="mt-2 space-y-1 text-[13px] text-ink">
          {cues.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden className="text-info">›</span>
              {c}
            </li>
          ))}
        </ul>
      )}
      <pre className="tabular mt-3 overflow-x-auto rounded-inner bg-subtle p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">{text}</pre>
      <CopyButton text={text} label="Copy Set" className={`${BUTTON.secondary} mt-2 w-full text-body`} />
    </div>
  );
}
