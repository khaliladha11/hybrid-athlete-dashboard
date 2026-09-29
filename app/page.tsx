import Link from "next/link";
import { ActivityList } from "@/components/profile/ActivityList";
import { ConditionsCard, EquipmentLibraryCard, ProfileHeader, RunZonesCard, TargetsCard } from "@/components/profile/ProfileDetails";
import { WeeklySummary } from "@/components/profile/WeeklySummary";
import { WellnessCard } from "@/components/profile/WellnessCard";
import { ReadinessBanner } from "@/components/generator/ReadinessBanner";
import { todayWib } from "@/lib/date";
import { getActivities, getWellness } from "@/lib/intervals/data-source";
import { profile } from "@/lib/profile";
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
    <div className="space-y-3">
      <ProfileHeader profile={profile} />

      <ReadinessBanner readiness={readiness} />

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/run"
          className="pressable rounded-2xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-700"
        >
          Generate lari →
        </Link>
        <Link
          href="/strength"
          className="pressable rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
    </div>
  );
}
