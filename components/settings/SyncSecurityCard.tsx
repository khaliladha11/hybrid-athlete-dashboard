"use client";

import { clearOfflineData } from "@/components/offline/useOnline";
import { useEffect, useState } from "react";
import { statusView } from "@/components/sync/syncStatus";
import { BUTTON, Card, Chip } from "@/components/ui/Card";
import { syncNow, useSyncStatus } from "@/lib/sync/client";
import type { Availability } from "@/lib/sync/server";

/** Setting › Data: status sinkron, Sinkron sekarang, dan Kunci perangkat ini (docs/SYNC.md §7). */
export function SyncSecurityCard({ status }: { status: Availability }) {
  const meta = useSyncStatus();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perbarui "x menit lalu" tiap menit.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const view = status.sync ? statusView(meta, now) : statusView({ ...meta, state: "off" }, now);

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
      setError("Gagal mengunci. Periksa koneksi lalu coba lagi.");
      setLocking(false);
    }
  };

  return (
    <Card title="Sinkron & keamanan">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="t-label">Status</span>
        <Chip tone={view.tone}>{view.label}</Chip>
      </div>
      {status.sync ? (
        <p className="text-[13px] text-muted">
          {meta.state === "pending"
            ? "Perubahan tersimpan di perangkat ini dan dikirim saat koneksi kembali."
            : meta.state === "conflict"
              ? "Data diubah di perangkat lain pada saat yang sama. Ketuk Sinkron sekarang untuk mencoba lagi."
              : "Log, Setting, program, dan profil tersimpan di database milikmu dan sama di semua perangkat."}
        </p>
      ) : (
        <div className="space-y-2 text-[13px] text-muted">
          <p>Sinkron belum aktif. Data hanya ada di perangkat ini.</p>
          <ol className="list-decimal space-y-1 pl-5">
            {!status.database && (
              <li>
                Di Vercel: <span className="font-semibold text-ink">Storage › Upstash Redis</span>, lalu hubungkan ke project ini.
              </li>
            )}
            {!status.passcode && (
              <li>
                Isi <code className="font-mono text-[12px]">APP_PASSCODE</code> dan <code className="font-mono text-[12px]">SESSION_SECRET</code> di Environment Variables.
              </li>
            )}
            <li>Redeploy, lalu buka lagi aplikasinya.</li>
          </ol>
        </div>
      )}
      <div className="mt-3 grid gap-2">
        {status.sync && (
          <button type="button" onClick={sync} disabled={busy} className={`${BUTTON.base} ${BUTTON.secondary} w-full`}>
            {busy ? "Menyinkronkan" : "Sinkron sekarang"}
          </button>
        )}
        {status.passcode && (
          <button type="button" onClick={lock} disabled={locking} className={`${BUTTON.base} ${BUTTON.ghost} w-full`}>
            Kunci perangkat ini
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
