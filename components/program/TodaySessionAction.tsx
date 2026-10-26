"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import type { Program } from "@/lib/program";
import type { PlannedSession } from "@/lib/program/sessions";
import { generatorHref, toGenerator } from "@/lib/program/to-generator";
import { ProgramSessionCard } from "./ProgramSessionCard";

/**
 * Tombol "Kerjakan sesi hari ini" (PROGRAM-HIDUP §4.4). Sesi lari/ST → generator dengan isian dari program.
 * Long run, lomba, dan sesi spesifik lomba → kartu sesi program (di halaman Program dibuka di tempat).
 */
export function TodaySessionAction({
  session,
  program,
  where,
  longAdjust,
}: {
  session: PlannedSession;
  program: Program;
  where: "program" | "profile";
  longAdjust?: { km: number; easy: boolean };
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
        Kerjakan sesi hari ini
      </Link>
    );
  }
  if (where === "profile") {
    return (
      <Link href="/program#sesi-hari-ini" className={cls}>
        Kerjakan sesi hari ini
      </Link>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cls}>
        {open ? "Tutup sesi hari ini" : "Kerjakan sesi hari ini"}
      </button>
      {open && <ProgramSessionCard session={session} program={program} km={longAdjust?.km} easyOnly={longAdjust?.easy} />}
    </div>
  );
}
