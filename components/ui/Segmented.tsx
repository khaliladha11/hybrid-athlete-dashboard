"use client";

import { useId } from "react";
import { TONES, type Tone } from "./tones";

/**
 * Pilihan tunggal. Opsi aktif ditandai oranye (garis + teks + tint) atau tone intensitas.
 * Tanpa animasi pindah indikator: dipakai puluhan kali per hari.
 */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  wrap = false,
  tones,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  /** Tampilkan 2 kolom di layar sempit (untuk label panjang). */
  wrap?: boolean;
  /** Warna opsi saat aktif (mis. kesulitan: Easy hijau, Moderate kuning, High merah). Default oranye. */
  tones?: Partial<Record<string, Tone>>;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend id={id} className="t-label mb-2">
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className={`grid gap-2 ${wrap ? "grid-cols-2 min-[480px]:grid-cols-4" : ""}`}
        style={wrap ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const active = o.value === value;
          const tone = tones?.[String(o.value)];
          const activeClass = tone
            ? `${TONES[tone].border} ${TONES[tone].soft} ${TONES[tone].ink} font-semibold`
            : "border-brand bg-brand-soft font-semibold text-brand-ink";
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`pressable inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-control border px-1.5 text-body whitespace-nowrap ${
                active ? activeClass : "border-line-strong bg-surface text-muted hover:text-ink"
              }`}
            >
              {tone && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TONES[tone].fill}`} />}
              {/* Label terpotong (…) di layar sangat sempit, tidak pernah keluar dari tombol. */}
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
