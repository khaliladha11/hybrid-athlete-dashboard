import type { Metadata } from "next";
import { BlockBadge } from "@/components/generator/BlockBadge";
import { StrengthGenerator } from "@/components/generator/StrengthGenerator";
import { LogHistory } from "@/components/log/LogHistory";
import { randomSeed } from "@/lib/generator/rng";
import { getTrainingContext } from "@/lib/intervals/data-source";
import { parseStrengthPrefill } from "@/lib/program/to-generator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Generator ST · Hybrid Athlete" };

export default async function StrengthPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [ctx, params] = await Promise.all([getTrainingContext(), searchParams]);
  const prefill = parseStrengthPrefill(params);
  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold">Generator Strength</h1>
          <p className="mt-0.5 text-[13px] text-muted">Sesuai kondisi & alat di Setting · hanya gerakan dari movement library · RPE maks 7.</p>
        </div>
        <BlockBadge />
      </header>
      <StrengthGenerator advice={ctx.advice} initialSeed={randomSeed()} prefill={prefill} />
      <div className="pt-4">
        <LogHistory />
      </div>
    </div>
  );
}
