"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  DURATIONS,
  PHASE_LABEL,
  generateRunWorkout,
  hasVariations,
  nextDistinctSeed,
  runToHuaweiSets,
  runToText,
  type Difficulty,
  type Duration,
  type RunStep,
} from "@/lib/generator";
import type { BlockContext } from "@/lib/generator/block";
import type { Advice } from "@/lib/coach";
import { CoachCard } from "./CoachCard";
import { GeneratorActions, OutputShell, revealIfScrolledPast } from "./shared";

type Intensity = "recovery" | "easy" | "tempo" | "hard";

function intensityOf(s: RunStep): Intensity {
  if (s.kind !== "run") return "recovery";
  if (s.rpe?.startsWith("3")) return "easy";
  if (s.rpe?.startsWith("6")) return "tempo";
  return "hard";
}

const INTENSITY_STYLE: Record<Intensity, { bar: string; dot: string; label: string }> = {
  recovery: { bar: "bg-zinc-300 dark:bg-zinc-700", dot: "bg-zinc-400", label: "Jalan/jog" },
  easy: { bar: "bg-accent-400 dark:bg-accent-600", dot: "bg-accent-500", label: "Z2" },
  tempo: { bar: "bg-amber-400", dot: "bg-amber-400", label: "Tempo" },
  hard: { bar: "bg-rose-500", dot: "bg-rose-500", label: "Interval" },
};

export function RunGenerator({
  advice,
  block,
  cadenceSpm,
  initialSeed,
}: {
  advice: Advice[];
  block: BlockContext;
  cadenceSpm?: number;
  initialSeed: number;
}) {
  const [duration, setDuration] = useState<Duration>(45);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [seed, setSeed] = useState(initialSeed);
  const [view, setView] = useState<"list" | "huawei">("list");

  const workout = useMemo(
    () => generateRunWorkout({ duration, difficulty, seed, block, cadenceSpm }),
    [duration, difficulty, seed, block, cadenceSpm],
  );
  const text = useMemo(() => (view === "list" ? runToText(workout) : runToHuaweiSets(workout)), [workout, view]);
  const outputRef = useRef<HTMLElement>(null);

  const render = useCallback(
    (s: number) => runToText(generateRunWorkout({ duration, difficulty, seed: s, block, cadenceSpm })),
    [duration, difficulty, block, cadenceSpm],
  );
  const canRegenerate = useMemo(() => hasVariations(render), [render]);
  const regenerate = () => {
    setSeed(nextDistinctSeed(render, seed));
    revealIfScrolledPast(outputRef.current);
  };

  // Timeline: semua langkah setelah repetisi dibuka.
  const timeline = workout.blocks.flatMap((b) => Array.from({ length: b.repeat }, () => b.steps).flat());
  const used = new Set(timeline.map(intensityOf));

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Segmented label="Durasi" value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d}'` }))} />
        <Segmented
          label="Kesulitan"
          value={difficulty}
          onChange={setDifficulty}
          options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
        />
      </div>

      <CoachCard
        advice={advice}
        target="run"
        current={{ difficulty, duration }}
        onApply={(s) => {
          if (s.difficulty) setDifficulty(s.difficulty);
          if (s.duration) setDuration(s.duration);
        }}
      />

      <OutputShell ref={outputRef} swapKey={`${duration}-${difficulty}-${seed}`} title={workout.title} subtitle={`Total ${duration} menit · seed #${seed}`}>
        <div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden>
          {timeline.map((s, i) => (
            <div
              key={i}
              className={`${INTENSITY_STYLE[intensityOf(s)].bar} border-r border-white last:border-r-0 dark:border-zinc-900`}
              style={{ width: `${(s.durationMin / duration) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          {(Object.keys(INTENSITY_STYLE) as Intensity[])
            .filter((k) => used.has(k))
            .map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${INTENSITY_STYLE[k].dot}`} />
                {INTENSITY_STYLE[k].label}
              </span>
            ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm dark:bg-zinc-800/80" role="tablist">
          {(
            [
              ["list", "Daftar"],
              ["huawei", "Set Huawei"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`pressable min-h-9 rounded-lg py-1.5 font-medium ${view === v ? "bg-white shadow-sm dark:bg-zinc-950" : "text-zinc-600 dark:text-zinc-400"}`}
            >
              {l}
            </button>
          ))}
        </div>

        {view === "list" ? (
          <ol className="mt-3 space-y-3">
            {workout.blocks.map((b, bi) => {
              const blockMin = b.repeat * b.steps.reduce((s, st) => s + st.durationMin, 0);
              return (
                <li key={bi}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {b.title.startsWith(PHASE_LABEL[b.phase]) ? b.title : `${PHASE_LABEL[b.phase]} · ${b.title}`}
                    </p>
                    <span className="tabular text-xs text-zinc-500">{blockMin}&apos;</span>
                  </div>
                  <div className={`mt-1 rounded-xl ${b.repeat > 1 ? "border border-dashed border-zinc-300 p-2 dark:border-zinc-700" : ""}`}>
                    {b.repeat > 1 && <p className="mb-1 px-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Ulangi {b.repeat}×</p>}
                    <ul className="space-y-1.5">
                      {b.steps.map((s, si) => {
                        const it = intensityOf(s);
                        return (
                          <li key={si} className="flex gap-2.5 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                            <span className={`mt-1 h-3 w-1 shrink-0 rounded-full ${INTENSITY_STYLE[it].dot}`} aria-hidden />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm font-medium">{s.label}</p>
                                <span className="tabular shrink-0 text-sm font-semibold">{s.durationMin}&apos;</span>
                              </div>
                              <p className="tabular text-xs text-zinc-600 dark:text-zinc-400">
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
        ) : (
          <pre className="tabular mt-3 overflow-x-auto rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed whitespace-pre-wrap dark:bg-zinc-800/60">{text}</pre>
        )}

        <ul className="mt-4 space-y-1.5 rounded-xl bg-accent-50 p-3 text-xs text-accent-900 dark:bg-accent-950/60 dark:text-accent-100">
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
        copyLabel={view === "list" ? "Copy teks" : "Copy Set Huawei"}
        onRegenerate={regenerate}
        canRegenerate={canRegenerate}
        regenerateClassName="bg-accent-600 hover:bg-accent-700"
      />
    </div>
  );
}
