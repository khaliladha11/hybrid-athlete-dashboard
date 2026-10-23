"use client";

import { useCallback, useEffect, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { syncNow } from "@/lib/sync/client";
import type { SnapshotMeta } from "@/lib/sync/snapshots";

const KIND_LABEL: Record<SnapshotMeta["kind"], string> = { daily: "Harian", "before-restore": "Sebelum pulihkan" };

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " WIB";

function describe(m: SnapshotMeta): string {
  const parts = [`${m.summary.logEntries} entri log`];
  if (m.summary.profile) parts.push("profil");
  if (m.summary.settings) parts.push("setting");
  if (m.summary.program) parts.push("program");
  return parts.join(" · ");
}

/** Riwayat cadangan otomatis (docs/SYNC.md §4): 7 snapshot terakhir di database milik pengguna. */
export function BackupHistory() {
  const [list, setList] = useState<SnapshotMeta[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean; undoId?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/snapshots", { cache: "no-store" });
      const body = (await res.json()) as { snapshots?: SnapshotMeta[] };
      setList(res.ok && Array.isArray(body.snapshots) ? body.snapshots : []);
    } catch {
      setList([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (id: string, label: string, isUndo = false) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), cache: "no-store" });
      const body = (await res.json()) as { undoId?: string };
      if (!res.ok || !body.undoId) throw new Error(String(res.status));
      await syncNow();
      setMessage(isUndo ? { text: "✓ Pulihkan dibatalkan.", ok: true } : { text: `✓ Dipulihkan dari ${label}.`, ok: true, undoId: body.undoId });
      await load();
    } catch {
      setMessage({ text: "✕ Gagal memulihkan. Periksa koneksi lalu coba lagi.", ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="t-label">Riwayat cadangan</p>
      {list === null ? (
        <p className="mt-2 text-[13px] text-faint">·</p>
      ) : list.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">Snapshot pertama dibuat saat sinkron pertama besok.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {list.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{formatWhen(m.createdAt)}</span>
                <span className="tabular block text-[12px] text-muted">
                  {KIND_LABEL[m.kind]} · {describe(m)}
                </span>
              </span>
              <ConfirmButton size="md" label="Pulihkan" confirmLabel="Tap lagi" disabled={busy} onConfirm={() => void restore(m.id, formatWhen(m.createdAt))} />
            </li>
          ))}
        </ul>
      )}
      {message && (
        <div role="status" className="mt-2 flex flex-wrap items-center gap-2">
          <p className={`text-[13px] font-semibold ${message.ok ? "text-success-ink" : "text-danger-ink"}`}>{message.text}</p>
          {message.undoId && (
            <button type="button" disabled={busy} onClick={() => void restore(message.undoId!, "", true)} className={`${BUTTON.base} ${BUTTON.secondary}`}>
              Batalkan pulihkan
            </button>
          )}
        </div>
      )}
      <p className="mt-2 text-[12px] text-faint">Pulihkan mengganti data di semua perangkat. Keadaan sekarang disimpan dulu, jadi bisa dibatalkan.</p>
    </div>
  );
}
