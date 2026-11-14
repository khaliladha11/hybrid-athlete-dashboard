"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
// Pasang pendengar beforeinstallprompt sejak awal (dipakai onboarding langkah 9 & Setting).
import "@/lib/install-prompt";
import { acceptTerms, gateDecision, migratedState } from "@/lib/onboarding";
import { useHasLegacyData, useOnboardingState } from "@/lib/onboarding-store";
import { useIsClient } from "@/lib/settings-store";
import { TermsStep } from "./TermsStep";
import { useT } from "@/lib/i18n/client";
import { ONBOARDING } from "@/lib/i18n/messages/onboarding";

/**
 * Gate onboarding (docs/ONBOARDING.md §6). Status hanya ada di perangkat, jadi diperiksa di client:
 * selama memeriksa tampil kerangka, bukan konten lalu redirect.
 * - Pengguna baru → `/onboarding`.
 * - Pengguna lama (punya data sebelum 0.11) → dicatat `migrated`, lalu disclaimer saja sekali.
 * - Versi disclaimer naik → disclaimer saja.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const ready = useIsClient();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useOnboardingState();
  const legacy = useHasLegacyData();
  const t = useT(ONBOARDING).gate;
  // Halaman kunci sandi tidak melewati gate (belum boleh membaca/mengarahkan apa pun).
  const onWizard = pathname.startsWith("/onboarding") || pathname === "/unlock";
  const decision = ready ? gateDecision(state, legacy) : null;

  useEffect(() => {
    if (onWizard || !decision) return;
    if (decision === "migrate") setState(migratedState(new Date().toISOString()));
    else if (decision === "onboarding") router.replace("/onboarding");
  }, [decision, onWizard, router, setState]);

  if (onWizard) return <>{children}</>;
  if (!ready || decision === "onboarding") return <GateSkeleton />;
  if (decision === "terms" || decision === "migrate") {
    return (
      <div className="space-y-4">
        <div>
          <p className="t-label">{t.label}</p>
          <h1 className="mt-1 text-[22px] leading-tight font-semibold">{t.title}</h1>
          <p className="mt-1 text-body text-muted">{t.body}</p>
        </div>
        <TermsStep
          acceptLabel={t.accept}
          onAccept={() => {
            const at = new Date().toISOString();
            setState(acceptTerms(state ?? migratedState(at), at));
          }}
        />
      </div>
    );
  }
  return <>{children}</>;
}

function GateSkeleton() {
  const t = useT(ONBOARDING).gate;
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t.loading}>
      <div className="h-6 w-40 rounded-control bg-subtle" />
      <div className="h-32 rounded-card bg-subtle" />
      <div className="h-24 rounded-card bg-subtle" />
    </div>
  );
}
