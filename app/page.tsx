import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";
import { ActivityCalendar } from "@/components/profile/ActivityCalendar";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConditionsCard, EquipmentLibraryCard, ProfileHeader, RunZonesCard, TargetsCard } from "@/components/profile/ProfileDetails";
import { WeeklySummary } from "@/components/profile/WeeklySummary";
import { SettingsCard } from "@/components/profile/SettingsCard";
import { WellnessCard } from "@/components/profile/WellnessCard";
import { CoachCard } from "@/components/generator/CoachCard";
import { todayWib } from "@/lib/date";
import { getActivities, getWellness } from "@/lib/intervals/data-source";
import { profile } from "@/lib/profile";
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
  const [activities, wellness] = await Promise.all([getActivities(Math.max(days, 30), today), getWellness(8, today)]);
  const readiness =
    activities.ok || wellness.ok
      ? assessReadiness(wellness.ok ? wellness.data : [], activities.ok ? activities.data : [], today)
      : null;

  return (
    <div className="space-y-4">
      <ProfileHeader profile={profile} />

      <CoachCard advice={[...readinessAdvice(readiness), ...(activities.ok ? weeklyAdvice(activities.data, today) : [])]} />

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

      <WellnessCard result={wellness} today={today} />
      <WeeklySummary result={activities} today={today} />
      {activities.ok ? (
        <ActivityCalendar activities={activities.data} today={today} oldest={oldest} />
      ) : (
        <Card title="Kalender aktivitas">
          <ErrorState error={activities.error} compact />
        </Card>
      )}
      <TargetsCard profile={profile} />
      <ConditionsCard profile={profile} />
      <RunZonesCard profile={profile} />
      <EquipmentLibraryCard profile={profile} />
      <SettingsCard />
    </div>
  );
}
