"use client";

import { Fragment } from "react";

type PartKey = "h" | "m" | "s";

interface Part {
  key: PartKey;
  unit: string;
  current: number;
  options: number[];
  pad: boolean;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Pemilih waktu tanpa mengetik. Tiap bagian (jam, menit, detik) adalah `<select>` native yang
 * transparan di atas angkanya, jadi di HP yang muncul wheel/daftar bawaan OS. Kolom teks "m:ss"
 * tidak bisa diisi di HP karena keyboard angka tidak punya tombol ":".
 */
export function TimePicker({
  value,
  onChange,
  format,
  minuteRange = [0, 59],
  maxHours = 0,
  invalid = false,
  placeholder = false,
  units = false,
  className = "",
  ...aria
}: {
  /** Total detik. */
  value: number;
  onChange: (seconds: number) => void;
  /** "hms" untuk waktu lomba, "ms" untuk pace per km. */
  format: "hms" | "ms";
  /** Pilihan menit pada format "ms". */
  minuteRange?: [number, number];
  /** Pilihan jam terbesar pada format "hms". */
  maxHours?: number;
  invalid?: boolean;
  /** Belum diisi: angka tampil faint. */
  placeholder?: boolean;
  /** Tulis satuan (jam, menit, detik) di bawah tiap bagian. */
  units?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const h = format === "hms" ? Math.floor(value / 3600) : 0;
  const m = Math.floor((value - h * 3600) / 60);
  const s = Math.round(value - h * 3600 - m * 60);
  // Nilai di luar rentang tetap jadi pilihan, supaya select tidak diam-diam pindah ke nilai lain.
  const parts: Part[] =
    format === "hms"
      ? [
          { key: "h", unit: "jam", current: h, options: range(0, Math.max(maxHours, h)), pad: false },
          { key: "m", unit: "menit", current: m, options: range(0, 59), pad: true },
          { key: "s", unit: "detik", current: s, options: range(0, 59), pad: true },
        ]
      : [
          { key: "m", unit: "menit", current: m, options: range(Math.min(minuteRange[0], m), Math.max(minuteRange[1], m)), pad: false },
          { key: "s", unit: "detik", current: s, options: range(0, 59), pad: true },
        ];
  const label = (p: Part, n: number) => (p.pad ? String(n).padStart(2, "0") : String(n));
  const set = (key: PartKey, n: number) => {
    const next = { h, m, s, [key]: n };
    onChange(next.h * 3600 + next.m * 60 + next.s);
  };

  return (
    <div role="group" {...aria} className={className}>
      <div
        className={`flex min-h-11 items-stretch rounded-control border bg-surface focus-within:border-brand ${invalid ? "border-danger" : "border-line-strong"}`}
      >
        {parts.map((p, i) => (
          <Fragment key={p.key}>
            {i > 0 && (
              <span aria-hidden className="flex items-center text-base text-faint">
                :
              </span>
            )}
            <span className="relative flex min-w-0 flex-1 items-center justify-center rounded-control has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-brand">
              <span aria-hidden className={`tabular text-base ${placeholder ? "text-faint" : "text-ink"}`}>
                {label(p, p.current)}
              </span>
              <select
                aria-label={p.unit}
                value={p.current}
                onChange={(e) => set(p.key, Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 focus-visible:outline-none"
              >
                {p.options.map((n) => (
                  <option key={n} value={n}>
                    {label(p, n)}
                  </option>
                ))}
              </select>
            </span>
          </Fragment>
        ))}
      </div>
      {units && (
        <div aria-hidden className="mt-1 flex px-px">
          {parts.map((p, i) => (
            <Fragment key={p.key}>
              {i > 0 && <span className="invisible text-base leading-none">:</span>}
              <span className="t-label flex-1 text-center">{p.unit}</span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
