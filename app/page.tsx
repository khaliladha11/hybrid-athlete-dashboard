import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";
import { ActivityCalendar } from "@/components/profile/ActivityCalendar";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProfileHeader, TargetsCard } from "@/components/profile/ProfileDetails";
import { WeeklySummary } from "@/components/profile/WeeklySummary";
import { WellnessCard } from "@/components/profile/WellnessCard";
import { CheckinCard } from "@/components/profile/CheckinCard";
import { ProfileCoach } from "@/components/program/ProfileCoach";
import { ProgramWeekSummary } from "@/components/program/ProgramWeekSummary";
import { ZoneOffer } from "@/components/settings/ZoneOffer";
import { todayWib } from "@/lib/date";
import { READINESS_WELLNESS_DAYS, getActivities, getRunThreshold, getWellness } from "@/lib/intervals/data-source";
import { thresholdLines } from "@/lib/thresholds";
import { MonthlyProfileCard } from "@/components/profile/MonthlyProfileCard";
import { readinessAdvice, weeklyAdvice } from "@/lib/coach";
import { assessReadiness } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const today = todayWib();
  // Kalender butuh bulan ini + bulan lalu; kartu lain memfilter tanggal sendiri.
  const prevMonth = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
  const oldest = prevMonth.toISOString().slice(0, 10);
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - prevMonth.getTime()) / 86_400_000) + 1;
  const [activities, wellness, runThreshold] = await Promise.all([getActivities(Math.max(days, 30), today), getWellness(READINESS_WELLNESS_DAYS, today), getRunThreshold()]);
  const readiness =
    activities.ok || wellness.ok
      ? assessReadiness(wellness.ok ? wellness.data : [], activities.ok ? activities.data : [], today)
      : null;

  return (
    <div className="space-y-4">
      <ProfileHeader />

      {/* Ringkasan minggu program (0.13): hanya bila ada program aktif di perangkat ini. */}
      <ProgramWeekSummary activities={activities.ok ? activities.data : []} oldest={oldest} today={today} />

      {/* Saran update zona (0.13.2): hanya bila dua hasil lomba menunjukkan kebugaran naik. */}
      <ZoneOffer today={today} />

      {/* Ringkasan bulan lalu (0.15.2): tanggal 1–7, sekali per bulan. */}
      <MonthlyProfileCard today={today} />

      {/* Check-in harian (0.15.2): sekali per hari, opsional; hanya menurunkan saran. */}
      <CheckinCard today={today} />

      <ProfileCoach
        advice={[...readinessAdvice(readiness), ...(activities.ok ? weeklyAdvice(activities.data, today) : [])]}
        activities={activities.ok ? activities.data : []}
        oldest={oldest}
        today={today}
      />

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/run"
          className={`${BUTTON.base} ${BUTTON.primary} min-h-12`}
        >
          Generate lari →
        </Link>
        <Link
          href="/strength"
          className={`${BUTTON.base} ${BUTTON.secondary} min-h-12`}
        >
          Generate ST →
        </Link>
      </div>

      <WellnessCard
        result={wellness}
        today={today}
        basis={readiness?.basis}
        used={readiness?.used}
        thresholds={
          readiness
            ? thresholdLines({
                hard: runThreshold,
                hrv: readiness.baselines.hrv,
                restingHr: readiness.baselines.restingHr,
                hrvAvailable: readiness.used.includes("HRV"),
                rhrAvailable: readiness.used.includes("resting HR"),
              })
            : undefined
        }
      />
      <WeeklySummary result={activities} today={today} />
      {activities.ok ? (
        <ActivityCalendar activities={activities.data} today={today} oldest={oldest} />
      ) : (
        <Card title="Kalender aktivitas">
          <ErrorState error={activities.error} compact />
        </Card>
      )}
      <TargetsCard />
      <Link href="/setting" className={`${BUTTON.base} ${BUTTON.secondary} w-full`}>
        Kondisi, zona lari & alat → Setting
      </Link>
    </div>
  );
}
