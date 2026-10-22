"use client";

import { useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { useInstallState } from "@/lib/install-prompt";

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

  if (standalone || installed) {
    return (
      <div className="space-y-3">
        <p className="rounded-inner bg-subtle p-3 text-[14px] font-semibold text-success-ink">✓ Aplikasi sudah terpasang di perangkat ini.</p>
        <button type="button" onClick={onDone} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
          Lanjut
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-body text-muted">Pasang ke layar utama supaya terbuka layar penuh seperti aplikasi biasa.</p>

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
          Pasang aplikasi
        </button>
      ) : platform === "ios" ? (
        <ol className="space-y-2 text-[14px] leading-relaxed">
          <li className="flex gap-3 rounded-inner bg-subtle p-3">
            <span className="t-label mt-0.5 shrink-0">1</span>
            <span>
              Buka halaman ini di <span className="font-semibold">Safari</span>, lalu ketuk <span className="font-semibold">Bagikan</span> <ShareIcon />.
            </span>
          </li>
          <li className="flex gap-3 rounded-inner bg-subtle p-3">
            <span className="t-label mt-0.5 shrink-0">2</span>
            <span>
              Pilih <span className="font-semibold">Tambah ke Layar Utama</span> <AddIcon />, lalu ketuk Tambah.
            </span>
          </li>
        </ol>
      ) : (
        <p className="rounded-inner bg-subtle p-3 text-[14px] leading-relaxed">
          Buka menu browser <span className="font-semibold">⋮</span>, lalu pilih <span className="font-semibold">Instal aplikasi</span> atau{" "}
          <span className="font-semibold">Tambahkan ke layar utama</span>.
        </p>
      )}

      {dismissed && <p className="text-[13px] text-muted">Dialog pasang ditutup. Bisa dicoba lagi lewat menu browser.</p>}
      <p className="text-[13px] text-faint">Catatan: aplikasi masih butuh internet untuk dibuka.</p>

      {!canPrompt && (
        <button type="button" onClick={onDone} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary} w-full`}>
          Sudah saya pasang
        </button>
      )}
      {onLater && (
        <button type="button" onClick={onLater} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.ghost} w-full`}>
          Nanti saja
        </button>
      )}
    </div>
  );
}
