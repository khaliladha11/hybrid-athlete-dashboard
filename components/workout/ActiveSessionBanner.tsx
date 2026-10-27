"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BUTTON } from "@/components/ui/Card";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { parseActiveWorkout, setsDone, setsPlanned } from "@/lib/workout-state";

/** Sesi mode latihan yang masih berjalan (ditinggal atau app ditutup): tawarkan lanjut. */
export function ActiveSessionBanner() {
  const [raw] = useStoredString(PREF_KEYS.activeWorkout, "");
  const s = useMemo(() => parseActiveWorkout(raw), [raw]);
  if (!s) return null;
  return (
    <section aria-label="Sesi berjalan" className="space-y-3 rounded-card border-2 border-brand bg-surface p-4 shadow-card">
      <div>
        <p className="t-label text-brand-ink">Sesi berjalan</p>
        <p className="mt-1 text-body font-semibold">{s.workout.title}</p>
        <p className="tabular text-[13px] text-muted">
          {setsDone(s)}/{setsPlanned(s)} set
        </p>
      </div>
      <Link href="/strength/sesi" className={`${BUTTON.base} ${BUTTON.primary} w-full`}>
        Lanjutkan sesi
      </Link>
    </section>
  );
}
