"use client";

import { useId } from "react";

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
      <legend id={id} className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className={`grid gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80 ${wrap ? "grid-cols-2 min-[480px]:grid-cols-4" : ""}`}
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
              className={`whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
