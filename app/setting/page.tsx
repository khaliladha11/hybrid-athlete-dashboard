import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { passcodeConfig } from "@/lib/auth/config";
import { redisEnv } from "@/lib/redis";
import { availability } from "@/lib/sync/server";

export const metadata: Metadata = { title: "Setting · Hybrid Athlete" };

export default function SettingPage() {
  const status = availability(passcodeConfig(), redisEnv());
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">Setting</h1>
        <p className="mt-0.5 text-[13px] text-muted">Profil, kondisi, zona lari, alat, dan gerakan. {status.sync ? "Tersimpan di perangkat ini dan disinkronkan." : "Tersimpan di perangkat ini."}</p>
      </header>
      <SettingsView status={status} />
    </div>
  );
}
