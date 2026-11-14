"use client";

import { parseRunInputs, restoreOffline } from "@/lib/offline";
import { withCheckin } from "@/lib/checkin";
import { filledCheckin, useCheckins } from "@/lib/checkin-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PREF_KEYS } from "@/lib/preference-keys";
import { readStored, writeStored } from "@/lib/preferences";
import { SegmentSkyline } from "@/components/charts/SegmentSkyline";
import { planSegments } from "@/components/charts/skyline-scale";
import { Chip, StatRow } from "@/components/ui/Card";
import { formatPaceTag } from "@/components/ui/format";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { INTENSITY_TONE } from "@/components/ui/tones";
import { blockLabel } from "@/lib/generator/block";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  DURATIONS,
  PHASE_LABEL,
  generateRunWorkout,
  hasVariations,
  nextDistinctSeed,
  runTargets,
  runToHuaweiSets,
  runToText,
  type Difficulty,
  type Duration,
  type RunStep,
} from "@/lib/generator";
import { suggestFor, withStSessions, type Advice, type PlanToday, type TodayDone } from "@/lib/coach";
import { todayWib } from "@/lib/date";
import { useStSessions } from "@/lib/st-session-store";
import type { RunPrefill } from "@/lib/program/to-generator";
import { parseRange } from "@/lib/run-zones";
import { useBlockContext, useBlockMode, useResolvedProfile } from "@/lib/settings-store";
import { SendToWatch } from "@/components/intervals/SendToWatch";
import { exportRun, externalId } from "@/lib/intervals/workout-export";
import { CoachStrip } from "./CoachStrip";
import { GeneratorActions, OutputShell, revealIfScrolledPast } from "./shared";
import { useLocale, useT } from "@/lib/i18n/client";
import { GENERATOR } from "@/lib/i18n/messages/generator";

type Intensity = "recovery" | "easy" | "tempo" | "hard";

function intensityOf(s: RunStep): Intensity {
  if (s.kind !== "run") return "recovery";
  if (s.rpe?.startsWith("3")) return "easy";
  if (s.rpe?.startsWith("6")) return "tempo";
  return "hard";
}

/** Warna langkah rencana = tone intensitas; jalan/jog = track (sama dengan Segment Skyline). */
const INTENSITY_STYLE: Record<Intensity, { dot: string; label: string }> = {
  recovery: { dot: "bg-track", label: "" },
  easy: { dot: "bg-success", label: "Easy · Z2" },
  tempo: { dot: "bg-warning", label: "Tempo" },
  hard: { dot: "bg-danger", label: "Interval" },
};

export function RunGenerator({
  advice: serverAdvice,
  cadenceSpm,
  initialSeed,
  prefill,
  todayDone,
}: {
  advice: Advice[];
  cadenceSpm?: number;
  initialSeed: number;
  /** Isian dari sesi program (0.13.1); tetap bisa diubah. */
  prefill?: RunPrefill | null;
  /** Lari / ST tercatat hari ini (0.14.1, aturan hari yang sama). */
  todayDone?: TodayDone;
}) {
  const stSessions = useStSessions();
  const checkins = useCheckins();
  const locale = useLocale();
  const t = useT(GENERATOR);
  // Sesi mode latihan di perangkat: ST kaki → lari maks Moderate, dan jeda ≥ 3 jam di hari yang sama (0.14.1).
  // Check-in hari ini (0.15.2) hanya menurunkan.
  const advice = useMemo(
    () => withCheckin(withStSessions(serverAdvice, { sessions: stSessions, today: todayWib(), done: todayDone, current: "run", locale }), filledCheckin(checkins, todayWib()), locale),
    [serverAdvice, stSessions, todayDone, checkins, locale],
  );
  const [duration, setDuration] = useState<Duration>(prefill?.duration ?? 45);
  const [difficulty, setDifficulty] = useState<Difficulty>(prefill?.difficulty ?? "easy");
  const [seed, setSeed] = useState(initialSeed);
  // Offline (0.16): workout terakhir muncul lagi saat halaman dibuka tanpa sinyal; online tidak berubah.
  useEffect(() => {
    const saved = restoreOffline(parseRunInputs(readStored(PREF_KEYS.lastRunInputs)), { offline: !navigator.onLine, prefilled: !!prefill });
    if (!saved) return;
    setDuration(saved.duration);
    setDifficulty(saved.difficulty);
    setSeed(saved.seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => writeStored(PREF_KEYS.lastRunInputs, JSON.stringify({ duration, difficulty, seed })), [duration, difficulty, seed]);
  const [blockEnabled, setBlockEnabled] = useBlockMode();
  const block = useBlockContext();
  const free = !blockEnabled;

  const p = useResolvedProfile();

  // Dari program: isian sama dengan rencana (pola rencana dipakai) atau sama dengan versi saran.
  const plan: PlanToday | undefined = prefill ? { kind: prefill.kind as PlanToday["kind"], difficulty: prefill.planDifficulty, duration: prefill.planDuration } : undefined;
  const fromPlan = !!prefill && duration === prefill.planDuration && difficulty === prefill.planDifficulty;
  const planSug = plan ? suggestFor(advice, "run", { difficulty, duration }, { plan }) : {};
  const fromSuggestion =
    !!plan && !fromPlan && !!(planSug.difficulty || planSug.duration) && difficulty === (planSug.difficulty ?? plan.difficulty) && duration === (planSug.duration ?? plan.duration);
  const pattern = fromPlan ? prefill?.pattern : undefined;

  const workout = useMemo(
    () => generateRunWorkout({ duration, difficulty, seed, block, cadenceSpm, free, pattern, locale }, p),
    [duration, difficulty, seed, block, cadenceSpm, free, pattern, p, locale],
  );
  // Format set Huawei Health untuk tombol "Copy Set" (cadangan bila tidak memakai Kirim ke jam).
  const setText = useMemo(() => runToHuaweiSets(workout), [workout]);
  const outputRef = useRef<HTMLElement>(null);
  // Kirim ke jam (0.17): dari program = event sesi itu; generator bebas = satu event per tanggal.
  const [sendDate, setSendDate] = useState(() => todayWib());
  const easyPace = runTargets(p).easy.pace;
  const exported = useMemo(() => exportRun(workout, { easyPace, locale }), [workout, easyPace, locale]);
  const sendId = prefill?.sessionId ? externalId.session(prefill.sessionId) : externalId.generator(sendDate);

  const render = useCallback(
    (s: number) => runToText(generateRunWorkout({ duration, difficulty, seed: s, block, cadenceSpm, free, pattern, locale }, p), locale),
    [duration, difficulty, block, cadenceSpm, free, pattern, p, locale],
  );
  const canRegenerate = useMemo(() => hasVariations(render), [render]);
  const regenerate = () => {
    setSeed(nextDistinctSeed(render, seed));
    revealIfScrolledPast(outputRef.current);
  };

  // Timeline: semua langkah setelah repetisi dibuka.
  const timeline = workout.blocks.flatMap((b) => Array.from({ length: b.repeat }, () => b.steps).flat());
  const used = new Set(timeline.map(intensityOf));
  const segments = useMemo(() => planSegments(workout), [workout]);
  // Judul Display = nama pola (bagian sebelum " · Level durasi").
  const [displayTitle] = workout.title.split(" · ");
  const minutesOf = (k: Intensity[]) => timeline.filter((s) => k.includes(intensityOf(s))).reduce((a, s) => a + s.durationMin, 0);
  const workMin = minutesOf(["tempo", "hard"]);
  const fastest = timeline
    .filter((s) => s.kind === "run")
    .map((s) => (s.pace ? parseRange(s.pace)?.fast : undefined))
    .filter((v): v is number => v !== undefined);
  const targetPace = fastest.length ? Math.min(...fastest) : undefined;

  return (
    <div className="space-y-4">
      <CoachStrip
        advice={advice}
        target="run"
        current={{ difficulty, duration }}
        plan={prefill && plan ? { label: prefill.label, plan } : undefined}
        onApply={(s) => {
          if (s.difficulty) setDifficulty(s.difficulty);
          if (s.duration) setDuration(s.duration);
        }}
      />
      <div className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
        {prefill && (fromPlan || fromSuggestion) && (
          <Chip tone="accent">
            {t.form.fromProgram(prefill.week)}
            {fromSuggestion ? t.form.adjusted : ""}
          </Chip>
        )}
        <Segmented label={t.form.duration} value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d}'` }))} />
        <Segmented
          label={t.form.difficulty}
          value={difficulty}
          onChange={setDifficulty}
          options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
          tones={INTENSITY_TONE}
        />
        <div className="border-t border-line pt-4">
          <Switch
            checked={blockEnabled}
            onChange={setBlockEnabled}
            label={t.form.blockSwitch}
            description={blockEnabled ? t.form.runBlockOn(blockLabel(block, locale)) : t.form.runBlockOff}
          />
        </div>
      </div>


      <OutputShell
        ref={outputRef}
        swapKey={`${duration}-${difficulty}-${seed}-${free}`}
        display
        kicker={t.run.kicker(DIFFICULTY_LABEL[difficulty], duration)}
        tag={{ label: DIFFICULTY_LABEL[difficulty], tone: INTENSITY_TONE[difficulty] }}
        title={displayTitle}
        subtitle={t.run.seed(seed)}
      >
        <StatRow
          items={[
            { label: t.run.duration, value: duration, unit: t.run.minutes },
            workMin > 0 ? { label: t.run.work, value: workMin, unit: t.run.minutes } : { label: "Z2", value: minutesOf(["easy"]), unit: t.run.minutes },
            { label: t.run.targetPace, value: formatPaceTag(targetPace), unit: "/km", muted: !targetPace },
          ]}
        />
        <SegmentSkyline
          className="mt-5"
          mode="plan"
          segments={segments}
          animateKey={seed}
          ariaLabel={t.run.skyline(displayTitle, duration, timeline.length, workMin)}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-line pt-3">
          <span className="t-label">{t.run.colorKey}</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {(Object.keys(INTENSITY_STYLE) as Intensity[])
              .filter((k) => used.has(k))
              .map((k) => (
                <span key={k} className="t-label inline-flex items-center gap-1.5">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${INTENSITY_STYLE[k].dot}`} />
                  {k === "recovery" ? t.run.walkJog : INTENSITY_STYLE[k].label}
                </span>
              ))}
          </span>
        </div>

        <ol className="mt-4 space-y-4">
            {workout.blocks.map((b, bi) => {
              const blockMin = b.repeat * b.steps.reduce((s, st) => s + st.durationMin, 0);
              return (
                <li key={bi}>
                  <div className="flex items-baseline justify-between">
                    <p className="t-label">
                      {b.title.startsWith(t.phase[b.phase]) || b.title.startsWith(PHASE_LABEL[b.phase]) ? b.title : `${t.phase[b.phase]} · ${b.title}`}
                    </p>
                    <span className="tabular text-[13px] text-muted">{blockMin}&apos;</span>
                  </div>
                  <div className={`mt-2 rounded-inner ${b.repeat > 1 ? "border border-dashed border-line-strong p-2" : ""}`}>
                    {b.repeat > 1 && <p className="mb-1.5 px-1 text-[13px] font-semibold text-brand-ink">{t.run.repeat(b.repeat)}</p>}
                    <ul className="space-y-1.5">
                      {b.steps.map((s, si) => {
                        const it = intensityOf(s);
                        return (
                          <li key={si} className="flex gap-3 rounded-inner bg-subtle px-3 py-2.5">
                            <span className={`w-1 shrink-0 self-stretch rounded-full ${INTENSITY_STYLE[it].dot}`} aria-hidden />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-body font-semibold">{s.label}</p>
                                <span className="tabular shrink-0 text-base font-semibold">{s.durationMin}&apos;</span>
                              </div>
                              <p className="tabular text-[13px] text-muted">
                                {[s.pace && s.pace !== "santai" ? s.pace : null, s.hr ? `HR ${s.hr}` : null, s.rpe ? `RPE ${s.rpe}` : null]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>

        <ul className="mt-4 space-y-1.5 rounded-inner bg-info-soft p-3 text-[13px] text-ink">
          {workout.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden className="text-info">›</span>
              {n}
            </li>
          ))}
        </ul>
      </OutputShell>

      <SendToWatch externalId={sendId} date={sendDate} onDateChange={setSendDate} result={exported} />

      <GeneratorActions
        copyText={setText}
        copyLabel={t.actions.copySet}
        tour="run-generator"
        onRegenerate={regenerate}
        canRegenerate={canRegenerate}
      />
    </div>
  );
}
