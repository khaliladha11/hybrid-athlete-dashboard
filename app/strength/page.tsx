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
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold">Generator Strength</h1>
          <p className="mt-0.5 text-[13px] text-muted">Spine-Friendly · hanya gerakan dari movement library · RPE maks 7.</p>
        </div>
        <BlockBadge block={ctx.block} />
      </header>
      <StrengthGenerator advice={ctx.advice} block={ctx.block} initialSeed={randomSeed()} />
    </div>
  );
}
