"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { INTENSITY_TONE } from "@/components/ui/tones";
import { blockLabel } from "@/lib/generator/block";
import { useBlockEnabled } from "@/lib/preferences";
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
} from "@/lib/generator";
import type { BlockContext } from "@/lib/generator/block";
import type { Advice } from "@/lib/coach";
import { profile, type Movement } from "@/lib/profile";
import { applyProgression } from "@/lib/progression";
import { useTrainingLog } from "@/lib/training-log";
import { CoachCard } from "./CoachCard";
import { LogForm } from "./LogForm";
import { GeneratorActions, OutputShell, revealIfScrolledPast } from "./shared";

const MOVEMENTS = new Map<string, Movement>(
  (["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const).flatMap((c) => profile.movementLibrary[c] ?? []).map((m) => [m.name, m]),
);

function restLabel(sec: number) {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec} dtk`;
}

export function StrengthGenerator({
  advice,
  block,
  initialSeed,
}: {
  advice: Advice[];
  block: BlockContext;
  initialSeed: number;
}) {
  const [type, setType] = useState<StrengthType>("fullBody");
  const [duration, setDuration] = useState<Duration>(45);
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");
  const [seed, setSeed] = useState(initialSeed);

  const [logging, setLogging] = useState(false);
  const [blockEnabled, setBlockEnabled] = useBlockEnabled();
  const free = !blockEnabled;
  const [saved, setSaved] = useState(false);
  const log = useTrainingLog();

  const generated = useMemo(
    () => generateStrengthWorkout({ type, duration, difficulty, seed, block, free }),
    [type, duration, difficulty, seed, block, free],
  );
  // Beban gerakan ★ disesuaikan dengan riwayat sesi (tetap dalam batas library).
  const workout = useMemo(() => applyProgression(generated, MOVEMENTS, log), [generated, log]);
  const text = useMemo(() => strengthToText(workout), [workout]);
  const outputRef = useRef<HTMLElement>(null);

  const render = useCallback(
    (s: number) => strengthToText(generateStrengthWorkout({ type, duration, difficulty, seed: s, block, free })),
    [type, duration, difficulty, block, free],
  );
  const canRegenerate = useMemo(() => hasVariations(render), [render]);
  const regenerate = () => {
    setSeed(nextDistinctSeed(render, seed));
    revealIfScrolledPast(outputRef.current);
  };
  const est = Math.round(estimateStrengthMinutes(workout));

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-card border border-line bg-surface p-4 shadow-card">
        <Segmented
          label="Tipe"
          wrap
          value={type}
          onChange={setType}
          options={STRENGTH_TYPES.map((t) => ({ value: t, label: STRENGTH_TYPE_LABEL[t] }))}
        />
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
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
                ? `${blockLabel(block)} — gerakan ★ dikunci per blok, ada minggu deload.`
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

      <OutputShell ref={outputRef} swapKey={`${type}-${duration}-${difficulty}-${seed}-${free}`} tag={{ label: DIFFICULTY_LABEL[difficulty], tone: INTENSITY_TONE[difficulty] }} title={workout.title} subtitle={`Estimasi ±${est} menit · Skema ${workout.scheme} · RPE ${workout.items.find((i) => i.phase === "main")?.rpe ?? "-"} · seed #${seed}`}>
        {(["warmup", "main", "cooldown"] as const).map((phase) => {
          const items = workout.items.filter((i) => i.phase === phase);
          if (!items.length) return null;
          return (
            <div key={phase} className="mt-4 first:mt-0">
              <p className="eyebrow mb-2">{PHASE_LABEL[phase]}</p>
              {phase === "main" ? (
                <ol className="space-y-2">
                  {items.map((it, i) => (
                    <li key={it.movement} className={`rounded-inner bg-subtle px-3 py-3 ${it.anchor ? "border-l-[3px] border-brand" : ""}`}>
                      <div className="flex items-start gap-3">
                        <span className={`tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[12px] font-semibold ${it.anchor ? "bg-brand text-on-brand" : "bg-subtle-strong text-ink"}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-body font-semibold">
                              {it.anchor && (
                                <span className="mr-1 text-brand" title="Gerakan utama blok ini" aria-label="Gerakan utama blok ini">
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
                          {it.progression && (
                            <p className="mt-1 text-[13px] font-semibold text-brand-ink">{it.progression}</p>
                          )}
                          {it.cue && <p className="mt-1 text-[13px] text-faint">{it.cue}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {items.map((it) => (
                    <li key={it.movement} className="rounded-full bg-subtle-strong px-3 py-1 text-[13px]">
                      {it.movement} <span className="tabular text-muted">{formatVolume(it)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {logging ? (
          <LogForm
            workout={workout}
            block={block}
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
              onClick={() => {
                setSaved(false);
                setLogging(true);
              }}
              className={`${BUTTON.base} ${BUTTON.secondary} mt-4 w-full`}
            >
              {saved ? "✓ Tersimpan — catat lagi?" : "Catat sesi (gerakan ★)"}
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
        onRegenerate={regenerate}
        canRegenerate={canRegenerate}
      />
    </div>
  );
}
