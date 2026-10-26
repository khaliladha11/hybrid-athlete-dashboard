"use client";

import { ConfirmButton } from "@/components/ui/ConfirmButton";
import type { Activity } from "@/lib/intervals/types";
import type { SessionResult } from "@/lib/program/compliance";
import { missedSessions, rescheduleOptions } from "@/lib/program/reschedule";
import type { PlannedSession } from "@/lib/program/sessions";
import type { ProgramPlan } from "@/lib/program/use-program-plan";
import { shortTitle } from "@/lib/program/to-generator";

const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const dayName = (d: string) => WEEKDAY.format(new Date(`${d}T00:00:00Z`));

/**
 * Baris sesi terlewat (PROGRAM-HIDUP §4.8): `Tempo Selasa terlewat · Geser ke Jumat · Lewati`.
 * Keputusan disimpan sebagai override program (tersinkron per sesi). Lewati butuh dua ketukan karena
 * keputusan tidak bisa dibatalkan dengan aman lewat sinkron.
 */
export function MissedSessions({ plan, today, max }: { plan: Pick<ProgramPlan, "sessions" | "results" | "activities" | "decide">; today: string; max?: number }) {
  const list = missedSessions(plan.sessions, plan.results, today).slice(0, max);
  if (!list.length) return null;
  return (
    <ul className="space-y-2" aria-label="Sesi terlewat">
      {list.map((s) => (
        <MissedRow key={s.id} session={s} sessions={plan.sessions} results={plan.results} activities={plan.activities} today={today} decide={plan.decide} />
      ))}
    </ul>
  );
}

function MissedRow({
  session,
  sessions,
  results,
  activities,
  today,
  decide,
}: {
  session: PlannedSession;
  sessions: PlannedSession[];
  results: Map<string, SessionResult>;
  activities: Activity[];
  today: string;
  decide: ProgramPlan["decide"];
}) {
  const opts = rescheduleOptions(session, sessions, results, activities, today);
  if (!opts.length) return null;
  const move = opts.find((o) => o.action === "move");
  const st = session.kind === "st-lower" || session.kind === "st-upper";
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-inner border border-line bg-surface py-1.5 pr-1.5 pl-3">
      <p className="min-w-0 flex-1 text-[14px] text-ink">
        <span className="font-semibold">
          {st ? session.title : shortTitle(session.title)} {session.day}
        </span>{" "}
        <span className="text-danger-ink">terlewat</span>
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {move?.action === "move" && (
          <button
            type="button"
            onClick={() => decide({ sessionId: session.id, action: "move", toDate: move.toDate })}
            className="pressable relative min-h-9 rounded-control bg-brand px-3 text-[13px] font-semibold text-on-brand after:absolute after:-inset-1 after:content-[''] hover:bg-brand-hover"
          >
            Geser ke {move.toDate === today ? "hari ini" : dayName(move.toDate)}
          </button>
        )}
        <ConfirmButton label="Lewati" confirmLabel="Tap lagi" onConfirm={() => decide({ sessionId: session.id, action: "skip" })} />
      </div>
    </li>
  );
}
