import type { Metadata } from "next";
import { WorkoutMode } from "@/components/workout/WorkoutMode";
import { getTrainingContext } from "@/lib/intervals/data-source";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sesi ST · Hybrid Athlete" };

export default async function WorkoutPage() {
  const ctx = await getTrainingContext();
  return <WorkoutMode todayDone={ctx.todayDone} />;
}
