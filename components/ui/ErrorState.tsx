"use client";

import { useLocale } from "@/lib/i18n/client";
import { errorText } from "@/lib/intervals/error-text";
import type { IntervalsError } from "@/lib/intervals/types";

export function ErrorState({ error, compact }: { error: IntervalsError; compact?: boolean }) {
  const { title, message } = errorText(error, useLocale());
  return (
    <div role="alert" className={`rounded-inner border border-danger/30 bg-danger-soft text-danger-ink ${compact ? "p-3" : "p-4"}`}>
      <p className="text-body font-semibold">{title}</p>
      <p className="mt-0.5 text-[13px] opacity-90">{message}</p>
    </div>
  );
}
