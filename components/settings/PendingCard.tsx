"use client";

import { ConnectionStep } from "@/components/onboarding/ConnectionStep";
import { InstallStep } from "@/components/onboarding/InstallStep";
import { ProtectStep } from "@/components/onboarding/ProtectStep";
import { Card } from "@/components/ui/Card";
import { useInstallState } from "@/lib/install-prompt";
import { confirmProtection, markCompleted, pendingReminders, type Reminder } from "@/lib/onboarding";
import { useOnboardingState } from "@/lib/onboarding-store";
import { useAthleteSettings } from "@/lib/settings-store";

const TITLE: Record<Reminder, string> = {
  connection: "Sambungkan intervals.icu",
  protect: "Amankan deploy",
  zones: "Zona lari masih perkiraan",
  install: "Pasang ke layar utama",
};

const HINT: Record<Reminder, string> = {
  connection: "Aplikasi masih memakai Demo Mode atau belum bisa membaca datamu.",
  protect: "Belum dikonfirmasi bahwa hanya kamu yang bisa membuka deploy ini.",
  zones: "Pace latihan masih dari VDOT 30. Isi dari hasil lomba atau manual.",
  install: "Belum dipasang di perangkat ini.",
};

/**
 * Langkah onboarding yang dilewati, sebagai pengingat di atas Setting (bukan pop-up). Tiap baris
 * memakai komponen langkahnya sendiri, jadi aksinya sama dengan di onboarding.
 */
export function PendingCard() {
  const [state, setState] = useOnboardingState();
  const { standalone } = useInstallState();
  const [settings] = useAthleteSettings();
  const reminders = pendingReminders({ state, standalone, zonesOverridden: Object.keys(settings.runZones).length > 0 });
  if (!state || !reminders.length) return null;
  const now = () => new Date().toISOString();

  return (
    <Card title="Belum selesai" action={<span className="t-label">{reminders.length} langkah</span>}>
      <ul className="divide-y divide-line">
        {reminders.map((r) => (
          <li key={r} className="py-1">
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-body font-semibold">{TITLE[r]}</span>
                  <span className="block text-[13px] text-muted">{HINT[r]}</span>
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
                    Isi zona lari
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
