"use client";

import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { mergeWeekNotes } from "@/lib/program/settings";
import { generatorHref, shortTitle, toGenerator } from "@/lib/program/to-generator";
import type { ProgramPlan } from "@/lib/program/use-program-plan";
import { canSkip, dayName, recommendToday, weekEndNote, weekSessions } from "@/lib/program/week-plan";
import type { PlannedSession } from "@/lib/program/sessions";
import { useStSessions } from "@/lib/st-session-store";
import { TodaySessionAction } from "./TodaySessionAction";

const label = (s: PlannedSession) => (s.kind === "st-lower" || s.kind === "st-upper" ? s.title : shortTitle(s.title));

/**
 * "Sesi minggu ini" (0.14.3): sisa sesi minggu kalender ini, sesi yang paling cocok hari ini beserta alasannya, dan
 * "Lewati". Semua saran tidak memblokir: setiap sesi sisa bisa dibuka kapan saja di minggu ini. Catatan lembut untuk
 * minggu yang baru selesai tampil sekali sampai ditutup.
 */
export function WeekSessions({
  plan,
  today,
  where,
  longAdjust,
}: {
  plan: ProgramPlan;
  today: string;
  where: "program" | "profile";
  longAdjust?: { km: number; easy: boolean };
}) {
  const stSessions = useStSessions();
  const program = plan.program;
  if (!program || !plan.active || plan.loading) return null;
  const week = weekSessions(plan.sessions, plan.results, today);
  const rec = recommendToday(week.remaining, { today, weekEnd: week.end, activities: plan.activities, stSessions });
  const note = weekEndNote(plan.sessions, plan.results, today, plan.settings.weekNotesSeen);
  const others = week.remaining.filter((s) => s.id !== rec.session?.id);
  const done = week.all.length - week.remaining.length;

  return (
    <section aria-label="Sesi minggu ini" className="space-y-3">
      {note && (
        <div role="note" className="space-y-2 rounded-inner border border-line bg-subtle p-3">
          <p className="t-label">Saran Gita · minggu {note.week}</p>
          {note.lines.map((l) => (
            <p key={l} className="text-[14px] text-ink">
              {l}
            </p>
          ))}
          <button
            type="button"
            onClick={() => plan.save({ weekNotesSeen: mergeWeekNotes(plan.settings.weekNotesSeen, [note.id]) })}
            className={`${BUTTON.base} ${BUTTON.secondary} w-full`}
          >
            Tutup catatan
          </button>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-2">
        <p className="t-label">Sesi minggu ini</p>
        <p className="t-label tabular">
          {done}/{week.all.length} dikerjakan
        </p>
      </div>

      {week.remaining.length === 0 ? (
        <p className="text-[14px] text-muted">Semua sesi minggu ini sudah dikerjakan atau dilewati.</p>
      ) : (
        <>
          {rec.session ? (
            <div className="space-y-2">
              <p className="text-[14px]">
                <span className="font-semibold">Hari ini: {label(rec.session)}.</span> <span className="text-muted">{rec.reasons.join(" ")}</span>
              </p>
              <TodaySessionAction
                session={rec.session}
                program={program}
                where={where}
                label={`Kerjakan ${label(rec.session)}`}
                longAdjust={rec.session.kind === "long" ? longAdjust : undefined}
              />
            </div>
          ) : (
            <p className="text-[14px] text-muted">{rec.reasons.join(" ")}</p>
          )}
          {rec.notToday.length > 0 && (
            <ul className="space-y-1 text-[13px] text-muted">
              {rec.notToday.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          {others.length > 0 && (
            <ul className="space-y-2" aria-label="Sesi tersisa">
              {others.map((s) => (
                <RemainingRow key={s.id} session={s} plan={plan} today={today} />
              ))}
            </ul>
          )}
          {rec.session && canSkip(rec.session, plan.results.get(rec.session.id), today) && (
            <div className="flex justify-end">
              <ConfirmButton label={`Lewati ${label(rec.session)}`} confirmLabel="Tap lagi untuk melewati" onConfirm={() => plan.decide({ sessionId: rec.session!.id, action: "skip" })} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RemainingRow({ session, plan, today }: { session: PlannedSession; plan: ProgramPlan; today: string }) {
  const href = generatorHref(session, toGenerator(session));
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-inner border border-line bg-surface py-1.5 pr-1.5 pl-3">
      <p className="min-w-0 flex-1 text-[14px] text-ink">
        <span className="font-semibold">{label(session)}</span> <span className="text-muted">· disarankan {dayName(session.plannedDate)}</span>
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={href ?? "/program#minggu-ini"}
          className="pressable relative inline-flex min-h-9 items-center rounded-control border border-line-strong px-3 text-[13px] font-semibold text-ink after:absolute after:-inset-1 after:content-[''] hover:bg-subtle"
        >
          Buka
        </Link>
        {canSkip(session, plan.results.get(session.id), today) && (
          <ConfirmButton label="Lewati" confirmLabel="Tap lagi" onConfirm={() => plan.decide({ sessionId: session.id, action: "skip" })} />
        )}
      </div>
    </li>
  );
}
