"use client";

import { useBlockContext, useBlockMode } from "@/lib/settings-store";
import { useT } from "@/lib/i18n/client";
import { GENERATOR } from "@/lib/i18n/messages/generator";

/** Posisi di blok periodisasi: segmen per minggu, minggu berjalan oranye, deload biru. */
export function BlockBadge() {
  const [enabled] = useBlockMode();
  const block = useBlockContext();
  const t = useT(GENERATOR).block;
  if (!enabled) {
    return (
      <div className="shrink-0 text-right">
        <p className="t-label">{t.program}</p>
        <p className="text-body font-semibold text-danger-ink">{t.off}</p>
        <p className="t-label">{t.free}</p>
      </div>
    );
  }
  return (
    <div className="shrink-0 text-right" aria-label={t.aria(block.index + 1, block.week, block.weeks, block.deload)}>
      <p className="t-label">{t.label(block.index + 1)}</p>
      <p className={`tabular text-body font-semibold ${block.deload ? "text-info" : "text-ink"}`}>
        {block.deload ? t.deload : t.week(block.week, block.weeks)}
      </p>
      <div className="mt-1 flex justify-end gap-1" aria-hidden>
        {Array.from({ length: block.weeks }, (_, i) => {
          const w = i + 1;
          const isDeload = w === block.weeks;
          const current = w === block.week;
          return (
            <span
              key={w}
              className={`h-1 w-4 rounded-full ${
                current ? (isDeload ? "bg-info" : "bg-brand") : w < block.week ? "bg-brand/40" : "bg-subtle-strong"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
