"use client";

import { parseStrengthInputs, restoreOffline } from "@/lib/offline";
import { withCheckin } from "@/lib/checkin";
import { filledCheckin, useCheckins } from "@/lib/checkin-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BUTTON, Chip } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { INTENSITY_TONE } from "@/components/ui/tones";
import { blockLabel } from "@/lib/generator/block";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  DURATIONS,
  PHASE_LABEL,
  STRENGTH_TYPES,
  STRENGTH_TYPE_LABEL,
  estimateStrengthMinutes,
  formatLoad,
  formatVolume,
  generateStrengthWorkout,
  hasVariations,
  nextDistinctSeed,
  strengthToText,
  type Difficulty,
  type Duration,
  type StrengthType,
  type StrengthWorkout,
} from "@/lib/generator";
import type { StrengthPrefill } from "@/lib/program/to-generator";
import { applyPhaseRule, stPhaseLabel, ST_PHASE_RULES } from "@/lib/program/st-phase";
import { withStSessions, type Advice, type TodayDone } from "@/lib/coach";
import { todayWib } from "@/lib/date";
import { PREF_KEYS } from "@/lib/preference-keys";
import { readStored, useStoredString, writeStored } from "@/lib/preferences";
import { useStSessions } from "@/lib/st-session-store";
import { newEntryId } from "@/lib/training-log";
import { parseActiveWorkout, startWorkout } from "@/lib/workout-state";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { sessionCoverage } from "@/lib/athlete-settings";
import { baseProfile, type Movement, type ResolvedProfile } from "@/lib/profile";
import { useBlockContext, useBlockMode, useResolvedProfile } from "@/lib/settings-store";
import { applyProgression } from "@/lib/progression";
import { usePrs } from "@/lib/pr-store";
import { isAboveLibrary, loadNote } from "@/components/strength/load-note";
import { useTrainingLog } from "@/lib/training-log";
import { MovementSheet } from "@/components/movements/MovementSheet";
import { MovementThumb } from "@/components/movements/MovementThumb";
import type { StrengthItem } from "@/lib/generator/types";
import { SendToWatch } from "@/components/intervals/SendToWatch";
import { exportStNote, externalId } from "@/lib/intervals/workout-export";
import { CoachCard } from "./CoachCard";
import { LogForm } from "./LogForm";
import { GeneratorActions, OutputShell, revealIfScrolledPast } from "./shared";
import { useLocale, useT } from "@/lib/i18n/client";
import { schemeName } from "@/lib/i18n/messages/run-gen";
import { GENERATOR } from "@/lib/i18n/messages/generator";

function movementMap(p: ResolvedProfile) {
  return new Map<string, Movement>(
    (["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const).flatMap((c) => p.movementLibrary[c] ?? []).map((m) => [m.name, m]),
  );
}

/** Generator melempar error bila gerakan aktif terlalu sedikit untuk durasi ini: tampilkan pesan, bukan crash. */
function tryGenerate(fn: () => StrengthWorkout): StrengthWorkout | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

function restLabel(sec: number, seconds: (n: number) => string) {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : seconds(sec);
}

export function StrengthGenerator({
  advice: serverAdvice,
  initialSeed,
  prefill,
  todayDone,
}: {
  advice: Advice[];
  initialSeed: number;
  /** Isian dari sesi ST program (0.13.1); tetap bisa diubah. */
  prefill?: StrengthPrefill | null;
  /** Lari / ST tercatat hari ini (0.14.1, aturan hari yang sama). */
  todayDone?: TodayDone;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT(GENERATOR);
  const sessions = useStSessions();
  const checkins = useCheckins();
  const advice = useMemo(
    () => withCheckin(withStSessions(serverAdvice, { sessions, today: todayWib(), done: todayDone, current: "strength", locale }), filledCheckin(checkins, todayWib()), locale),
    [serverAdvice, sessions, todayDone, checkins, locale],
  );
  const [activeRaw, setActiveRaw] = useStoredString(PREF_KEYS.activeWorkout, "");
  const [stNote] = useStoredString(PREF_KEYS.stCalendarNote, "");
  const active = useMemo(() => parseActiveWorkout(activeRaw), [activeRaw]);
  const [type, setType] = useState<StrengthType>(prefill?.type ?? "fullBody");
  const [duration, setDuration] = useState<Duration>(prefill?.duration ?? 45);
  const [difficulty, setDifficulty] = useState<Difficulty>(prefill?.difficulty ?? "moderate");
  const fromPlan = !!prefill && type === prefill.type && duration === prefill.duration && difficulty === prefill.difficulty;
  // ST mengikuti fase program (0.14.1) selama isian dari program tidak diubah.
  const phaseRule = fromPlan && prefill?.phase ? ST_PHASE_RULES[prefill.phase] : undefined;
  const [seed, setSeed] = useState(initialSeed);
  // Offline (0.16): workout terakhir muncul lagi saat halaman dibuka tanpa sinyal; online tidak berubah.
  useEffect(() => {
    const saved = restoreOffline(parseStrengthInputs(readStored(PREF_KEYS.lastStrengthInputs)), { offline: !navigator.onLine, prefilled: !!prefill });
    if (!saved) return;
    setType(saved.type);
    setDuration(saved.duration);
    setDifficulty(saved.difficulty);
    setSeed(saved.seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => writeStored(PREF_KEYS.lastStrengthInputs, JSON.stringify({ type, duration, difficulty, seed })), [type, duration, difficulty, seed]);

  const [logging, setLogging] = useState(false);
  const [blockEnabled, setBlockEnabled] = useBlockMode();
  const block = useBlockContext();
  const free = !blockEnabled;
  const [saved, setSaved] = useState(false);
  const [detail, setDetail] = useState<StrengthItem | null>(null);
  const log = useTrainingLog();
  const prs = usePrs();
  const p = useResolvedProfile();
  const movements = useMemo(() => movementMap(p), [p]);

  const generated = useMemo(
    () => tryGenerate(() => generateStrengthWorkout({ type, duration, difficulty, seed, block, free, locale }, p)),
    [type, duration, difficulty, seed, block, free, p, locale],
  );
  // Beban gerakan ★ disesuaikan dengan riwayat sesi atau PR (tetap dalam batas library, atau sejak 0.14.0 batas alat & keamanan).
  const workout = useMemo(() => {
    if (!generated) return null;
    const holdLoad = phaseRule?.holdLoad ? stPhaseLabel(phaseRule.key, locale).split(":")[0] : undefined;
    const w = applyProgression(generated, movements, log, prs, { blockStart: block.start, free, holdLoad });
    return phaseRule ? applyPhaseRule(w, phaseRule, locale) : w;
  }, [generated, movements, log, prs, block.start, free, phaseRule, locale]);
  const startSession = () => {
    if (!workout) return;
    setActiveRaw(JSON.stringify(startWorkout({ id: newEntryId(), nowIso: new Date().toISOString(), workout, blockIndex: block.index, planSessionId: fromPlan ? prefill?.sessionId : undefined })));
    router.push("/strength/sesi");
  };
  const text = useMemo(() => (workout ? strengthToText(workout) : ""), [workout]);
  const outputRef = useRef<HTMLElement>(null);

  const render = useCallback(
    (s: number) => {
      const w = tryGenerate(() => generateStrengthWorkout({ type, duration, difficulty, seed: s, block, free, locale }, p));
      return w ? strengthToText(w) : "";
    },
    [type, duration, difficulty, block, free, p, locale],
  );
  const canRegenerate = useMemo(() => hasVariations(render), [render]);
  const regenerate = () => {
    setSeed(nextDistinctSeed(render, seed));
    revealIfScrolledPast(outputRef.current);
  };
  const est = workout ? Math.round(estimateStrengthMinutes(workout)) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
        {prefill && fromPlan && (
          <Chip tone="accent">
            {t.form.fromProgram(prefill.week)}
            {phaseRule ? ` · ${phaseRule.label}` : ""}
          </Chip>
        )}
        <Segmented
          label={t.form.type}
          wrap
          value={type}
          onChange={setType}
          options={STRENGTH_TYPES.map((t) => ({ value: t, label: STRENGTH_TYPE_LABEL[t] }))}
        />
        <div className="space-y-4">
          <Segmented label={t.form.duration} value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d}'` }))} />
          <Segmented
            label={t.form.difficulty}
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
            tones={INTENSITY_TONE}
          />
        </div>
        <div className="border-t border-line pt-4">
          <Switch
            checked={blockEnabled}
            onChange={setBlockEnabled}
            label={t.form.blockSwitch}
            description={blockEnabled ? t.form.stBlockOn(blockLabel(block, locale)) : t.form.stBlockOff}
          />
        </div>
      </div>

      <CoachCard
        advice={advice}
        target="strength"
        current={{ difficulty, duration, type }}
        onApply={(s) => {
          if (s.difficulty) setDifficulty(s.difficulty);
          if (s.type) setType(s.type);
        }}
      />

      <CoverageNote type={type} p={p} limited={!!workout?.limited} duration={duration} />

      {!workout ? (
        <div role="alert" className="rounded-card border border-danger bg-danger-soft p-5 text-body text-ink">
          <p className="font-semibold text-danger-ink">{t.st.notEnough(STRENGTH_TYPE_LABEL[type], duration)}</p>
          <p className="mt-1 text-[14px]">
            {t.st.enableMore}{" "}
            <Link href="/setting#gerakan" className="font-semibold underline">
              {t.st.libraryLink}
            </Link>
            {t.st.orShorter}
          </p>
        </div>
      ) : (
      <>
      <OutputShell ref={outputRef} swapKey={`${type}-${duration}-${difficulty}-${seed}-${free}`} tag={{ label: DIFFICULTY_LABEL[difficulty], tone: INTENSITY_TONE[difficulty] }} title={workout.title} subtitle={t.st.subtitle(est, schemeName(workout.scheme, locale), String(workout.items.find((i) => i.phase === "main")?.rpe ?? "-"), seed)}>
        {(["warmup", "main", "cooldown"] as const).map((phase) => {
          const items = workout.items.filter((i) => i.phase === phase);
          if (!items.length) return null;
          return (
            <div key={phase} className="mt-4 first:mt-0">
              <p className="t-label mb-2">{t.phase[phase]}</p>
              {phase === "main" ? (
                <ol className="space-y-2">
                  {items.map((it, i) => (
                    <li key={it.movement}>
                      <button
                        type="button"
                        onClick={() => setDetail(it)}
                        aria-haspopup="dialog"
                        className={`pressable flex w-full items-start gap-3 rounded-inner bg-subtle px-3 py-3 text-left hover:bg-subtle-strong ${it.anchor ? "border-l-[3px] border-brand" : ""}`}
                      >
                        <span className="relative shrink-0">
                          <MovementThumb name={it.movement} />
                          <span
                            className={`tabular absolute -top-1.5 -left-1.5 grid h-6 w-6 place-items-center rounded-lg text-[12px] font-semibold ring-2 ring-subtle ${it.anchor ? "bg-brand text-on-brand" : "bg-subtle-strong text-ink"}`}
                          >
                            {i + 1}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-body font-semibold">
                              {it.anchor && (
                                <span className="mr-1 text-brand-ink" title={t.st.anchor} aria-label={t.st.anchor}>
                                  ★
                                </span>
                              )}
                              {it.movement}
                            </p>
                            <span className="tabular shrink-0 text-base font-semibold">{formatVolume(it)}</span>
                          </div>
                          <p className="tabular text-[13px] text-muted">
                            {formatLoad(it.load)} · RPE {it.rpe}
                            {it.sets > 1 && t.st.rest(restLabel(it.restSec, t.st.seconds))}
                          </p>
                          {isAboveLibrary(movements.get(it.movement), it) && (
                            <p className="mt-1">
                              <Chip tone="accent">{t.st.aboveRange}</Chip>
                            </p>
                          )}
                          {it.variantOf && <p className="mt-1 text-[13px] text-ink">{t.st.variantOf(it.variantOf)}</p>}
                          {it.tempo && <p className="mt-1 text-[13px] font-semibold text-ink">{t.st.tempo}</p>}
                          {it.progression && (
                            <p className="mt-1 text-[13px] font-semibold text-brand-ink">
                              <span className="t-label mr-1 text-brand-ink">{t.st.gita}</span>
                              {it.progression}
                            </p>
                          )}
                          {it.cue && <p className="mt-1 text-[13px] text-faint">{it.cue}</p>}
                          <p className="t-label mt-1.5">{t.st.technique}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {items.map((it) => (
                    <li key={it.movement}>
                      <button
                        type="button"
                        onClick={() => setDetail(it)}
                        aria-haspopup="dialog"
                        className="pressable relative min-h-8 rounded-full bg-subtle-strong px-3 py-1 text-[13px] after:absolute after:-inset-1.5 after:content-[''] hover:bg-line-strong/40"
                      >
                        {it.movement} <span className="tabular text-muted">{formatVolume(it)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <div className="mt-4 space-y-2">
          {active ? (
            <>
              <Link href="/strength/sesi" className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg} w-full`}>
                {t.st.resume}
              </Link>
              <div className="flex justify-center">
                <ConfirmButton size="md" label={t.st.replace} confirmLabel={t.st.replaceConfirm} onConfirm={startSession} />
              </div>
            </>
          ) : (
            <button type="button" data-tour="strength-start" onClick={startSession} className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg} w-full`}>
              {t.st.start}
            </button>
          )}
        </div>

        {logging ? (
          <LogForm
            workout={workout}
            block={block}
            library={p.movementLibrary}
            onDone={() => setLogging(false)}
            onSaved={() => {
              setLogging(false);
              setSaved(true);
            }}
          />
        ) : (
          workout.items.some((i) => i.anchor) && (
            <button
              type="button"
              data-tour="strength-log"
              onClick={() => {
                setSaved(false);
                setLogging(true);
              }}
              className={`${BUTTON.base} ${BUTTON.secondary} mt-4 w-full`}
            >
              {saved ? t.st.savedAgain : t.st.log}
            </button>
          )
        )}

        <ul className="mt-4 space-y-1.5 rounded-inner bg-info-soft p-3 text-[13px] text-ink">
          {workout.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden className="text-info">›</span>
              {n}
            </li>
          ))}
        </ul>
      </OutputShell>

      {stNote === "1" && <StCalendarNote title={`ST ${STRENGTH_TYPE_LABEL[type]}`} minutes={duration} />}

      <GeneratorActions
        copyText={text}
        copyLabel={t.actions.copyText}
        tour="strength-generator"
        onRegenerate={regenerate}
        canRegenerate={canRegenerate}
      />
      </>
      )}
      {detail && (
        <MovementSheet
          name={detail.movement}
          item={detail}
          activeConditions={p.activeConditions}
          loadNote={loadNote(movements.get(detail.movement), detail, log, prs, locale) ?? undefined}
          suggestion={detail.progression}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

/**
 * Pesan jujur soal alat: jenis sesi tanpa gerakan utama (mis. Upper Pull tanpa pull-up bar, dumbbell,
 * atau band) dan sesi yang lebih pendek dari durasi pilihan karena gerakan aktif terbatas.
 */
function CoverageNote({ type, p, limited, duration }: { type: Parameters<typeof sessionCoverage>[0]; p: ResolvedProfile; limited: boolean; duration: number }) {
  const c = sessionCoverage(type, p, baseProfile);
  const t = useT(GENERATOR).st;
  if (c.ok && !limited) return null;
  return (
    <div role="status" className="rounded-card border border-line bg-surface p-4 text-[14px] leading-relaxed">
      {!c.ok && (
        <>
          <p className="font-semibold text-ink">{t.cannot(STRENGTH_TYPE_LABEL[type])}</p>
          {c.needs.length > 0 && <p className="mt-1 text-muted">{t.needs(c.needs.join(", "))}</p>}
          {c.selectable.length > 0 && <p className="mt-1 text-muted">{t.orEnable(c.selectable.join(", "))}</p>}
          <Link href="/setting#alat" className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-ink hover:underline">
            {t.setup}
          </Link>
        </>
      )}
      {c.ok && limited && <p className="text-muted">{t.shorter(duration)}</p>}
    </div>
  );
}

/** Catatan ST di kalender intervals.icu (0.17, opsional): teks saja, ST tidak dikirim sebagai workout terstruktur. */
function StCalendarNote({ title, minutes }: { title: string; minutes: number }) {
  const [date, setDate] = useState(() => todayWib());
  const t = useT(GENERATOR).st;
  const result = useMemo(() => exportStNote(title, minutes), [title, minutes]);
  return <SendToWatch title={t.calendarTitle} sendLabel={t.calendarSend} deviceNote={false} externalId={externalId.stNote(date)} date={date} onDateChange={setDate} result={result} />;
}
