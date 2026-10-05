import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";
import { ActivityList } from "@/components/profile/ActivityList";
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
  const [activities, wellness] = await Promise.all([getActivities(30, today), getWellness(8, today)]);
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
      <ActivityList result={activities} />
      <TargetsCard profile={profile} />
      <ConditionsCard profile={profile} />
      <RunZonesCard profile={profile} />
      <EquipmentLibraryCard profile={profile} />
      <SettingsCard />
    </div>
  );
}
