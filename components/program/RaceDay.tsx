"use client";

import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";
import { raceCountdown, raceWeekChecklist, type Program } from "@/lib/program";

/** "14 hari lagi · Half Marathon" (label mono); "Hari ini · …" di hari lomba. Null setelah lomba. */
export function countdownText(program: Program, today: string): string | null {
  const c = raceCountdown(program, today);
  if (!c) return null;
  return `${c.days === 0 ? "Hari ini" : `${c.days} hari lagi`} · ${program.spec.label}`;
}

/** Minggu lomba (PROGRAM-HIDUP §4.9): checklist umum H-1 dengan rencana pace. Bukan saran medis. */
export function RaceWeekChecklist({ program, predictedPaceSec }: { program: Program; predictedPaceSec?: number }) {
  const items = raceWeekChecklist({ racePaceSec: program.racePaceSec, predictedPaceSec });
  return (
    <div className="mt-4 rounded-inner border border-line-strong p-3">
      <p className="t-label">Checklist H-1</p>
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
      <p className="mt-2 text-[12px] text-faint">Panduan umum, bukan saran medis.</p>
    </div>
  );
}

/** Setelah lomba: tawaran mencatat hasil di Setting › Zona (memperkuat sumber utama perkiraan). */
export function PostRaceOffer({ program }: { program: Program }) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="text-body font-semibold">Lomba {program.spec.label} sudah lewat. Catat hasilnya?</p>
      <p className="mt-1 text-[13px] text-muted">Hasil lomba membuat perkiraan waktu lebih yakin dan bisa dipakai untuk memperbarui zona.</p>
      <Link href={`/setting?catat=${program.input.race}&tgl=${program.raceDate}#zona`} className={`${BUTTON.base} ${BUTTON.primary} mt-3 w-full`}>
        Catat hasil lomba
      </Link>
    </section>
  );
}
