"use client";

import { useId } from "react";

/**
 * Sakelar on/off. Aktif = hijau, nonaktif = merah (sesuai sistem warna status).
 * Status juga ditulis sebagai teks ("Aktif"/"Nonaktif"), tidak hanya warna.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-body font-semibold">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      <span className={`text-[12px] font-semibold ${checked ? "text-success-ink" : "text-danger-ink"}`} aria-hidden>
        {checked ? "Aktif" : "Nonaktif"}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`pressable relative h-7 w-12 shrink-0 rounded-full after:absolute after:-inset-2 after:content-[''] ${
          checked ? "bg-success" : "bg-danger"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-in-out motion-reduce:transition-none ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
