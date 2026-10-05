"use client";

import { useId } from "react";
import { TONES, type Tone } from "./tones";

/**
 * Pilihan tunggal. Opsi aktif ditandai oranye (garis + teks + tint) supaya jelas
 * di layar terang di luar ruangan, tanpa membanjiri layar dengan blok oranye.
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
      <legend id={id} className="eyebrow mb-2">
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
              className={`pressable min-h-11 whitespace-nowrap rounded-control border px-2 text-body ${
                active ? activeClass : "border-line-strong bg-surface text-muted hover:text-ink"
              }`}
            >
              {tone && <span aria-hidden className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${TONES[tone].fill}`} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
