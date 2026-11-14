"use client";

import { useMemo, useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { TimePicker } from "@/components/ui/TimePicker";
import { formatDateId, startOfWeekMonday } from "@/lib/date";
import { RACES, buildProgram, formatGoal, goalFromProfile, parseGoal, type RaceTarget } from "@/lib/program";
import { longestRunKm, predictRaces } from "@/lib/program/prediction";
import { baseLongRunKm, legacyRaceDate } from "@/lib/program/settings";
import { completedDistance, makeTimeline, phaseSummary, programShape, readiness, spacingWarnings, vdotGap } from "@/lib/program/timeline";
import type { ProgramPlan } from "@/lib/program/use-program-plan";
import { useAthleteSettings, useResolvedProfile } from "@/lib/settings-store";
import { BAND_CELL, RaceDatePicker } from "./RaceDatePicker";
import { useLocale, useT } from "@/lib/i18n/client";
import { PROGRAM } from "@/lib/i18n/messages/program";
import { formatNumber } from "@/lib/i18n/format";

const RACE_OPTIONS: RaceTarget[] = ["5k", "10k", "hm", "fm"];

/**
 * Program › Target (0.13.3): jarak, target waktu, tanggal mulai, Hari H, lari per minggu. Saat memilih Hari H,
 * kalender diwarnai saran lama program (rekomendasi umum + data atlet), dengan alasan, kesiapan, jarak antar lomba,
 * ringkasan fase, long run puncak, dan info VDOT. Saran tidak memblokir; tanggal merah butuh konfirmasi.
 * Target waktu & lari per minggu program yang sudah ada tersimpan langsung; jarak & tanggal lewat "Buat program".
 */
export function TargetForm({ plan, today }: { plan: ProgramPlan; today: string }) {
  const { settings, saved, active } = plan;
  const [athlete] = useAthleteSettings();
  const p = useResolvedProfile();
  const locale = useLocale();
  const t = useT(PROGRAM).target;
  const bandText = useT(PROGRAM).picker.band;
  const km = (v: number) => formatNumber(locale, v);
  const [race, setRace] = useState<RaceTarget>(settings.race);
  const [goalSec, setGoalSec] = useState(parseGoal(settings.goal) ?? goalFromProfile(settings.race, p));
  const [startDate, setStartDate] = useState(saved ? settings.startDate : startOfWeekMonday(today));
  const [raceDate, setRaceDate] = useState(saved ? settings.raceDate : legacyRaceDate(settings.race, startOfWeekMonday(today)));
  const [runsPerWeek, setRunsPerWeek] = useState(settings.runsPerWeek);
  const [completedPick, setCompletedPick] = useState<boolean | undefined>(settings.completedBefore);
  const [ack, setAck] = useState(false);

  const changed = !saved || race !== settings.race || raceDate !== settings.raceDate || startDate !== settings.startDate;
  // Program yang sedang berjalan diganti: program baru dimulai minggu ini (hari ini), yang lama diarsipkan.
  const restart = saved && active && changed;
  const effStart = restart ? startOfWeekMonday(today) : startOfWeekMonday(startDate);
  // Kalender program yang sedang berjalan: tanggal baru apa pun memulai program baru minggu ini.
  const pickStart = saved && active ? startOfWeekMonday(today) : startOfWeekMonday(startDate);

  const acts = plan.activities;
  const fromData = completedDistance(race, athlete.raceResults, acts);
  const completedBefore = completedPick ?? fromData;
  const longest = longestRunKm(acts, today);
  const timeline = useMemo(() => makeTimeline({ race, startDate: effStart, rawLongestKm: longest, completedBefore, locale }), [race, effStart, longest, completedBefore, locale]);
  const pickTimeline = useMemo(() => makeTimeline({ race, startDate: pickStart, rawLongestKm: longest, completedBefore, locale }), [race, pickStart, longest, completedBefore, locale]);
  const band = timeline.bandOf(raceDate);
  const ready = readiness(race, acts, athlete.raceResults, today, locale);
  const spacing = spacingWarnings(race, athlete.raceResults, effStart, raceDate, locale);
  const prediction = useMemo(() => predictRaces({ raceResults: athlete.raceResults, activities: acts, today }), [athlete.raceResults, acts, today]);
  const gap = vdotGap(race, goalSec, prediction?.vdot);

  // Pratinjau program dari isian: long run puncak & peringatan (mis. puncak dibatasi).
  const preview = useMemo(() => {
    const shape = programShape(race, effStart, raceDate);
    if (!shape || !goalSec) return null;
    const base = baseLongRunKm(acts, effStart, today);
    return buildProgram(
      { race, goalSec, startDate: effStart, runsPerWeek, currentLongRunKm: base, weeks: shape.mainWeeks, preBaseWeeks: shape.preBaseWeeks, rawLongestKm: base, raceDate },
      p,
      locale,
    );
  }, [race, effStart, raceDate, goalSec, runsPerWeek, acts, today, p, locale]);
  const peak = preview ? Math.max(...preview.weeks.map((w) => w.longRunKm)) : 0;
  const capped = preview?.cappedWarning;

  const pickRace = (r: RaceTarget) => {
    setRace(r);
    setGoalSec(goalFromProfile(r, p));
    setAck(false);
  };
  // Program yang sudah ada: target waktu & lari per minggu langsung tersimpan bila jarak & tanggal tidak berubah.
  const setGoal = (s: number) => {
    setGoalSec(s);
    if (saved && !changed && s > 0) plan.save({ goal: formatGoal(s) });
  };
  const setRuns = (n: 3 | 4) => {
    setRunsPerWeek(n);
    if (saved && !changed) plan.save({ runsPerWeek: n });
  };

  const needAck = band.band === "red";
  const canCreate = changed && band.band !== "blocked" && goalSec > 0 && (!needAck || ack);
  const create = () =>
    plan.create({
      race,
      goal: formatGoal(goalSec),
      startDate: effStart,
      raceDate,
      runsPerWeek,
      ...(needAck ? { riskAckAt: new Date().toISOString() } : {}),
      ...(completedPick !== undefined ? { completedBefore: completedPick } : {}),
    });

  return (
    <Card title={t.title} tour="program-target">
      <div className="space-y-4">
        <Segmented label={t.program} value={race} onChange={pickRace} options={RACE_OPTIONS.map((r) => ({ value: r, label: r === "hm" ? "HM" : r === "fm" ? "FM" : RACES[r].short }))} />
        <div>
          <p className="t-label">{t.goal}</p>
          <TimePicker aria-label={t.goal} format="hms" maxHours={race === "fm" ? 7 : race === "hm" ? 4 : 2} value={goalSec} onChange={setGoal} units className="mt-1" />
        </div>
        <label className="block text-[12px] text-muted">
          {t.start}
          <input
            type="date"
            value={restart ? effStart : startDate}
            disabled={restart}
            onChange={(e) => e.target.value && setStartDate(startOfWeekMonday(e.target.value))}
            className="mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand disabled:text-muted"
          />
          {restart && <span className="mt-1 block text-[12px] text-muted">{t.restart}</span>}
        </label>

        <div>
          <p className="t-label">{t.raceDay}</p>
          <div className="mt-2">
            <RaceDatePicker key={`${race}-${pickStart}`} value={raceDate} onChange={(d) => (setRaceDate(d), setAck(false))} bandOf={pickTimeline.bandOf} earliestDate={pickTimeline.earliestDate} />
          </div>
          <div className={`mt-3 rounded-inner px-3 py-2 ${BAND_CELL[band.band]}`} role="status">
            <p className="text-[14px] font-semibold">
              {t.bandLine(formatDateId(raceDate, locale), band.weeks, bandText[band.band])}
            </p>
            {band.reasons.map((r) => (
              <p key={r} className="mt-1 text-[13px]">
                {r}
              </p>
            ))}
          </div>
          <p className="mt-1 text-[12px] text-faint">{t.colorsNote}</p>
        </div>

        <Switch
          checked={completedBefore}
          onChange={(v) => setCompletedPick(v)}
          label={t.completed}
          description={completedPick === undefined ? (fromData ? t.fromData : t.notSeen) : t.ownPick}
        />

        <Segmented
          label={t.runsPerWeek}
          value={runsPerWeek}
          onChange={setRuns}
          options={[
            { value: 3, label: t.runs(3) },
            { value: 4, label: t.runs(4) },
          ]}
        />

        {band.band !== "blocked" && (
          <div className="space-y-3 rounded-inner border border-line p-3">
            <p className="t-label text-ink">{phaseSummary(race, band.mainWeeks, band.preBaseWeeks, locale)}</p>
            <p className="text-[14px]">
              <span className="text-muted">{t.peak}</span>
              <span className="tabular font-semibold">{km(peak)} km</span>
            </p>
            {capped && <p className="text-[13px] text-ink">{capped}</p>}
            {ready.checks.length > 0 && (
              <ul className="space-y-1 text-[13px]" aria-label={t.readiness}>
                {ready.checks.map((c) => (
                  <li key={c.label} className="flex gap-2">
                    <span aria-hidden className={c.met ? "text-success-ink" : "text-danger-ink"}>
                      {c.met ? "✓" : "✕"}
                    </span>
                    <span className="min-w-0 flex-1">
                      {c.label} <span className="tabular text-muted">· {c.value}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {[...ready.notes, ...spacing].map((n) => (
              <p key={n} className="text-[13px] text-ink">
                {n}
              </p>
            ))}
            <p className="text-[13px] text-muted">
              {t.vdotLine(formatGoal(goalSec))}<span className="tabular text-ink">{gap.required.toFixed(1)}</span>
              {gap.current !== undefined ? (
                <>
                  {t.vdotNow}<span className="tabular text-ink">{gap.current.toFixed(1)}</span>
                </>
              ) : (
                t.vdotNone
              )}
              {t.weeksLeft(band.weeks)}
            </p>
          </div>
        )}

        {changed && needAck && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-ink">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="h-5 w-5 accent-[var(--color-brand)]" />
            {t.ack}
          </label>
        )}
        {changed ? (
          <button type="button" disabled={!canCreate} onClick={create} className={`${BUTTON.base} ${BUTTON.primary} w-full`}>
            {saved ? t.createNew : t.create}
          </button>
        ) : (
          <p className="text-[12px] text-faint">{t.autoSaved}</p>
        )}
      </div>
    </Card>
  );
}
