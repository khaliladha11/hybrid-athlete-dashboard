"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import type { Program } from "@/lib/program";
import type { PlannedSession } from "@/lib/program/sessions";
import { generatorHref, toGenerator } from "@/lib/program/to-generator";
import { ProgramSessionCard } from "./ProgramSessionCard";

/**
 * Tombol membuka sesi program (PROGRAM-HIDUP §4.4). Sesi lari/ST → generator dengan isian dari program.
 * Long run, lomba, dan sesi spesifik lomba → kartu sesi program (di halaman Program dibuka di tempat).
 * 0.14.3: dipakai "Sesi minggu ini" untuk sesi yang direkomendasikan hari ini; `label` menyebut sesinya.
 */
export function TodaySessionAction({
  session,
  program,
  where,
  longAdjust,
  label = "Kerjakan sesi ini",
}: {
  session: PlannedSession;
  program: Program;
  where: "program" | "profile";
  longAdjust?: { km: number; easy: boolean };
  label?: string;
}) {
  const t = toGenerator(session);
  const [open, setOpen] = useState(!!longAdjust);
  useEffect(() => {
    if (window.location.hash === "#sesi-hari-ini") setOpen(true);
  }, []);
  const href = generatorHref(session, t);
  const cls = `${BUTTON.base} ${BUTTON.primary} w-full`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {label}
      </Link>
    );
  }
  if (where === "profile") {
    return (
      <Link href="/program#sesi-hari-ini" className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cls}>
        {open ? "Tutup kartu sesi" : label}
      </button>
      {open && <ProgramSessionCard session={session} program={program} km={longAdjust?.km} easyOnly={longAdjust?.easy} />}
    </div>
  );
}
