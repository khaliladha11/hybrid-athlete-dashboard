import type { Metadata } from "next";
import { RunGenerator } from "@/components/generator/RunGenerator";
import { randomSeed } from "@/lib/generator/rng";
import { getReadiness } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Generator Lari · Hybrid Athlete" };

export default async function RunPage() {
  const readiness = await getReadiness();
  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Generator Lari</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Pilih durasi & kesulitan — workout lengkap dengan pace, HR, dan RPE.</p>
      </header>
      <RunGenerator readiness={readiness} initialSeed={randomSeed()} />
    </div>
  );
}
