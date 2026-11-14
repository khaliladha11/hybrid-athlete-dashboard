"use client";

import { useState } from "react";
import { addDays, startOfWeekMonday } from "@/lib/date";
import type { Band, BandResult } from "@/lib/program/timeline";
import { useLocale, useT } from "@/lib/i18n/client";
import { PROGRAM } from "@/lib/i18n/messages/program";
import { formatDay, MONTH_YEAR } from "@/lib/i18n/format";

/** Warna band dari token semantik (DESIGN-SYSTEM: hijau/kuning/merah hanya untuk data). */
export const BAND_CELL: Record<Band, string> = {
  blocked: "text-faint",
  red: "bg-danger-soft text-danger-ink",
  yellow: "bg-warning-soft text-warning-ink",
  green: "bg-success-soft text-success-ink",
  grey: "bg-subtle-strong text-ink",
};

const monthStart = (d: string) => `${d.slice(0, 7)}-01`;
const addMonths = (m: string, n: number) => {
  const d = new Date(`${m}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Pemilih Hari H (0.13.3): kalender bulan buatan sendiri, setiap tanggal diwarnai band saran lama program.
 * Tanggal sebelum batas teknis tidak bisa dipilih; tanggal paling awal diberi cincin. Tanpa animasi.
 */
export function RaceDatePicker({
  value,
  onChange,
  bandOf,
  earliestDate,
}: {
  value: string;
  onChange: (date: string) => void;
  bandOf: (date: string) => BandResult;
  /** Senin minggu paling awal yang bisa disusun. */
  earliestDate: string;
}) {
  const locale = useLocale();
  const t = useT(PROGRAM).picker;
  const [month, setMonth] = useState(() => monthStart(value > earliestDate ? value : earliestDate));
  const first = startOfWeekMonday(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const rows = days[35].slice(0, 7) === month.slice(0, 7) ? 6 : 5;
  const canPrev = month > monthStart(earliestDate);
  const nav = "pressable flex h-11 w-11 items-center justify-center rounded-control text-[18px] text-ink hover:bg-subtle disabled:text-faint disabled:hover:bg-transparent";

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" aria-label={t.prev} disabled={!canPrev} onClick={() => setMonth(addMonths(month, -1))} className={nav}>
          ‹
        </button>
        <p className="text-body font-semibold capitalize" aria-live="polite">
          {formatDay(locale, month, MONTH_YEAR)}
        </p>
        <button type="button" aria-label={t.next} onClick={() => setMonth(addMonths(month, 1))} className={nav}>
          ›
        </button>
      </div>
      <div role="grid" aria-label={t.grid} className="mt-1 grid grid-cols-7 gap-1">
        <div role="row" className="contents">
          {t.dow.map((d) => (
            <span key={d} role="columnheader" className="t-label py-1 text-center">
              {d}
            </span>
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} role="row" className="contents">
            {days.slice(r * 7, r * 7 + 7).map((d) => {
              // Hari di luar bulan dikosongkan (pindah bulan lewat tombol ‹ ›), supaya tidak ada sel pudar berkontras rendah.
              if (d.slice(0, 7) !== month.slice(0, 7)) return <div key={d} role="gridcell" aria-hidden className="min-h-11" />;
              const b = bandOf(d);
              const blocked = b.band === "blocked";
              const selected = d === value;
              const earliest = d === earliestDate;
              return (
                <div key={d} role="gridcell" aria-selected={selected}>
                  <button
                    type="button"
                    aria-label={`${Number(d.slice(8))}, ${d}: ${t.band[b.band]}${blocked ? "" : `, ${t.weeks(b.weeks)}`}`}
                    aria-pressed={selected}
                    disabled={blocked}
                    onClick={() => onChange(d)}
                    className={`pressable tabular relative flex min-h-11 w-full items-center justify-center rounded-inner text-[14px] ${BAND_CELL[b.band]} ${
                      selected ? "ring-2 ring-ink ring-offset-1 ring-offset-surface font-bold" : earliest ? "ring-1 ring-line-strong" : ""
                    } disabled:cursor-not-allowed`}
                  >
                    {Number(d.slice(8))}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[12px] text-muted" aria-label={t.legend}>
        {(["red", "yellow", "green", "grey"] as Band[]).map((b) => (
          <li key={b} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-3 w-3 rounded-[3px] ${BAND_CELL[b]}`} />
            {t.band[b]}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-[3px] ring-1 ring-line-strong" />
          {t.earliest}
        </li>
      </ul>
    </div>
  );
}
