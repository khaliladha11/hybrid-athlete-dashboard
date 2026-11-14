import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ONBOARDING } from "@/lib/i18n/messages/onboarding";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: ONBOARDING[await getLocale()].meta };
}

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
