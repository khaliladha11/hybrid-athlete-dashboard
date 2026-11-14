import { SnapshotTime } from "@/components/offline/SnapshotTime";
import type { Metadata } from "next";
import Link from "next/link";
import { InsightView } from "@/components/insight/InsightView";
import { WeeklySummary } from "@/components/profile/WeeklySummary";
import { todayWib } from "@/lib/date";
import { getInsightData, getRunThreshold } from "@/lib/intervals/data-source";
import { INSIGHT } from "@/lib/i18n/messages/insight";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: INSIGHT[await getLocale()].meta };
}

// Insight (0.15.0, docs/INSIGHT.md I2): rute tanpa tab baru, dibuka dari Profil dan Program. Data intervals.icu
// diambil di server (key tidak keluar), data perangkat dibaca di client.
export default async function InsightPage() {
  const today = todayWib();
  const t = INSIGHT[await getLocale()];
  const [{ activities, wellness }, runThreshold] = await Promise.all([getInsightData(today), getRunThreshold()]);
  return (
    <div className="space-y-3">
      <Link href="/" className="inline-flex min-h-11 items-center text-body text-muted hover:text-ink">
        {t.back}
      </Link>
      <SnapshotTime at={new Date().toISOString()} />
      <InsightView
        activities={activities}
        wellness={wellness}
        today={today}
        runThreshold={runThreshold}
        week={
          <section id="minggu-ini" aria-labelledby="minggu-ini-title" className="scroll-mt-4 space-y-3">
            <h2 id="minggu-ini-title" className="t-label pt-2 text-ink">
              {t.thisWeek}
            </h2>
            <WeeklySummary result={activities} today={today} />
          </section>
        }
      />
    </div>
  );
}
