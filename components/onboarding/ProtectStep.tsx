"use client";

import { BUTTON } from "@/components/ui/Card";

const STEPS: React.ReactNode[] = [
  <>
    Buka <span className="font-semibold">Vercel › project-mu › Settings › Deployment Protection</span>.
  </>,
  <>
    Aktifkan <span className="font-semibold">Vercel Authentication</span>.
  </>,
  <>
    Pilih cakupan <span className="font-semibold">All Deployments</span>, lalu Save. Standard Protection tidak melindungi alamat utama{" "}
    <code className="font-mono text-[12px]">*.vercel.app</code>.
  </>,
];

/** Onboarding langkah 4 (dan pengingat di Setting). Aplikasi tidak bisa memeriksa proteksi dari dalam. */
export function ProtectStep({ onConfirm, onLater }: { onConfirm: () => void; onLater?: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-body text-muted">Deploy-mu berisi data kesehatan. Aktifkan Vercel Authentication supaya hanya kamu yang bisa membukanya.</p>
      <ol className="space-y-2">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-inner bg-subtle p-3 text-[14px] leading-relaxed">
            <span className="t-label mt-0.5 shrink-0">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-faint">Aplikasi tidak bisa memeriksa pengaturan ini dari dalam, jadi konfirmasinya dari kamu.</p>
      <button type="button" onClick={onConfirm} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
        Sudah saya aktifkan
      </button>
      {onLater && (
        <button type="button" onClick={onLater} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.ghost} w-full`}>
          Nanti saja
        </button>
      )}
    </div>
  );
}
