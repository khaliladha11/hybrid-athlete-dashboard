"use client";

import { MuscleMap } from "@/components/charts/MuscleMap";
import { muscleAriaLabel, muscleSummary } from "@/lib/movements/muscle-regions";
import { useLocale, useT } from "@/lib/i18n/client";
import { muscleName, textOnlyMuscle } from "@/lib/i18n/safety-text";
import { STRENGTH } from "@/lib/i18n/messages/strength";

/** Ringkasan otot sesi (0.14.1): gabungan otot utama/sekunder semua gerakan, peta depan/belakang, dan daftar teks. */
export function MuscleSummary({ movements, title }: { movements: readonly string[]; title?: string }) {
  const t = useT(STRENGTH).muscles;
  const locale = useLocale();
  const mn = (m: string) => muscleName(m, locale);
  title ??= t.title;
  const s = muscleSummary(movements);
  if (!s.primary.length) return null;
  const notes = [...s.primary, ...s.secondary].filter((m) => textOnlyMuscle(m, locale));
  return (
    <section aria-label={title} className="space-y-3">
      <p className="t-label">{title}</p>
      <MuscleMap primary={s.primaryRegions} secondary={s.secondaryRegions} label={muscleAriaLabel(s, locale, mn)} />
      <dl className="space-y-1 text-[13px]">
        <div className="flex gap-2">
          <dt className="flex shrink-0 items-center gap-1.5 font-semibold">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand" />
            {t.primary}
          </dt>
          <dd>{s.primary.map(mn).join(", ")}</dd>
        </div>
        {s.secondary.length > 0 && (
          <div className="flex gap-2">
            <dt className="flex shrink-0 items-center gap-1.5 font-semibold">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-brand bg-brand-soft" />
              {t.secondary}
            </dt>
            <dd className="text-muted">{s.secondary.map(mn).join(", ")}</dd>
          </div>
        )}
      </dl>
      {notes.map((m) => (
        <p key={m} className="text-[12px] text-muted">
          {mn(m)}: {textOnlyMuscle(m, locale)}.
        </p>
      ))}
    </section>
  );
}
