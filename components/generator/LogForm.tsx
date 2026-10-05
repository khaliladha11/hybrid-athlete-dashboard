"use client";

import { useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { todayWib } from "@/lib/date";
import type { BlockContext } from "@/lib/generator/block";
import type { StrengthItem, StrengthWorkout } from "@/lib/generator/types";
import { findMovement, parseWeight } from "@/lib/profile";
import { parseRepRange, type LogEntry } from "@/lib/progression";
import { newEntryId, trainingLog } from "@/lib/training-log";

const RPE_OPTIONS = [4, 5, 6, 7, 8, 9];

interface Row {
  item: StrengthItem;
  load: string;
  band: string;
  value: string;
  rpe: number;
}

function initialRow(item: StrengthItem): Row {
  const target = item.durationSec ?? parseRepRange(item.reps)?.hi ?? 0;
  return {
    item,
    load: item.load.kind === "load" ? String(item.load.max) : "",
    band: item.load.kind === "band" ? item.load.band : "",
    value: String(target),
    rpe: item.rpe ?? 6,
  };
}

/** Catat hasil gerakan utama (★): beban, repetisi set terakhir (atau detik), dan RPE. */
export function LogForm({
  workout,
  block,
  onDone,
  onSaved,
}: {
  workout: StrengthWorkout;
  block: BlockContext;
  onDone: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => workout.items.filter((i) => i.anchor).map(initialRow));
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = () => {
    const date = todayWib();
    const entries: LogEntry[] = [];
    for (const r of rows) {
      const value = Number(r.value.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) {
        setError(`Isi ${r.item.durationSec ? "detik" : "repetisi"} untuk ${r.item.movement}.`);
        return;
      }
      const load = r.item.load.kind === "load" ? Number(r.load.replace(",", ".")) : undefined;
      if (load !== undefined && (!Number.isFinite(load) || load <= 0)) {
        setError(`Isi beban (kg) untuk ${r.item.movement}.`);
        return;
      }
      const target = r.item.durationSec
        ? { lo: r.item.durationSec, hi: r.item.durationSec }
        : (parseRepRange(r.item.reps) ?? { lo: value, hi: value });
      entries.push({
        id: newEntryId(),
        date,
        movement: r.item.movement,
        ...(load !== undefined ? { load } : {}),
        ...(r.band ? { band: r.band } : {}),
        value,
        valueUnit: r.item.durationSec ? "sec" : "reps",
        target,
        rpe: r.rpe,
        targetRpe: r.item.rpe ?? 6,
        deload: workout.deload,
        blockIndex: block.index,
      });
    }
    if (!trainingLog.add(entries)) {
      setError("Gagal menyimpan di perangkat ini (mode privat atau memori penuh).");
      return;
    }
    onSaved();
  };

  if (!rows.length) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="swap-in mt-4 space-y-4 rounded-card border border-line-strong p-4"
    >
      <div>
        <h3 className="text-base font-semibold">Catat sesi — gerakan utama ★</h3>
        <p className="text-[13px] text-muted">Isi set terakhir. Disimpan di perangkat ini saja.</p>
      </div>
      {rows.map((r, i) => {
        const spec = parseWeight(findMovement(r.item.movement)?.weight ?? "");
        const sec = !!r.item.durationSec;
        return (
          <fieldset key={r.item.movement} className="space-y-2 border-t border-line pt-4 first-of-type:border-0 first-of-type:pt-0">
            <legend className="mb-2 text-body font-semibold">{r.item.movement}</legend>
            <div className="grid grid-cols-2 gap-2">
              {r.item.load.kind === "load" && spec.kind === "load" && (
                <label className="text-[12px] text-muted">
                  Beban (kg{spec.perHand ? "/tangan" : ""})
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="next"
                    value={r.load}
                    onChange={(e) => update(i, { load: e.target.value })}
                    className="mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand"
                  />
                </label>
              )}
              {r.item.load.kind === "band" && spec.kind === "band" && (
                <label className="text-[12px] text-muted">
                  Band
                  <select
                    value={r.band}
                    onChange={(e) => update(i, { band: e.target.value })}
                    className="mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand"
                  >
                    {spec.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-[12px] text-muted">
                {sec ? "Detik tercapai" : "Rep set terakhir"}
                <input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={r.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                  className="mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand"
                />
              </label>
            </div>
            <div role="radiogroup" aria-label={`RPE ${r.item.movement}`} className="flex items-center gap-1">
              <span className="mr-1 text-[12px] text-muted">RPE</span>
              {RPE_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={r.rpe === v}
                  onClick={() => update(i, { rpe: v })}
                  className={`pressable tabular min-h-10 flex-1 rounded-control border text-body ${
                    r.rpe === v ? "border-brand bg-brand font-semibold text-on-brand" : "border-line-strong bg-surface text-muted"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onDone} className={`${BUTTON.base} ${BUTTON.secondary}`}>
          Batal
        </button>
        <button type="submit" className={`${BUTTON.base} ${BUTTON.primary}`}>
          Simpan
        </button>
      </div>
    </form>
  );
}
