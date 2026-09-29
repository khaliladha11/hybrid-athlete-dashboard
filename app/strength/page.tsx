import type { Metadata } from "next";
import { BlockBadge } from "@/components/generator/BlockBadge";
import { StrengthGenerator } from "@/components/generator/StrengthGenerator";
import { randomSeed } from "@/lib/generator/rng";
import { getTrainingContext } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Generator ST · Hybrid Athlete" };

export default async function StrengthPage() {
  const ctx = await getTrainingContext();
  return (
    <div className="space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Generator Strength</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Spine-Friendly · hanya gerakan dari movement library · RPE maks 7.</p>
        </div>
        <BlockBadge block={ctx.block} />
      </header>
      <StrengthGenerator advice={ctx.advice} block={ctx.block} initialSeed={randomSeed()} />
    </div>
  );
}
