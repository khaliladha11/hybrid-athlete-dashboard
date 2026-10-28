"use client";

import { withCheckin } from "@/lib/checkin";
import { filledCheckin, useCheckins } from "@/lib/checkin-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { applyPhaseRule, ST_PHASE_RULES } from "@/lib/program/st-phase";
import { withStSessions, type Advice, type TodayDone } from "@/lib/coach";
import { todayWib } from "@/lib/date";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
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
import { CoachCard } from "./CoachCard";
import { LogForm } from "./LogForm";
import { GeneratorActions, OutputShell, revealIfScrolledPast } from "./shared";

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

function restLabel(sec: number) {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec} dtk`;
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
  const sessions = useStSessions();
  const checkins = useCheckins();
  const advice = useMemo(
    () => withCheckin(withStSessions(serverAdvice, { sessions, today: todayWib(), done: todayDone, current: "strength" }), filledCheckin(checkins, todayWib())),
    [serverAdvice, sessions, todayDone, checkins],
  );
  const [activeRaw, setActiveRaw] = useStoredString(PREF_KEYS.activeWorkout, "");
  const active = useMemo(() => parseActiveWorkout(activeRaw), [activeRaw]);
  const [type, setType] = useState<StrengthType>(prefill?.type ?? "fullBody");
  const [duration, setDuration] = useState<Duration>(prefill?.duration ?? 45);
  const [difficulty, setDifficulty] = useState<Difficulty>(prefill?.difficulty ?? "moderate");
  const fromPlan = !!prefill && type === prefill.type && duration === prefill.duration && difficulty === prefill.difficulty;
  // ST mengikuti fase program (0.14.1) selama isian dari program tidak diubah.
  const phaseRule = fromPlan && prefill?.phase ? ST_PHASE_RULES[prefill.phase] : undefined;
  const [seed, setSeed] = useState(initialSeed);

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
    () => tryGenerate(() => generateStrengthWorkout({ type, duration, difficulty, seed, block, free }, p)),
    [type, duration, difficulty, seed, block, free, p],
  );
  // Beban gerakan ★ disesuaikan dengan riwayat sesi atau PR (tetap dalam batas library, atau sejak 0.14.0 batas alat & keamanan).
  const workout = useMemo(() => {
    if (!generated) return null;
    const holdLoad = phaseRule?.holdLoad ? phaseRule.label.split(":")[0] : undefined;
    const w = applyProgression(generated, movements, log, prs, { blockStart: block.start, free, holdLoad });
    return phaseRule ? applyPhaseRule(w, phaseRule) : w;
  }, [generated, movements, log, prs, block.start, free, phaseRule]);
  const startSession = () => {
    if (!workout) return;
    setActiveRaw(JSON.stringify(startWorkout({ id: newEntryId(), nowIso: new Date().toISOString(), workout, blockIndex: block.index, planSessionId: fromPlan ? prefill?.sessionId : undefined })));
    router.push("/strength/sesi");
  };
  const text = useMemo(() => (workout ? strengthToText(workout) : ""), [workout]);
  const outputRef = useRef<HTMLElement>(null);

  const render = useCallback(
    (s: number) => {
      const w = tryGenerate(() => generateStrengthWorkout({ type, duration, difficulty, seed: s, block, free }, p));
      return w ? strengthToText(w) : "";
    },
    [type, duration, difficulty, block, free, p],
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
            Dari program · Minggu {prefill.week}
            {phaseRule ? ` · ${phaseRule.label}` : ""}
          </Chip>
        )}
        <Segmented
          label="Tipe"
          wrap
          value={type}
          onChange={setType}
          options={STRENGTH_TYPES.map((t) => ({ value: t, label: STRENGTH_TYPE_LABEL[t] }))}
        />
        <div className="space-y-4">
          <Segmented label="Durasi" value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d}'` }))} />
          <Segmented
            label="Kesulitan"
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
            label="Program blok mingguan"
            description={
              blockEnabled
                ? `${blockLabel(block)}. Gerakan ★ dikunci per blok, ada minggu deload.`
                : "Mode bebas: gerakan ★ dipilih per sesi, tanpa deload. Log tetap tercatat."
            }
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
          <p className="font-semibold text-danger-ink">✕ Gerakan aktif belum cukup untuk {STRENGTH_TYPE_LABEL[type]} {duration}&apos;.</p>
          <p className="mt-1 text-[14px]">
            Aktifkan lebih banyak gerakan atau alat di{" "}
            <Link href="/setting#gerakan" className="font-semibold underline">
              Setting › Movement library
            </Link>
            , atau pilih durasi lebih pendek.
          </p>
        </div>
      ) : (
      <>
      <OutputShell ref={outputRef} swapKey={`${type}-${duration}-${difficulty}-${seed}-${free}`} tag={{ label: DIFFICULTY_LABEL[difficulty], tone: INTENSITY_TONE[difficulty] }} title={workout.title} subtitle={`Estimasi ±${est} menit · Skema ${workout.scheme} · RPE ${workout.items.find((i) => i.phase === "main")?.rpe ?? "-"} · seed #${seed}`}>
        {(["warmup", "main", "cooldown"] as const).map((phase) => {
          const items = workout.items.filter((i) => i.phase === phase);
          if (!items.length) return null;
          return (
            <div key={phase} className="mt-4 first:mt-0">
              <p className="t-label mb-2">{PHASE_LABEL[phase]}</p>
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
                                <span className="mr-1 text-brand-ink" title="Gerakan utama blok ini" aria-label="Gerakan utama blok ini">
                                  ★
                                </span>
                              )}
                              {it.movement}
                            </p>
                            <span className="tabular shrink-0 text-base font-semibold">{formatVolume(it)}</span>
                          </div>
                          <p className="tabular text-[13px] text-muted">
                            {formatLoad(it.load)} · RPE {it.rpe}
                            {it.sets > 1 && ` · rest ${restLabel(it.restSec)}`}
                          </p>
                          {isAboveLibrary(movements.get(it.movement), it) && (
                            <p className="mt-1">
                              <Chip tone="accent">Di atas rentang awal</Chip>
                            </p>
                          )}
                          {it.variantOf && <p className="mt-1 text-[13px] text-ink">Varian lebih sulit dari {it.variantOf}</p>}
                          {it.tempo && <p className="mt-1 text-[13px] font-semibold text-ink">Tempo: turun 3 detik, jeda 2 detik di bawah</p>}
                          {it.progression && (
                            <p className="mt-1 text-[13px] font-semibold text-brand-ink">
                              <span className="t-label mr-1 text-brand-ink">Saran Gita</span>
                              {it.progression}
                            </p>
                          )}
                          {it.cue && <p className="mt-1 text-[13px] text-faint">{it.cue}</p>}
                          <p className="t-label mt-1.5">Lihat teknik ›</p>
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
                Lanjutkan sesi yang berjalan
              </Link>
              <div className="flex justify-center">
                <ConfirmButton size="md" label="Mulai sesi ini sebagai gantinya" confirmLabel="Ya, ganti sesi berjalan" onConfirm={startSession} />
              </div>
            </>
          ) : (
            <button type="button" data-tour="strength-start" onClick={startSession} className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg} w-full`}>
              Mulai sesi
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
              {saved ? "✓ Tersimpan. Catat lagi?" : "Catat sesi (gerakan ★)"}
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

      <GeneratorActions
        copyText={text}
        copyLabel="Copy teks"
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
          loadNote={loadNote(movements.get(detail.movement), detail, log, prs) ?? undefined}
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
  if (c.ok && !limited) return null;
  return (
    <div role="status" className="rounded-card border border-line bg-surface p-4 text-[14px] leading-relaxed">
      {!c.ok && (
        <>
          <p className="font-semibold text-ink">{STRENGTH_TYPE_LABEL[type]} belum bisa disusun dengan gerakan aktif.</p>
          {c.needs.length > 0 && <p className="mt-1 text-muted">Butuh salah satu: {c.needs.join(", ")}.</p>}
          {c.selectable.length > 0 && <p className="mt-1 text-muted">Atau aktifkan: {c.selectable.join(", ")}.</p>}
          <Link href="/setting#alat" className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-ink hover:underline">
            Atur alat & gerakan di Setting
          </Link>
        </>
      )}
      {c.ok && limited && <p className="text-muted">Sesi lebih pendek dari {duration}&apos; karena gerakan aktif terbatas.</p>}
    </div>
  );
}
