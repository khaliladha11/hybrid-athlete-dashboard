import { SnapshotTime } from "@/components/offline/SnapshotTime";
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

import { GENERATOR } from "@/lib/i18n/messages/generator";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: GENERATOR[await getLocale()].stPage.meta };
}

export default async function StrengthPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [ctx, params] = await Promise.all([getTrainingContext(undefined, await getLocale()), searchParams]);
  const prefill = parseStrengthPrefill(params, await getLocale());
  const t = GENERATOR[await getLocale()].stPage;
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
      <ActiveSessionBanner />
      <LoadRuleNotice />
      <StrengthGenerator advice={ctx.advice} todayDone={ctx.todayDone} initialSeed={randomSeed()} prefill={prefill} />
      <Link href="/setting#alat" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-ink hover:underline">
        {t.equipment}
      </Link>
      <BuyReminderCard />
      <PrSection />
      <div className="pt-4">
        <LogHistory />
      </div>
    </div>
  );
}
