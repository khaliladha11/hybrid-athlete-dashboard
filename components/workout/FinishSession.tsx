"use client";

import { useState } from "react";
import { MuscleSummary } from "@/components/strength/MuscleSummary";
import { BUTTON } from "@/components/ui/Card";
import { prStore } from "@/lib/pr-store";
import { MAX_DURATION_MIN, sessionLoad, ST_COMPLETE_RATIO } from "@/lib/st-session";
import { stSessionStore } from "@/lib/st-session-store";
import { newEntryId, trainingLog } from "@/lib/training-log";
import { elapsedMin, finishWorkout, setsDone, setsPlanned, type ActiveWorkout } from "@/lib/workout-state";

/** Skala CR-10 (Foster dkk. 2001) untuk RPE sesi. */
const CR10: Record<number, string> = {
  0: "Istirahat",
  1: "Sangat ringan",
  2: "Ringan",
  3: "Sedang",
  4: "Agak berat",
  5: "Berat",
  7: "Sangat berat",
  10: "Maksimal",
};

/** Setelah sesi: RPE sesi 0–10 dan durasi (terisi dari timer). Beban = RPE × menit. */
export function FinishSession({ state, onBack, onSaved }: { state: ActiveWorkout; onBack: () => void; onSaved: (summary: string) => void }) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(() => String(Math.min(MAX_DURATION_MIN, elapsedMin(state, Date.now()))));
  const [error, setError] = useState<string | null>(null);
  const done = setsDone(state);
  const total = setsPlanned(state);
  const min = Number(minutes);
  const validMin = Number.isInteger(min) && min >= 1 && min <= MAX_DURATION_MIN;
  const partial = total > 0 && done / total < ST_COMPLETE_RATIO;

  const save = () => {
    if (rpe === null) return setError("Pilih RPE sesi.");
    if (!validMin) return setError(`Isi durasi 1–${MAX_DURATION_MIN} menit.`);
    const { session, entries } = finishWorkout(state, {
      rpe,
      durationMin: min,
      newId: newEntryId,
    });
    if (!stSessionStore.add(session) || (entries.length && !trainingLog.add(entries))) {
      return setError("Gagal menyimpan di perangkat ini (mode privat atau memori penuh).");
    }
    // PR kemampuan dari sesi ini (0.14.0).
    const prs = entries.length ? prStore.detectFromLog(trainingLog.all()) : 0;
    onSaved(`${min}' · RPE ${rpe} · beban ${sessionLoad({ rpe, durationMin: min })} · ${done}/${total} set${prs ? ` · ${prs} PR baru` : ""}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-4"
    >
      <button type="button" onClick={onBack} className={`${BUTTON.base} ${BUTTON.ghost} -ml-3 px-3`}>
        ‹ Kembali ke sesi
      </button>
      <section className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold">Seberat apa sesi ini?</h1>
          <p className="mt-1 text-[14px] text-muted">Nilai seluruh sesi, bukan set terakhir. 0 istirahat, 10 maksimal.</p>
        </div>
        <fieldset>
          <legend className="t-label mb-2">RPE sesi</legend>
          <div role="radiogroup" className="grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-6">
            {Array.from({ length: 11 }, (_, r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rpe === r}
                aria-label={CR10[r] ? `${r}, ${CR10[r]}` : String(r)}
                onClick={() => setRpe(r)}
                className={`pressable tabular min-h-11 rounded-control border text-base font-semibold ${rpe === r ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-2 min-h-5 text-[13px] text-muted" aria-live="polite">
            {rpe !== null ? (CR10[rpe] ?? (rpe > 7 ? "Sangat berat" : "Berat")) : "Pilih satu angka."}
          </p>
        </fieldset>
        <label className="block">
          <span className="t-label">Durasi (menit)</span>
          <input
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="tabular mt-1 min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base"
          />
          <span className="mt-1 block text-[12px] text-muted">Terisi dari timer sesi. Ubah bila sesi sempat terhenti lama.</span>
        </label>
        <p className="tabular text-[14px]">
          Beban sesi: <strong>{rpe !== null && validMin ? sessionLoad({ rpe, durationMin: min }) : "·"}</strong>
          <span className="text-muted"> (RPE × menit)</span>
        </p>
        <p className="tabular text-[13px] text-muted">
          {done}/{total} set dicentang
          {partial ? ": dihitung sebagian di program." : "."}
        </p>
        {error && (
          <p role="alert" className="text-[13px] font-semibold text-danger-ink">
            ✕ {error}
          </p>
        )}
        <button type="submit" className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg} w-full`}>
          Simpan sesi
        </button>
      </section>
      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <MuscleSummary movements={state.workout.items.filter((i) => i.phase === "main").map((i) => i.movement)} />
      </section>
    </form>
  );
}
