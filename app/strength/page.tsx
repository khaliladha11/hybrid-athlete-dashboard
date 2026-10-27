import type { Metadata } from "next";
import { BlockBadge } from "@/components/generator/BlockBadge";
import { StrengthGenerator } from "@/components/generator/StrengthGenerator";
import Link from "next/link";
import { LogHistory } from "@/components/log/LogHistory";
import { BuyReminderCard } from "@/components/strength/BuyReminderCard";
import { LoadRuleNotice } from "@/components/strength/LoadRuleNotice";
import { PrSection } from "@/components/strength/PrSection";
import { ActiveSessionBanner } from "@/components/workout/ActiveSessionBanner";
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
      <ActiveSessionBanner />
      <LoadRuleNotice />
      <StrengthGenerator advice={ctx.advice} todayDone={ctx.todayDone} initialSeed={randomSeed()} prefill={prefill} />
      <Link href="/setting#alat" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-ink hover:underline">
        Atur alat di Setting
      </Link>
      <BuyReminderCard />
      <PrSection />
      <div className="pt-4">
        <LogHistory />
      </div>
    </div>
  );
}
