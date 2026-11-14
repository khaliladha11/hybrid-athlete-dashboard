import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { APP_VERSION } from "@/lib/app-release";
import { passcodeConfig } from "@/lib/auth/config";
import { getRunHrRefs } from "@/lib/intervals/data-source";
import { redisEnv } from "@/lib/redis";
import { availability } from "@/lib/sync/server";
import { SETTINGS } from "@/lib/i18n/messages/settings";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: SETTINGS[await getLocale()].page.meta };
}

export default async function SettingPage() {
  const status = availability(passcodeConfig(), redisEnv());
  // Isian awal zona HR (0.17): LTHR & HR maks lari intervals.icu, cache 1 jam; gagal = kosong.
  const hrRefs = await getRunHrRefs();
  const t = SETTINGS[await getLocale()].page;
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">{t.title}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{t.intro(status.sync)}</p>
      </header>
      <SettingsView status={status} hrRefs={hrRefs} version={APP_VERSION} />
    </div>
  );
}
