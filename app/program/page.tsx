import { SnapshotTime } from "@/components/offline/SnapshotTime";
import type { Metadata } from "next";
import { ProgramView } from "@/components/program/ProgramView";
import { addDays, todayWib } from "@/lib/date";
import { getActivities } from "@/lib/intervals/data-source";

import { PROGRAM } from "@/lib/i18n/messages/program";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: PROGRAM[await getLocale()].page.meta };
}

export default async function ProgramPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const today = todayWib();
  const t = PROGRAM[await getLocale()].page;
  const params = await searchParams;
  // Long run yang dipendekkan lewat Terapkan di kartu saran Profil.
  const longKm = Number(Array.isArray(params.long) ? params.long[0] : params.long);
  const longAdjust = Number.isFinite(longKm) && longKm >= 1 && longKm <= 60 ? { km: Math.round(longKm * 2) / 2, easy: params.easy === "1" } : undefined;
  // 90 hari dari server (perkiraan waktu lomba, 0.13.2); bila program butuh data lebih lama, sisanya diambil di client.
  const acts = await getActivities(90, today);
  return (
    <div className="space-y-4">
      <SnapshotTime at={new Date().toISOString()} />
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">{t.title}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{t.intro}</p>
      </header>
      <ProgramView today={today} activities={acts.ok ? acts.data : []} oldest={addDays(today, -89)} longAdjust={longAdjust} />
    </div>
  );
}
