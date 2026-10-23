import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { isPasscodeEnabled } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Setting · Hybrid Athlete" };

export default function SettingPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">Setting</h1>
        <p className="mt-0.5 text-[13px] text-muted">Profil, kondisi, zona lari, alat, dan gerakan. Tersimpan di perangkat ini.</p>
      </header>
      <SettingsView passcodeEnabled={isPasscodeEnabled()} />
    </div>
  );
}
