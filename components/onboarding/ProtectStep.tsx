"use client";

import { useEffect, useState } from "react";
import { BUTTON, Chip } from "@/components/ui/Card";
import { DOCS } from "@/lib/docs-links";
import type { Availability } from "@/lib/sync/server";
import { useT } from "@/lib/i18n/client";
import { ONBOARDING } from "@/lib/i18n/messages/onboarding";

/** Onboarding langkah 4 (dan pengingat di Setting). Aplikasi tidak bisa memeriksa proteksi dari dalam. */
export function ProtectStep({ onConfirm, onLater }: { onConfirm: () => void; onLater?: () => void }) {
  const t = useT(ONBOARDING).protect;
  const STEPS: React.ReactNode[] = [
    <>
      {t.step1A}<span className="font-semibold">{t.step1B}</span>.
    </>,
    <>
      {t.step2A}<span className="font-semibold">Vercel Authentication</span>.
    </>,
    <>
      {t.step3A}<span className="font-semibold">All Deployments</span>{t.step3B}
      <code className="font-mono text-[12px]">*.vercel.app</code>.
    </>,
  ];
  return (
    <div className="space-y-3">
      <p className="text-body text-muted">{t.intro}</p>
      <ol className="space-y-2">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-inner bg-subtle p-3 text-[14px] leading-relaxed">
            <span className="t-label mt-0.5 shrink-0">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-faint">{t.cannotCheck}</p>
      <a href={DOCS.protect} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[13px] font-semibold text-brand-ink underline underline-offset-2">
        {t.guide}
      </a>
      <DeployStatus />
      <button type="button" onClick={onConfirm} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
        {t.done}
      </button>
      {onLater && (
        <button type="button" onClick={onLater} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.ghost} w-full`}>
          {t.later}
        </button>
      )}
    </div>
  );
}

/** Sandi aplikasi & database (0.12): dibaca dari /api/status yang hanya mengembalikan boolean. */
function DeployStatus() {
  const [status, setStatus] = useState<Availability | null>(null);
  const [failed, setFailed] = useState(false);
  const t = useT(ONBOARDING).protect;
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
      {on === undefined ? <span className="text-faint">·</span> : <Chip tone={on ? "success" : "neutral"}>{on ? t.set : t.notSet}</Chip>}
    </li>
  );

  return (
    <div className="rounded-inner border border-line p-3">
      <p className="t-label">{t.optional}</p>
      <ul className="mt-1 divide-y divide-line">
        {row(t.passcode, failed ? undefined : status?.passcode)}
        {row(t.database, failed ? undefined : status?.database)}
      </ul>
      {status && !status.sync && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {t.howA}<span className="font-semibold text-ink">Storage › Upstash Redis</span>{t.howB}<code className="font-mono text-[12px]">APP_PASSCODE</code>{t.howC}<code className="font-mono text-[12px]">SESSION_SECRET</code>{t.howD}{" "}
          <a href={DOCS.upstash} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brand-ink underline underline-offset-2">
            {t.upstash}
          </a>
        </p>
      )}
    </div>
  );
}
