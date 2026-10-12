"use client";

import { useState } from "react";
import { MovementSheet } from "@/components/movements/MovementSheet";
import { MovementThumb } from "@/components/movements/MovementThumb";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatDateId } from "@/lib/date";
import { historyFor, type LogEntry } from "@/lib/progression";
import { useResolvedProfile } from "@/lib/settings-store";
import { trainingLog, useTrainingLog } from "@/lib/training-log";

function valueLabel(e: LogEntry) {
  const load = e.load !== undefined ? `${e.load} kg` : e.band ? `${e.band} Band` : "BW";
  const value = e.valueUnit === "sec" ? `${e.value} dtk` : `${e.value} rep`;
  return `${load} × ${value}`;
}

const done = (e: LogEntry) => e.value >= e.target.hi && e.rpe <= e.targetRpe;

/** Riwayat gerakan ★ (dasar progresi beban): tren per gerakan + riwayat per tanggal. */
export function LogHistory() {
  const entries = useTrainingLog();
  const p = useResolvedProfile();
  const [detail, setDetail] = useState<string | null>(null);
  const movements = [...new Set(entries.map((e) => e.movement))].sort();
  const byDate = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const dates = [...new Set(byDate.map((e) => e.date))];

  return (
    <section id="riwayat" className="scroll-mt-4 space-y-4">
      <header>
        <h2 className="text-[18px] leading-tight font-semibold">Riwayat latihan</h2>
        <p className="mt-0.5 text-[13px] text-muted">Gerakan ★ yang dicatat — dasar progresi beban otomatis. Cadangan ada di Setting › Data & cadangan.</p>
      </header>

      {!entries.length ? (
        <Card>
          <p className="text-body text-muted">
            Belum ada sesi tercatat. Setelah latihan, tekan <strong>Catat sesi</strong> di bawah hasil generator — beban berikutnya akan disesuaikan.
          </p>
        </Card>
      ) : (
        <>
          <Card title="Tren gerakan utama">
            <ul className="divide-y divide-line">
              {movements.map((m) => {
                const h = historyFor(entries, m).slice(0, 5).reverse();
                return (
                  <li key={m} className="py-2 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => setDetail(m)}
                      aria-haspopup="dialog"
                      className="pressable -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-inner px-2 py-1 text-left hover:bg-subtle"
                    >
                      <MovementThumb name={m} size="h-11 w-11" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-semibold">{m}</span>
                        <span className="tabular block text-[13px] text-muted">
                          {h.map((e) => (e.load !== undefined ? `${e.load}` : e.valueUnit === "sec" ? `${e.value}s` : e.band ?? `${e.value}`)).join(" → ")}
                          <span className="text-faint"> · {h.length} sesi terakhir</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Per tanggal" flush className="!pb-1" action={<span className="text-[12px] text-faint">{dates.length} hari</span>}>
            {dates.map((d, i) => (
              <details key={d} className="group border-t border-line first-of-type:border-0" open={i === 0}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5">
                  <span className="eyebrow">{formatDateId(d)}</span>
                  <span className="text-[13px] text-faint transition-transform duration-150 ease group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                    ›
                  </span>
                </summary>
                <ul className="details-body">
                  {byDate
                    .filter((e) => e.date === d)
                    .map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-5 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-semibold">{e.movement}</p>
                          <p className="tabular text-[13px] text-muted">
                            {valueLabel(e)} · RPE {e.rpe}
                            <span className="text-faint"> (target {e.targetRpe})</span>
                            {e.deload && <span className="text-info"> · deload</span>}
                          </p>
                          <p className={`text-[12px] font-semibold ${done(e) ? "text-success-ink" : "text-danger-ink"}`}>
                            {done(e) ? "✓ Target tuntas" : "✕ Belum tuntas"}
                          </p>
                        </div>
                        <ConfirmButton label="Hapus" confirmLabel="Yakin?" onConfirm={() => trainingLog.remove(e.id)} />
                      </li>
                    ))}
                </ul>
              </details>
            ))}
          </Card>
        </>
      )}
      {detail && <MovementSheet name={detail} activeConditions={p.activeConditions} onClose={() => setDetail(null)} />}
    </section>
  );
}
