"use client";

import { MuscleMap } from "@/components/charts/MuscleMap";
import { muscleAriaLabel, muscleSummary, TEXT_ONLY_MUSCLES } from "@/lib/movements/muscle-regions";
import { useT } from "@/lib/i18n/client";
import { STRENGTH } from "@/lib/i18n/messages/strength";

/** Ringkasan otot sesi (0.14.1): gabungan otot utama/sekunder semua gerakan, peta depan/belakang, dan daftar teks. */
export function MuscleSummary({ movements, title }: { movements: readonly string[]; title?: string }) {
  const t = useT(STRENGTH).muscles;
  title ??= t.title;
  const s = muscleSummary(movements);
  if (!s.primary.length) return null;
  const notes = [...s.primary, ...s.secondary].filter((m) => TEXT_ONLY_MUSCLES[m]);
  return (
    <section aria-label={title} className="space-y-3">
      <p className="t-label">{title}</p>
      <MuscleMap primary={s.primaryRegions} secondary={s.secondaryRegions} label={muscleAriaLabel(s)} />
      <dl className="space-y-1 text-[13px]">
        <div className="flex gap-2">
          <dt className="flex shrink-0 items-center gap-1.5 font-semibold">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand" />
            {t.primary}
          </dt>
          <dd>{s.primary.join(", ")}</dd>
        </div>
        {s.secondary.length > 0 && (
          <div className="flex gap-2">
            <dt className="flex shrink-0 items-center gap-1.5 font-semibold">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-brand bg-brand-soft" />
              {t.secondary}
            </dt>
            <dd className="text-muted">{s.secondary.join(", ")}</dd>
          </div>
        )}
      </dl>
      {notes.map((m) => (
        <p key={m} className="text-[12px] text-muted">
          {m}: {TEXT_ONLY_MUSCLES[m]}.
        </p>
      ))}
    </section>
  );
}
