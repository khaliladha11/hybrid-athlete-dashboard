import { SnapshotTime } from "@/components/offline/SnapshotTime";
import type { Metadata } from "next";
import { RunGenerator } from "@/components/generator/RunGenerator";
import { BlockBadge } from "@/components/generator/BlockBadge";
import { randomSeed } from "@/lib/generator/rng";
import { getTrainingContext } from "@/lib/intervals/data-source";
import { parseRunPrefill } from "@/lib/program/to-generator";

import { GENERATOR } from "@/lib/i18n/messages/generator";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: GENERATOR[await getLocale()].runPage.meta };
}

export default async function RunPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [ctx, params] = await Promise.all([getTrainingContext(undefined, await getLocale()), searchParams]);
  // Isian dari program ("Kerjakan sesi hari ini"); query yang tidak valid diabaikan.
  const prefill = parseRunPrefill(params);
  const t = GENERATOR[await getLocale()].runPage;
  return (
    <div className="space-y-4">
      <SnapshotTime at={new Date().toISOString()} />
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold">{t.title}</h1>
          <p className="mt-0.5 text-[13px] text-muted">{t.intro}</p>
        </div>
        <BlockBadge />
      </header>
      <RunGenerator advice={ctx.advice} todayDone={ctx.todayDone} cadenceSpm={ctx.cadenceSpm} initialSeed={randomSeed()} prefill={prefill} />
    </div>
  );
}
