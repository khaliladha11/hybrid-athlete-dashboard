import type { Metadata } from "next";
import { RunGenerator } from "@/components/generator/RunGenerator";
import { BlockBadge } from "@/components/generator/BlockBadge";
import { randomSeed } from "@/lib/generator/rng";
import { getTrainingContext } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Generator Lari · Hybrid Athlete" };

export default async function RunPage() {
  const ctx = await getTrainingContext();
  return (
    <div className="space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Generator Lari</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Pilih durasi & kesulitan — workout lengkap dengan pace, HR, dan RPE.</p>
        </div>
        <BlockBadge block={ctx.block} />
      </header>
      <RunGenerator readiness={ctx.readiness} block={ctx.block} cadenceSpm={ctx.cadenceSpm} initialSeed={randomSeed()} />
    </div>
  );
}
