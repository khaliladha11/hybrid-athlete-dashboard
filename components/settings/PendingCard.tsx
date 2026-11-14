"use client";

import { ConnectionStep } from "@/components/onboarding/ConnectionStep";
import { InstallStep } from "@/components/onboarding/InstallStep";
import { ProtectStep } from "@/components/onboarding/ProtectStep";
import { Card } from "@/components/ui/Card";
import { useInstallState } from "@/lib/install-prompt";
import { confirmProtection, markCompleted, pendingReminders, type Reminder } from "@/lib/onboarding";
import { useOnboardingState } from "@/lib/onboarding-store";
import { useAthleteSettings } from "@/lib/settings-store";

import { useT } from "@/lib/i18n/client";
import { SETTINGS } from "@/lib/i18n/messages/settings";

/**
 * Langkah onboarding yang dilewati, sebagai pengingat di atas Setting (bukan pop-up). Tiap baris
 * memakai komponen langkahnya sendiri, jadi aksinya sama dengan di onboarding.
 */
export function PendingCard() {
  const [state, setState] = useOnboardingState();
  const { standalone } = useInstallState();
  const [settings] = useAthleteSettings();
  const t = useT(SETTINGS).pending;
  const reminders = pendingReminders({ state, standalone, zonesOverridden: Object.keys(settings.runZones).length > 0 });
  if (!state || !reminders.length) return null;
  const now = () => new Date().toISOString();

  return (
    <Card title={t.title} action={<span className="t-label">{t.steps(reminders.length)}</span>}>
      <ul className="divide-y divide-line">
        {reminders.map((r) => (
          <li key={r} className="py-1">
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-body font-semibold">{t.reminder[r].title}</span>
                  <span className="block text-[13px] text-muted">{t.reminder[r].hint}</span>
                </span>
                <span className="shrink-0 text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                  ›
                </span>
              </summary>
              <div className="details-body pt-2 pb-3">
                {r === "connection" && <ConnectionStep mode="reminder" onOk={() => setState(markCompleted(state, "connection"))} />}
                {r === "protect" && <ProtectStep onConfirm={() => setState(confirmProtection(state, now()))} />}
                {r === "zones" && (
                  <a href="#zona" className="inline-flex min-h-11 items-center text-body font-semibold text-brand-ink hover:underline">
                    {t.fillZones}
                  </a>
                )}
                {r === "install" && <InstallStep onDone={() => setState(markCompleted(state, "install"))} />}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}
