"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/Card";

export interface ChartTable {
  columns: string[];
  /** Sel kosong (`undefined`) ditulis "·" warna faint. */
  rows: (string | undefined)[][];
}

/**
 * Kerangka grafik Insight (docs/INSIGHT.md §5, I6): judul pendek, satu kalimat ringkasan, grafik, lalu toggle
 * "Lihat tabel" yang menampilkan data yang sama sebagai teks. Bila data tidak cukup (`drawable` false), hanya
 * kalimatnya yang tampil, tanpa grafik kosong.
 */
export function ChartCard({
  title,
  summary,
  drawable,
  table,
  legend,
  header,
  children,
}: {
  title: string;
  summary: string;
  drawable: boolean;
  table: ChartTable;
  legend?: React.ReactNode;
  /** Kontrol di atas ringkasan (mis. Segmented), tetap tampil walau data tidak cukup. */
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Card title={title}>
      {header && <div className="mb-4">{header}</div>}
      <p className={`text-body ${drawable ? "text-ink" : "text-muted"}`}>{summary}</p>
      {drawable && (
        <>
          <div className="mt-4">{children}</div>
          {legend && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">{legend}</div>}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
            className="pressable mt-2 inline-flex min-h-11 items-center text-body font-semibold text-brand-ink"
          >
            {open ? "Sembunyikan tabel" : "Lihat tabel"}
          </button>
          {open && (
            <div id={id} className="mt-1 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b border-line">
                    {table.columns.map((c, i) => (
                      <th key={c} scope="col" className={`t-label py-2 font-normal ${i ? "pl-2 text-right" : ""}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, ri) => (
                    <tr key={ri} className="border-b border-line last:border-0">
                      {r.map((cell, ci) =>
                        ci === 0 ? (
                          <th key={ci} scope="row" className="py-2 pr-2 font-normal">
                            {cell}
                          </th>
                        ) : (
                          <td key={ci} className={`py-2 pl-2 text-right ${cell === undefined ? "text-faint" : ""}`}>
                            {cell ?? "·"}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/** Kotak warna legenda. */
export function Swatch({ className, label, line = false }: { className: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={line ? `h-0.5 w-4 ${className}` : `h-2.5 w-2.5 rounded-[3px] ${className}`} />
      {label}
    </span>
  );
}
