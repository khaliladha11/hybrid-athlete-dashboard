"use client";

import { useMemo, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { batchSummary, orphanText, orphanedSends, sendDateFor } from "@/lib/intervals/send-status";
import { forgetSent, sendToCalendar, useSent } from "@/lib/intervals/send-store";
import { eventHash, exportPlannedSession, externalId } from "@/lib/intervals/workout-export";
import { formatPaceSec, type Program } from "@/lib/program";
import { isRunKind, type PlannedSession } from "@/lib/program/sessions";
import { useAthleteSettings, useBlockContext, useResolvedProfile } from "@/lib/settings-store";

/**
 * "Kirim minggu ini" (0.17): sisa sesi lari minggu ini dikirim berurutan ke kalender intervals.icu (versi rencana;
 * sesi yang dibuka di generator lalu dikirim ulang memperbarui event yang sama). Juga menawarkan menghapus event
 * sesi yang tidak ada lagi di program (dilewati atau program diganti).
 */
export function WeekSend({ remaining, sessions, program, today }: { remaining: PlannedSession[]; sessions: PlannedSession[]; program: Program; today: string }) {
  const p = useResolvedProfile();
  const block = useBlockContext();
  const sent = useSent();
  const [{ watchBrand }] = useAthleteSettings();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const runs = remaining.filter((s) => isRunKind(s.kind));

  const live = useMemo(() => new Set(sessions.filter((s) => s.override?.action !== "skip").map((s) => s.id)), [sessions]);
  const orphans = useMemo(() => orphanedSends(sent, live, today), [sent, live, today]);

  const sendWeek = async () => {
    setBusy(true);
    const tally = { sent: 0, failed: 0, queued: 0, skipped: 0 };
    let warnings: string[] | undefined;
    const racePace = formatPaceSec(program.racePaceSec);
    try {
      for (const s of runs) {
        const r = exportPlannedSession(s, { profile: p, racePace, block });
        if (!r.ok) {
          tally.skipped++;
          continue;
        }
        const date = sendDateFor(s.plannedDate, today);
        const out = await sendToCalendar({ action: "upsert", externalId: externalId.session(s.id), date, event: r.event, ...(watchBrand ? { watch: watchBrand } : {}) }, eventHash(r.event, date));
        if (out.kind === "sent") {
          tally.sent++;
          warnings ??= out.warnings;
        }
        else if (out.kind === "queued") tally.queued++;
        else if (out.kind === "demo") {
          setSummary(out.text);
          return;
        } else tally.failed++;
      }
      setSummary([batchSummary(tally), ...(warnings ?? [])].join(" "));
    } finally {
      setBusy(false);
    }
  };

  const removeOrphans = async () => {
    setBusy(true);
    try {
      for (const o of orphans) await sendToCalendar({ action: "delete", externalId: o.externalId, date: o.date });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {orphans.length > 0 && (
        <div role="note" className="space-y-2 rounded-inner border border-line bg-subtle p-3">
          <p className="text-[14px] text-ink">{orphanText(orphans.length)} Hapus juga dari kalender intervals.icu?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => void removeOrphans()} className={`${BUTTON.base} ${BUTTON.secondary}`}>
              Hapus dari kalender
            </button>
            <button type="button" disabled={busy} onClick={() => orphans.forEach((o) => forgetSent(o.externalId))} className={`${BUTTON.base} ${BUTTON.ghost}`}>
              Biarkan
            </button>
          </div>
        </div>
      )}
      {runs.length > 0 && (
        <button type="button" disabled={busy} onClick={() => void sendWeek()} className={`${BUTTON.base} ${BUTTON.secondary} w-full`}>
          {busy ? "Mengirim" : `Kirim minggu ini ke jam · ${runs.length} lari`}
        </button>
      )}
      <p role="status" aria-live="polite" className="text-[13px] text-ink">
        {summary}
      </p>
    </div>
  );
}
