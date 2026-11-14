"use client";

import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";
import { raceCountdown, raceWeekChecklist, type Program } from "@/lib/program";
import { useLocale, useT } from "@/lib/i18n/client";
import { PROGRAM } from "@/lib/i18n/messages/program";
import type { Locale } from "@/lib/i18n/locale";

/** "14 hari lagi · Half Marathon" (label mono); "Hari ini · …" di hari lomba. Null setelah lomba. */
export function countdownText(program: Program, today: string, locale: Locale = "id"): string | null {
  const c = raceCountdown(program, today);
  if (!c) return null;
  const t = PROGRAM[locale].race;
  return `${c.days === 0 ? t.today : t.daysLeft(c.days)} · ${program.spec.label}`;
}

/** Minggu lomba (PROGRAM-HIDUP §4.9): checklist umum H-1 dengan rencana pace. Bukan saran medis. */
export function RaceWeekChecklist({ program, predictedPaceSec }: { program: Program; predictedPaceSec?: number }) {
  const items = raceWeekChecklist({ racePaceSec: program.racePaceSec, predictedPaceSec }, useLocale());
  const t = useT(PROGRAM).race;
  return (
    <div className="mt-4 rounded-inner border border-line-strong p-3">
      <p className="t-label">{t.checklist}</p>
      <ul className="mt-2 space-y-1.5 text-[14px] text-ink">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="text-info">
              ›
            </span>
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-faint">{t.notMedical}</p>
    </div>
  );
}

/** Setelah lomba: tawaran mencatat hasil di Setting › Zona (memperkuat sumber utama perkiraan). */
export function PostRaceOffer({ program }: { program: Program }) {
  const t = useT(PROGRAM).race;
  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="text-body font-semibold">{t.past(program.spec.label)}</p>
      <p className="mt-1 text-[13px] text-muted">{t.pastBody}</p>
      <Link href={`/setting?catat=${program.input.race}&tgl=${program.raceDate}#zona`} className={`${BUTTON.base} ${BUTTON.primary} mt-3 w-full`}>
        {t.log}
      </Link>
    </section>
  );
}
