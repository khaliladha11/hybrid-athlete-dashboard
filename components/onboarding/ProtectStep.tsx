"use client";

import { useEffect, useState } from "react";
import { BUTTON, Chip } from "@/components/ui/Card";
import type { Availability } from "@/lib/sync/server";

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
      <DeployStatus />
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

/** Sandi aplikasi & database (0.12): dibaca dari /api/status yang hanya mengembalikan boolean. */
function DeployStatus() {
  const [status, setStatus] = useState<Availability | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Availability>) : Promise.reject(new Error(String(r.status)))))
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const row = (label: string, on: boolean | undefined) => (
    <li className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-[14px]">{label}</span>
      {on === undefined ? <span className="text-faint">·</span> : <Chip tone={on ? "success" : "neutral"}>{on ? "Terpasang" : "Belum"}</Chip>}
    </li>
  );

  return (
    <div className="rounded-inner border border-line p-3">
      <p className="t-label">Sandi aplikasi & sinkron · opsional</p>
      <ul className="mt-1 divide-y divide-line">
        {row("Sandi aplikasi", failed ? undefined : status?.passcode)}
        {row("Database (sinkron antar perangkat)", failed ? undefined : status?.database)}
      </ul>
      {status && !status.sync && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Untuk mengunci aplikasi dan menyamakan data di HP & laptop: Vercel › <span className="font-semibold text-ink">Storage › Upstash Redis</span>, hubungkan ke
          project; isi <code className="font-mono text-[12px]">APP_PASSCODE</code> dan <code className="font-mono text-[12px]">SESSION_SECRET</code> di Environment
          Variables; lalu Redeploy.
        </p>
      )}
    </div>
  );
}
