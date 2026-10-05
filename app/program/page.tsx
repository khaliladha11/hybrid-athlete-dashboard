import type { Metadata } from "next";
import { ProgramView } from "@/components/program/ProgramView";
import { todayWib } from "@/lib/date";
import { getActivities } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Program Target · Hybrid Athlete" };

export default async function ProgramPage() {
  const today = todayWib();
  const acts = await getActivities(30, today);
  const longest = acts.ok
    ? Math.max(0, ...acts.data.filter((a) => a.category === "run").map((a) => a.distanceKm ?? 0))
    : 0;
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">Program Target</h1>
        <p className="mt-0.5 text-[13px] text-muted">Program mingguan menuju PB 5K, 10K, Half atau Full Marathon.</p>
      </header>
      <ProgramView today={today} currentLongRunKm={longest > 0 ? Math.round(longest * 10) / 10 : undefined} />
    </div>
  );
}
