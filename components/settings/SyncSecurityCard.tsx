"use client";

import { clearOfflineData } from "@/components/offline/useOnline";
import { useEffect, useState } from "react";
import { statusView } from "@/components/sync/syncStatus";
import { BUTTON, Card, Chip } from "@/components/ui/Card";
import { syncNow, useSyncStatus } from "@/lib/sync/client";
import type { Availability } from "@/lib/sync/server";
import { useLocale, useT } from "@/lib/i18n/client";
import { SETTINGS } from "@/lib/i18n/messages/settings";

/** Setting › Data: status sinkron, Sinkron sekarang, dan Kunci perangkat ini (docs/SYNC.md §7). */
export function SyncSecurityCard({ status }: { status: Availability }) {
  const meta = useSyncStatus();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();
  const t = useT(SETTINGS).sync;

  // Perbarui "x menit lalu" tiap menit.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const view = status.sync ? statusView(meta, now, locale) : statusView({ ...meta, state: "off" }, now, locale);

  const sync = async () => {
    setBusy(true);
    await syncNow();
    setNow(Date.now());
    setBusy(false);
  };

  const lock = async () => {
    setLocking(true);
    setError(null);
    try {
      const res = await fetch("/api/lock", { method: "POST", cache: "no-store" });
      if (!res.ok && res.status !== 401) throw new Error(String(res.status));
      // Salinan halaman offline (berisi data) ikut dihapus (0.16).
      await clearOfflineData();
      window.location.replace("/unlock");
    } catch {
      setError(t.lockFailed);
      setLocking(false);
    }
  };

  return (
    <Card title={t.title}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="t-label">{t.status}</span>
        <Chip tone={view.tone}>{view.label}</Chip>
      </div>
      {status.sync ? (
        <p className="text-[13px] text-muted">
          {meta.blocked === "schema-newer" ? t.newer : meta.state === "pending" ? t.pending : meta.state === "conflict" ? t.conflict : t.ok}
        </p>
      ) : (
        <div className="space-y-2 text-[13px] text-muted">
          <p>{t.off}</p>
          <ol className="list-decimal space-y-1 pl-5">
            {!status.database && (
              <li>
                {t.stepDbA}<span className="font-semibold text-ink">Storage › Upstash Redis</span>{t.stepDbB}
              </li>
            )}
            {!status.passcode && (
              <li>
                {t.stepEnvA}<code className="font-mono text-[12px]">APP_PASSCODE</code>{t.stepEnvB}<code className="font-mono text-[12px]">SESSION_SECRET</code>{t.stepEnvC}
              </li>
            )}
            <li>{t.stepRedeploy}</li>
          </ol>
        </div>
      )}
      <div className="mt-3 grid gap-2">
        {status.sync && (
          <button type="button" onClick={sync} disabled={busy} className={`${BUTTON.base} ${BUTTON.secondary} w-full`}>
            {busy ? t.syncing : t.syncNow}
          </button>
        )}
        {status.passcode && (
          <button type="button" onClick={lock} disabled={locking} className={`${BUTTON.base} ${BUTTON.ghost} w-full`}>
            {t.lock}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-danger-ink">
          {error}
        </p>
      )}
    </Card>
  );
}
