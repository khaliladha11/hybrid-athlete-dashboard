"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
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
import type { Readiness } from "@/lib/readiness";
import { ReadinessBanner } from "./ReadinessBanner";
import { GeneratorActions, OutputShell, revealIfScrolledPast } from "./shared";

function restLabel(sec: number) {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec} dtk`;
}

export function StrengthGenerator({
  readiness,
  block,
  initialSeed,
}: {
  readiness: Readiness | null;
  block: BlockContext;
  initialSeed: number;
}) {
  const [type, setType] = useState<StrengthType>("fullBody");
  const [duration, setDuration] = useState<Duration>(45);
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");
  const [seed, setSeed] = useState(initialSeed);

  const workout = useMemo(
    () => generateStrengthWorkout({ type, duration, difficulty, seed, block }),
    [type, duration, difficulty, seed, block],
  );
  const text = useMemo(() => strengthToText(workout), [workout]);
  const outputRef = useRef<HTMLElement>(null);

  const render = useCallback(
    (s: number) => strengthToText(generateStrengthWorkout({ type, duration, difficulty, seed: s, block })),
    [type, duration, difficulty, block],
  );
  const canRegenerate = useMemo(() => hasVariations(render), [render]);
  const regenerate = () => {
    setSeed(nextDistinctSeed(render, seed));
    revealIfScrolledPast(outputRef.current);
  };
  const est = Math.round(estimateStrengthMinutes(workout));

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
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
          />
        </div>
      </div>

      <ReadinessBanner readiness={readiness} difficulty={difficulty} onLower={setDifficulty} />

      <OutputShell ref={outputRef} swapKey={`${type}-${duration}-${difficulty}-${seed}`} title={workout.title} subtitle={`Estimasi ±${est} menit · Skema ${workout.scheme} · RPE ${workout.items.find((i) => i.phase === "main")?.rpe ?? "-"} · seed #${seed}`}>
        {(["warmup", "main", "cooldown"] as const).map((phase) => {
          const items = workout.items.filter((i) => i.phase === phase);
          if (!items.length) return null;
          return (
            <div key={phase} className="mt-3 first:mt-0">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{PHASE_LABEL[phase]}</p>
              {phase === "main" ? (
                <ol className="space-y-1.5">
                  {items.map((it, i) => (
                    <li key={it.movement} className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/60">
                      <div className="flex items-start gap-2.5">
                        <span className="tabular mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-zinc-200 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium">
                              {it.anchor && (
                                <span className="mr-1 text-amber-500" title="Gerakan utama blok ini" aria-label="Gerakan utama blok ini">
                                  ★
                                </span>
                              )}
                              {it.movement}
                            </p>
                            <span className="tabular shrink-0 text-sm font-semibold">{formatVolume(it)}</span>
                          </div>
                          <p className="tabular text-xs text-zinc-600 dark:text-zinc-400">
                            {formatLoad(it.load)} · RPE {it.rpe}
                            {it.sets > 1 && ` · rest ${restLabel(it.restSec)}`}
                          </p>
                          {it.cue && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{it.cue}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {items.map((it) => (
                    <li key={it.movement} className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800">
                      {it.movement} <span className="tabular text-zinc-500">{formatVolume(it)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <ul className="mt-4 space-y-1.5 rounded-xl bg-violet-50 p-3 text-xs text-violet-950 dark:bg-violet-950/40 dark:text-violet-100">
          {workout.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden>›</span>
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
        regenerateClassName="bg-violet-600 hover:bg-violet-700"
      />
    </div>
  );
}
