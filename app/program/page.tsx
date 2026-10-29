import { SnapshotTime } from "@/components/offline/SnapshotTime";
import type { Metadata } from "next";
import { ProgramView } from "@/components/program/ProgramView";
import { addDays, todayWib } from "@/lib/date";
import { getActivities } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Program Target · Hybrid Athlete" };

export default async function ProgramPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const today = todayWib();
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
        <h1 className="text-[22px] leading-tight font-semibold">Program Target</h1>
        <p className="mt-0.5 text-[13px] text-muted">Program mingguan menuju PB 5K, 10K, Half atau Full Marathon.</p>
      </header>
      <ProgramView today={today} activities={acts.ok ? acts.data : []} oldest={addDays(today, -89)} longAdjust={longAdjust} />
    </div>
  );
}
