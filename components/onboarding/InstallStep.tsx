"use client";

import { useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { useInstallState } from "@/lib/install-prompt";
import { useT } from "@/lib/i18n/client";
import { ONBOARDING } from "@/lib/i18n/messages/onboarding";

/** Ikon Bagikan iOS (kotak dengan panah ke atas). */
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="inline h-5 w-5 align-[-4px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const AddIcon = () => (
  <svg viewBox="0 0 24 24" className="inline h-5 w-5 align-[-4px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

/**
 * Onboarding langkah 9 (dan pengingat di Setting). Android/Chrome memakai dialog pasang bawaan bila
 * tersedia; iOS memakai instruksi Bagikan › Tambah ke Layar Utama.
 */
export function InstallStep({ onDone, onLater }: { onDone: () => void; onLater?: () => void }) {
  const { standalone, canPrompt, installed, platform, prompt } = useInstallState();
  const [dismissed, setDismissed] = useState(false);
  const t = useT(ONBOARDING).install;

  if (standalone || installed) {
    return (
      <div className="space-y-3">
        <p className="rounded-inner bg-subtle p-3 text-[14px] font-semibold text-success-ink">{t.installed}</p>
        <button type="button" onClick={onDone} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
          {t.next}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-body text-muted">{t.intro}</p>

      {canPrompt ? (
        <button
          type="button"
          onClick={async () => {
            const accepted = await prompt();
            if (accepted) onDone();
            else setDismissed(true);
          }}
          className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}
        >
          {t.install}
        </button>
      ) : platform === "ios" ? (
        <ol className="space-y-2 text-[14px] leading-relaxed">
          <li className="flex gap-3 rounded-inner bg-subtle p-3">
            <span className="t-label mt-0.5 shrink-0">1</span>
            <span>
              {t.ios1A}<span className="font-semibold">Safari</span>{t.ios1B}<span className="font-semibold">{t.share}</span> <ShareIcon />.
            </span>
          </li>
          <li className="flex gap-3 rounded-inner bg-subtle p-3">
            <span className="t-label mt-0.5 shrink-0">2</span>
            <span>
              {t.ios2A}<span className="font-semibold">{t.addHome}</span> <AddIcon />{t.ios2B}
            </span>
          </li>
        </ol>
      ) : (
        <p className="rounded-inner bg-subtle p-3 text-[14px] leading-relaxed">
          {t.menuA}<span className="font-semibold">⋮</span>{t.menuB}<span className="font-semibold">{t.menuInstall}</span>{t.menuOr}
          <span className="font-semibold">{t.menuAdd}</span>.
        </p>
      )}

      {dismissed && <p className="text-[13px] text-muted">{t.dismissed}</p>}
      <p className="text-[13px] text-faint">{t.internet}</p>

      {!canPrompt && (
        <button type="button" onClick={onDone} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary} w-full`}>
          {t.done}
        </button>
      )}
      {onLater && (
        <button type="button" onClick={onLater} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.ghost} w-full`}>
          {t.later}
        </button>
      )}
    </div>
  );
}
