"use client";

import { useMemo } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { INTENSITY_TONE, TONES, pillClasses, type Tone } from "@/components/ui/tones";
import { ErrorState } from "@/components/ui/ErrorState";
import { addDays, formatDateId, startOfWeekMonday } from "@/lib/date";
import { DIFFICULTY_LABEL } from "@/lib/generator/types";
import type { Activity } from "@/lib/intervals/types";
import { PHASE_LABEL, currentWeekIndex, formatPaceSec, postRaceOffer, weekToText, type Phase, type ProgramWeek } from "@/lib/program";
import type { SessionResult } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";
import { predictRaces } from "@/lib/program/prediction";
import { useProgramPlan } from "@/lib/program/use-program-plan";
import { useAthleteSettings } from "@/lib/settings-store";
import { SessionStatusChip, sessionNote } from "./SessionStatusChip";
import { PredictionCard } from "./PredictionCard";
import { PostRaceOffer, RaceWeekChecklist, countdownText } from "./RaceDay";
import { TargetForm } from "./TargetForm";
import { WeekSessions } from "./WeekSessions";

/** Warna fase: Base hijau (ringan), Build kuning, Peak merah (paling berat), Taper biru. */
const PHASE_STYLE: Record<Phase, { fill: string; text: string }> = {
  prebase: { fill: "bg-line-strong", text: "text-muted" },
  base: { fill: "bg-success", text: "text-success-ink" },
  build: { fill: "bg-warning", text: "text-warning-ink" },
  peak: { fill: "bg-danger", text: "text-danger-ink" },
  taper: { fill: "bg-info", text: "text-info" },
};

const DAY_MONTH = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const weekdayYear = (d: Date) => `${WEEKDAY.format(d)}, ${d.getUTCFullYear()}`;

/** Halaman Program: pengaturan target, status sesi per minggu dari aktivitas (0.13), dan rencana semua minggu. */
export function ProgramView({ today, activities, oldest, longAdjust }: { today: string; activities: Activity[]; oldest: string; longAdjust?: { km: number; easy: boolean } }) {
  const plan = useProgramPlan({ activities, oldest, today });
  const { settings, program } = plan;
  // Tanggal mulai selalu dinormalkan ke Senin.
  const startDate = startOfWeekMonday(settings.startDate);
  const current = program ? currentWeekIndex(program, today) : 0;
  const currentWeek = program?.weeks.find((w) => w.index === current);
  // Status hanya ditampilkan untuk program tersimpan dan setelah data aktivitas lengkap.
  const showStatus = plan.saved && !plan.loading;
  const weekSessions = (w: number) => plan.sessions.filter((s) => s.week === w);
  const doneOf = (w: number) => weekSessions(w).filter((s) => plan.results.get(s.id)?.status === "terpenuhi").length;
  const [athlete] = useAthleteSettings();
  const prediction = useMemo(
    () => (plan.loading ? null : predictRaces({ raceResults: athlete.raceResults, activities: plan.activities, today })),
    [plan.loading, athlete.raceResults, plan.activities, today],
  );
  const predictedPace = (() => {
    const d = program && prediction?.distances.find((x) => x.distance === program.input.race);
    return d ? d.seconds / (d.meters / 1000) : undefined;
  })();
  const countdown = program && plan.saved ? countdownText(program, today) : null;

  return (
    <div className="space-y-4">
      <TargetForm key={`${plan.saved}-${settings.id ?? ""}-${settings.race}-${settings.startDate}-${settings.raceDate}`} plan={plan} today={today} />

      {program && (
        <>
          {plan.saved && postRaceOffer(program, athlete.raceResults, today) && <PostRaceOffer program={program} />}
          <Card
            title={program.spec.label}
            action={<span className={pillClasses(current ? "success" : "danger")}>{current ? `Minggu ${current}/${program.weeks.length}` : today < startDate ? "Belum mulai" : "Selesai"}</span>}
          >
            <div className="grid grid-cols-3 gap-x-3 gap-y-3">
              <Fact label="Hari lomba" value={DAY_MONTH.format(new Date(`${program.raceDate}T00:00:00Z`))} sub={weekdayYear(new Date(`${program.raceDate}T00:00:00Z`))} />
              <Fact label="Race pace" value={formatPaceSec(program.racePaceSec).replace("/km", "")} sub="/km" />
              <Fact label="Durasi" value={`${program.weeks.length}`} sub="minggu" />
            </div>
            {countdown && <p className="t-label tabular mt-3 text-ink">{countdown}</p>}

            <PhaseBar weeks={program.weeks} current={current} />

            {program.warnings.length > 0 && (
              <ul className="mt-4 space-y-2">
                {program.warnings.map((w) => (
                  <li key={w} className="flex gap-2 rounded-inner bg-danger-soft px-3 py-2 text-[13px] text-ink">
                    <span aria-hidden className="font-semibold text-danger-ink">
                      ✕
                    </span>
                    {w}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-faint">
              Long run awal {plan.baseLongRunKm ? `dari lari terjauh 30 hari sebelum program mulai (${plan.baseLongRunKm} km)` : "memakai default program"}.
              {!plan.saved && " Ini pratinjau. Pilih Hari H lalu Buat program untuk menyimpan program dan melihat status sesi."}
            </p>
            {plan.error && (
              <div className="mt-3">
                <ErrorState error={plan.error} compact />
              </div>
            )}
          </Card>

          {currentWeek && (
            <div id="minggu-ini" className="scroll-mt-4">
              <Card
                title={`Minggu ini · ${PHASE_LABEL[currentWeek.phase]}`}
                action={<CopyButton text={weekToText(program, currentWeek)} label="Copy" className={`${BUTTON.secondary} min-h-9 px-3 text-[13px]`} />}
              >
                {showStatus && plan.active && (
                  <div id="sesi-minggu-ini" className="mb-4 scroll-mt-4 border-b border-line pb-4 empty:hidden">
                    <WeekSessions plan={plan} today={today} where="program" longAdjust={longAdjust} />
                  </div>
                )}
                <WeekDetail week={currentWeek} sessions={weekSessions(currentWeek.index)} results={showStatus ? plan.results : undefined} />
                {currentWeek.raceWeek && <RaceWeekChecklist program={program} predictedPaceSec={predictedPace} />}
              </Card>
            </div>
          )}

          {!plan.loading && <PredictionCard program={program} prediction={prediction} />}

          <Card title="Semua minggu" flush className="!pb-1">
            <ul className="divide-y divide-line">
              {program.weeks.map((w) => (
                <li key={w.index}>
                  <details className="group" open={w.index === current && !currentWeek}>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-5 py-2">
                      <span className={`h-8 w-1 shrink-0 rounded-full ${PHASE_STYLE[w.phase].fill}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-semibold">
                          Minggu {w.index}
                          {w.index === current && <span className="ml-2 text-[12px] font-semibold text-brand-ink">● sekarang</span>}
                        </p>
                        <p className="text-[13px] text-muted">
                          <span className={`font-semibold ${PHASE_STYLE[w.phase].text}`}>{PHASE_LABEL[w.phase]}</span>
                          {w.cutback && " · cutback"} · {formatDateId(w.start)} · ±{w.totalKm} km
                          {showStatus && w.start <= today && (
                            <span className="tabular">
                              {" "}
                              · {doneOf(w.index)}/{weekSessions(w.index).length} terpenuhi
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                        ›
                      </span>
                    </summary>
                    <div className="details-body px-5 pb-4">
                      <WeekDetail week={w} sessions={weekSessions(w.index)} results={showStatus ? plan.results : undefined} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>

          {plan.archived.length > 0 && showStatus && (
            <Card title="Program sebelumnya" flush className="!pb-1">
              <ul className="divide-y divide-line">
                {[...plan.archived].reverse().map((a) => {
                  const weeks = a.program.weeks.filter((w) => a.sessions.some((s) => s.week === w.index));
                  const done = a.sessions.filter((s) => plan.results.get(s.id)?.status === "terpenuhi").length;
                  return (
                    <li key={a.archive.id}>
                      <details className="group">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-5 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-body font-semibold">{a.program.spec.label}</p>
                            <p className="tabular text-[13px] text-muted">
                              {formatDateId(a.archive.startDate)} sampai {formatDateId(addDays(a.archive.endedAt, -1))} · Hari H {formatDateId(a.archive.raceDate)} · {done}/{a.sessions.length} terpenuhi
                            </p>
                          </div>
                          <span className="text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                            ›
                          </span>
                        </summary>
                        <div className="details-body space-y-4 px-5 pb-4">
                          {weeks.map((w) => (
                            <div key={w.index}>
                              <p className="t-label mb-2">
                                Minggu {w.index} · {PHASE_LABEL[w.phase]}
                              </p>
                              <WeekDetail week={w} sessions={a.sessions.filter((s) => s.week === w.index)} results={plan.results} />
                            </div>
                          ))}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card title="Kombinasi dengan strength">
            <p className="text-[14px] text-ink">{program.strengthNote}</p>
          </Card>
        </>
      )}
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="t-label">{label}</p>
      <p className="tabular mt-1 truncate text-[20px] leading-tight font-bold">{value}</p>
      {sub && <p className="t-label mt-1">{sub}</p>}
    </div>
  );
}

function PhaseBar({ weeks, current }: { weeks: ProgramWeek[]; current: number }) {
  const phases = [...new Set(weeks.map((w) => w.phase))];
  return (
    <div className="mt-4">
      <div className="flex gap-1" aria-hidden>
        {weeks.map((w) => (
          <span
            key={w.index}
            className={`h-2.5 flex-1 rounded-full ${PHASE_STYLE[w.phase].fill} ${w.index === current ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""} ${
              w.cutback ? "opacity-50" : ""
            }`}
          />
        ))}
      </div>
      <div className="t-label mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {phases.map((p) => (
          <span key={p} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${PHASE_STYLE[p].fill}`} />
            {PHASE_LABEL[p]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-faint opacity-50" />
          Cutback
        </span>
      </div>
    </div>
  );
}

function WeekDetail({ week, sessions, results }: { week: ProgramWeek; sessions: PlannedSession[]; results?: Map<string, SessionResult> }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-muted">{week.focus}</p>
      <ul className="space-y-2">
        {sessions.map((s) => {
          const tone: Tone = INTENSITY_TONE[s.intensity];
          const r = results?.get(s.id);
          const note = sessionNote(r);
          const st = s.kind === "st-lower" || s.kind === "st-upper";
          return (
            <li key={s.id} className="flex gap-3 rounded-inner bg-subtle px-3 py-2.5">
              <span className={`w-1 shrink-0 self-stretch rounded-full ${st ? "bg-line-strong" : TONES[tone].fill}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-body font-semibold">
                    <span className="text-muted">{s.day} (disarankan) · </span>
                    {s.title}
                  </p>
                  {st ? (
                    <span className="t-label shrink-0 pt-1">Strength</span>
                  ) : (
                    <span className={`shrink-0 ${pillClasses(tone)}`}>{s.kind === "race" ? "Lomba" : DIFFICULTY_LABEL[s.intensity]}</span>
                  )}
                </div>
                {s.detail && <p className="mt-0.5 text-[13px] text-muted">{s.detail}</p>}
                {results && ((r && r.status !== "belum") || note) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <SessionStatusChip session={s} result={r} />
                    {note && <span className="text-[12px] text-muted">{note}</span>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[12px] text-faint">
        Total ±{week.totalKm} km · {formatDateId(week.start)} sampai {formatDateId(addDays(week.start, 6))}. Hari hanya saran; sesi boleh dikerjakan di hari apa pun minggu ini.
      </p>
    </div>
  );
}
