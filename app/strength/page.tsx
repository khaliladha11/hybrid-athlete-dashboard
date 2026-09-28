import type { Metadata } from "next";
import { StrengthGenerator } from "@/components/generator/StrengthGenerator";
import { randomSeed } from "@/lib/generator/rng";
import { getReadiness } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Generator ST · Hybrid Athlete" };

export default async function StrengthPage() {
  const readiness = await getReadiness();
  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Generator Strength</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Spine-Friendly · hanya gerakan dari movement library · RPE maks 7.</p>
      </header>
      <StrengthGenerator readiness={readiness} initialSeed={randomSeed()} />
    </div>
  );
}
