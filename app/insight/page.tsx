import { SnapshotTime } from "@/components/offline/SnapshotTime";
import type { Metadata } from "next";
import Link from "next/link";
import { InsightView } from "@/components/insight/InsightView";
import { todayWib } from "@/lib/date";
import { getInsightData, getRunThreshold } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tren · Hybrid Athlete" };

// Insight (0.15.0, docs/INSIGHT.md I2): rute tanpa tab baru, dibuka dari Profil dan Program. Data intervals.icu
// diambil di server (key tidak keluar), data perangkat dibaca di client.
export default async function InsightPage() {
  const today = todayWib();
  const [{ activities, wellness }, runThreshold] = await Promise.all([getInsightData(today), getRunThreshold()]);
  return (
    <div className="space-y-3">
      <Link href="/" className="inline-flex min-h-11 items-center text-body text-muted hover:text-ink">
        ← Profil
      </Link>
      <SnapshotTime at={new Date().toISOString()} />
      <InsightView activities={activities} wellness={wellness} today={today} runThreshold={runThreshold} />
    </div>
  );
}
