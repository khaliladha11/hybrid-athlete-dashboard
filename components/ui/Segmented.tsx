"use client";

import { useId } from "react";

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
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  /** Tampilkan 2 kolom di layar sempit (untuk label panjang). */
  wrap?: boolean;
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
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`pressable min-h-11 whitespace-nowrap rounded-sm border px-2 text-body ${
                active
                  ? "border-brand bg-brand-soft font-semibold text-brand-ink"
                  : "border-line-strong bg-surface text-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
