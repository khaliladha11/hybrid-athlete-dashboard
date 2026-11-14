import type { Metadata } from "next";
import { WorkoutMode } from "@/components/workout/WorkoutMode";
import { getTrainingContext } from "@/lib/intervals/data-source";

import { GENERATOR } from "@/lib/i18n/messages/generator";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: GENERATOR[await getLocale()].stPage.sessionMeta };
}

export default async function WorkoutPage() {
  const ctx = await getTrainingContext();
  return <WorkoutMode todayDone={ctx.todayDone} />;
}
