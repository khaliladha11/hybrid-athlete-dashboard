"use client";

import { useState } from "react";

/** Tombol aksi berisiko dua langkah: tap pertama minta konfirmasi, tap kedua menjalankan. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled = false,
  size = "sm",
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** `md`: area sentuh 44px. */
  size?: "sm" | "md";
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
      disabled={disabled}
      className={`pressable ${size === "md" ? "min-h-11" : "min-h-9"} shrink-0 disabled:opacity-50 rounded-control px-3 text-[13px] font-semibold ${
        armed ? "bg-danger text-surface" : "text-muted hover:bg-subtle hover:text-ink"
      }`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
