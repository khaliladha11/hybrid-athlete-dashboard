"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CONDITIONS, type ConditionId } from "@/lib/conditions";
import { formatLoad, formatVolume } from "@/lib/generator/format";
import type { StrengthItem } from "@/lib/generator/types";
import { MEDIA_ATTRIBUTION, mediaFor } from "@/lib/movements/media";
import { muscleAriaLabel, muscleSummary, TEXT_ONLY_MOVEMENTS, TEXT_ONLY_MUSCLES } from "@/lib/movements/muscle-regions";
import { MuscleMap } from "@/components/charts/MuscleMap";
import { MovementPlaceholderIcon } from "./MovementThumb";

const FRAME_MS = 1200;
const REDUCED = "(prefers-reduced-motion: reduce)";

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (l) => {
      const mq = matchMedia(REDUCED);
      mq.addEventListener("change", l);
      return () => mq.removeEventListener("change", l);
    },
    () => matchMedia(REDUCED).matches,
    () => false,
  );
}

/** Label singkat kondisi: "Riwayat Shin Splints (MTSS)" → "Riwayat Shin Splints". */
const shortLabel = (id: ConditionId) => CONDITIONS[id].label.split(" (")[0];

/**
 * Bottom sheet detail gerakan: gambar awal/akhir (crossfade, bisa dijeda), cue teknik,
 * otot, dan catatan kondisi aktif. Memakai <dialog> native (fokus terkunci, Esc menutup).
 */
export function MovementSheet({
  name,
  item,
  activeConditions,
  loadNote,
  suggestion,
  onClose,
}: {
  name: string;
  item?: StrengthItem;
  activeConditions: readonly ConditionId[];
  /** Penjelasan beban di atas rentang awal library (0.14.0). */
  loadNote?: string;
  /** Saran Gita untuk gerakan ini (progresi, 0.14.0). */
  suggestion?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const media = mediaFor(name);
  // Peta otot per gerakan (0.14.2): komponen yang sama dengan ringkasan sesi 0.14.1.
  const muscles = muscleSummary([name]);
  const textOnly = TEXT_ONLY_MOVEMENTS[name];
  const notes = activeConditions.flatMap((id) => {
    const n = media?.conditionNotes?.[id];
    return n ? [{ id, text: n }] : [];
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    // Kunci scroll halaman di belakang sheet (iOS tidak melakukannya untuk <dialog>).
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="movement-sheet-title"
      onClose={onClose}
      onClick={(e) => {
        // Tap di luar panel (backdrop) menutup sheet.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="movement-sheet"
    >
      <div className="max-h-[88dvh] overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div aria-hidden className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong" />
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 id="movement-sheet-title" className="text-[18px] leading-tight font-semibold">
              {item?.anchor && <span className="mr-1 text-brand-ink">★</span>}
              {name}
            </h2>
            {item && (
              <p className="tabular mt-0.5 text-[13px] text-muted">
                {formatVolume(item)}
                {item.phase === "main" && ` · ${formatLoad(item.load)}`}
                {item.rpe !== undefined && ` · RPE ${item.rpe}`}
              </p>
            )}
            {loadNote && <p className="mt-1 text-[13px] text-ink">{loadNote}</p>}
            {suggestion && (
              <p className="mt-1 text-[13px] text-ink">
                <span className="t-label mr-1 text-brand-ink">Saran Gita</span>
                {suggestion}
              </p>
            )}
            {item?.tempo && <p className="mt-1 text-[13px] font-semibold text-ink">Tempo: turun 3 detik, jeda 2 detik di bawah</p>}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Tutup detail gerakan"
            className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-subtle hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="mt-3">
          {media?.images ? <MovementFrames name={name} images={media.images} /> : <NoImage />}
          {media?.imageNote && <p className="mt-1.5 text-[12px] text-faint">Catatan gambar: {media.imageNote}</p>}
        </div>

        {media && media.cues.length > 0 && (
          <section className="mt-4">
            <h3 className="t-label mb-2">Cue teknik</h3>
            <ul className="space-y-1.5 text-[14px] leading-snug">
              {media.cues.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        {media && (
          <section className="mt-4">
            <h3 className="t-label mb-2">Otot</h3>
            {(muscles.primaryRegions.length > 0 || muscles.secondaryRegions.length > 0) && (
              <MuscleMap primary={muscles.primaryRegions} secondary={muscles.secondaryRegions} label={muscleAriaLabel(muscles)} className="mb-3" />
            )}
            <ul className="flex flex-wrap gap-1.5" aria-label="Otot utama dan sekunder">
              {media.primaryMuscles.map((m) => (
                <li key={m} className="rounded-full bg-brand px-2.5 py-0.5 text-[12px] font-semibold text-on-brand">
                  {m}
                </li>
              ))}
              {media.secondaryMuscles.map((m) => (
                <li key={m} className="rounded-full border border-brand bg-brand-soft px-2.5 py-0.5 text-[12px] text-ink">
                  {m}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[12px] text-faint">Oranye penuh = otot utama · bergaris oranye = sekunder</p>
            {textOnly && <p className="mt-1 text-[12px] text-muted">{textOnly}</p>}
            {!textOnly &&
              [...media.primaryMuscles, ...media.secondaryMuscles]
                .filter((m) => TEXT_ONLY_MUSCLES[m])
                .map((m) => (
                  <p key={m} className="mt-1 text-[12px] text-muted">
                    {m}: {TEXT_ONLY_MUSCLES[m]}.
                  </p>
                ))}
          </section>
        )}

        {notes.length > 0 && (
          <section className="mt-4">
            <h3 className="t-label mb-2">Kondisi aktif</h3>
            <ul className="space-y-1.5">
              {notes.map((n) => (
                <li key={n.id} className="rounded-inner bg-brand-soft px-3 py-2 text-[13px] text-ink">
                  <span className="font-semibold">{shortLabel(n.id)}:</span> {n.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {media?.source && <p className="mt-4 text-[11px] text-faint">{MEDIA_ATTRIBUTION}</p>}
      </div>
    </dialog>
  );
}

function NoImage() {
  return (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-inner bg-subtle text-faint">
      <div className="flex flex-col items-center gap-2">
        <MovementPlaceholderIcon className="h-10 w-10" />
        <p className="text-[13px] font-semibold">Gambar belum tersedia</p>
      </div>
    </div>
  );
}

/** Posisi awal ↔ akhir berganti otomatis (crossfade); reduced motion → berdampingan tanpa animasi. */
function MovementFrames({ name, images }: { name: string; images: readonly [string, string] }) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState<0 | 1>(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (reduced || !playing) return;
    const t = window.setInterval(() => setFrame((f) => (f ? 0 : 1)), FRAME_MS);
    return () => clearInterval(t);
  }, [reduced, playing]);

  const alt = (i: 0 | 1) => `${name}, posisi ${i ? "akhir" : "awal"}`;

  if (reduced) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {([0, 1] as const).map((i) => (
          <figure key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element -- gambar statis di /public */}
            <img src={images[i]} alt={alt(i)} decoding="async" className="aspect-[4/3] w-full rounded-inner bg-white object-contain" />
            <figcaption className="t-label mt-1.5 text-center">{i ? "Akhir" : "Awal"}</figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-inner bg-white">
      {([0, 1] as const).map((i) => (
        // eslint-disable-next-line @next/next/no-img-element -- gambar statis di /public
        <img
          key={i}
          src={images[i]}
          alt={alt(i)}
          aria-hidden={frame !== i}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ease-in-out ${frame === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.08em] text-white uppercase" aria-live="off">
        {frame ? "Akhir" : "Awal"}
      </span>
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Jeda animasi gerakan" : "Putar animasi gerakan"}
        aria-pressed={!playing}
        className="pressable absolute right-2 bottom-2 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white hover:bg-black/75"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5v14l11-7z" />}
        </svg>
      </button>
    </div>
  );
}
