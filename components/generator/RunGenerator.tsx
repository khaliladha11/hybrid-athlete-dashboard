"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { useResolvedProfile } from "@/lib/settings-store";
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
  recovery: { bar: "bg-subtle-strong", dot: "bg-faint", label: "Jalan/jog" },
  easy: { bar: "bg-success", dot: "bg-success", label: "Easy / Z2" },
  tempo: { bar: "bg-warning", dot: "bg-warning", label: "Moderate / Tempo" },
  hard: { bar: "bg-danger", dot: "bg-danger", label: "High / Interval" },
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
  const [blockEnabled, setBlockEnabled] = useBlockEnabled();
  const free = !blockEnabled;

  const p = useResolvedProfile();

  const workout = useMemo(
    () => generateRunWorkout({ duration, difficulty, seed, block, cadenceSpm, free }, p),
    [duration, difficulty, seed, block, cadenceSpm, free, p],
  );
  // Tampilan Set Huawei disembunyikan sementara; tombol "Copy Set" tetap menyalin format set-nya.
  const setText = useMemo(() => runToHuaweiSets(workout), [workout]);
  const outputRef = useRef<HTMLElement>(null);

  const render = useCallback(
    (s: number) => runToText(generateRunWorkout({ duration, difficulty, seed: s, block, cadenceSpm, free }, p)),
    [duration, difficulty, block, cadenceSpm, free, p],
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
    <div className="space-y-4">
      <div className="space-y-4 rounded-card border border-line bg-surface p-4 shadow-card">
        <Segmented label="Durasi" value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d}'` }))} />
        <Segmented
          label="Kesulitan"
          value={difficulty}
          onChange={setDifficulty}
          options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
          tones={INTENSITY_TONE}
        />
        <div className="border-t border-line pt-4">
          <Switch
            checked={blockEnabled}
            onChange={setBlockEnabled}
            label="Program blok mingguan"
            description={
              blockEnabled
                ? `${blockLabel(block)} — deload & gerakan utama mengikuti blok.`
                : "Mode bebas: latihan tanpa jadwal blok atau deload."
            }
          />
        </div>
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

      <OutputShell ref={outputRef} swapKey={`${duration}-${difficulty}-${seed}-${free}`} tag={{ label: DIFFICULTY_LABEL[difficulty], tone: INTENSITY_TONE[difficulty] }} title={workout.title} subtitle={`Total ${duration} menit · seed #${seed}`}>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full" aria-hidden>
          {timeline.map((s, i) => (
            <div
              key={i}
              className={`${INTENSITY_STYLE[intensityOf(s)].bar} border-r border-surface last:border-r-0`}
              style={{ width: `${(s.durationMin / duration) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
          {(Object.keys(INTENSITY_STYLE) as Intensity[])
            .filter((k) => used.has(k))
            .map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${INTENSITY_STYLE[k].dot}`} />
                {INTENSITY_STYLE[k].label}
              </span>
            ))}
        </div>

        <ol className="mt-4 space-y-4">
            {workout.blocks.map((b, bi) => {
              const blockMin = b.repeat * b.steps.reduce((s, st) => s + st.durationMin, 0);
              return (
                <li key={bi}>
                  <div className="flex items-baseline justify-between">
                    <p className="eyebrow">
                      {b.title.startsWith(PHASE_LABEL[b.phase]) ? b.title : `${PHASE_LABEL[b.phase]} · ${b.title}`}
                    </p>
                    <span className="tabular text-[13px] text-muted">{blockMin}&apos;</span>
                  </div>
                  <div className={`mt-2 rounded-inner ${b.repeat > 1 ? "border border-dashed border-line-strong p-2" : ""}`}>
                    {b.repeat > 1 && <p className="mb-1.5 px-1 text-[13px] font-semibold text-brand-ink">Ulangi {b.repeat}×</p>}
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

      <GeneratorActions
        copyText={setText}
        copyLabel="Copy Set"
        onRegenerate={regenerate}
        canRegenerate={canRegenerate}
      />
    </div>
  );
}
