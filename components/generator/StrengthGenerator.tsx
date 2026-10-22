"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
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
import type { Advice } from "@/lib/coach";
import type { Movement, ResolvedProfile } from "@/lib/profile";
import { useBlockContext, useBlockMode, useResolvedProfile } from "@/lib/settings-store";
import { applyProgression } from "@/lib/progression";
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
  advice,
  initialSeed,
}: {
  advice: Advice[];
  initialSeed: number;
}) {
  const [type, setType] = useState<StrengthType>("fullBody");
  const [duration, setDuration] = useState<Duration>(45);
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");
  const [seed, setSeed] = useState(initialSeed);

  const [logging, setLogging] = useState(false);
  const [blockEnabled, setBlockEnabled] = useBlockMode();
  const block = useBlockContext();
  const free = !blockEnabled;
  const [saved, setSaved] = useState(false);
  const [detail, setDetail] = useState<StrengthItem | null>(null);
  const log = useTrainingLog();
  const p = useResolvedProfile();
  const movements = useMemo(() => movementMap(p), [p]);

  const generated = useMemo(
    () => tryGenerate(() => generateStrengthWorkout({ type, duration, difficulty, seed, block, free }, p)),
    [type, duration, difficulty, seed, block, free, p],
  );
  // Beban gerakan ★ disesuaikan dengan riwayat sesi (tetap dalam batas library & alat).
  const workout = useMemo(() => generated && applyProgression(generated, movements, log), [generated, movements, log]);
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
                          {it.progression && <p className="mt-1 text-[13px] font-semibold text-brand-ink">{it.progression}</p>}
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
        onRegenerate={regenerate}
        canRegenerate={canRegenerate}
      />
      </>
      )}
      {detail && <MovementSheet name={detail.movement} item={detail} activeConditions={p.activeConditions} onClose={() => setDetail(null)} />}
    </div>
  );
}
