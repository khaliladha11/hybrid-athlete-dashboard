"use client";

import { useCallback, useEffect, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { syncNow } from "@/lib/sync/client";
import type { SnapshotMeta } from "@/lib/sync/snapshots";
import { useLocale } from "@/lib/i18n/client";
import { formatInstant } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { SETTINGS } from "@/lib/i18n/messages/settings";

const formatWhen = (iso: string, l: Locale) =>
  formatInstant(l, iso, { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB";

function describe(m: SnapshotMeta, l: Locale): string {
  const t = SETTINGS[l].history;
  const parts = [t.entries(m.summary.logEntries)];
  if (m.summary.profile) parts.push(t.profile);
  if (m.summary.settings) parts.push(t.settings);
  if (m.summary.program) parts.push(t.program);
  return parts.join(" · ");
}

/** Riwayat cadangan otomatis (docs/SYNC.md §4): 7 snapshot terakhir di database milik pengguna. */
export function BackupHistory() {
  const [list, setList] = useState<SnapshotMeta[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean; undoId?: string } | null>(null);
  const locale = useLocale();
  const t = SETTINGS[locale].history;

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
      setMessage(isUndo ? { text: t.undone, ok: true } : { text: t.restored(label), ok: true, undoId: body.undoId });
      await load();
    } catch {
      setMessage({ text: t.failed, ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="t-label">{t.title}</p>
      {list === null ? (
        <p className="mt-2 text-[13px] text-faint">·</p>
      ) : list.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">{t.empty}</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {list.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{formatWhen(m.createdAt, locale)}</span>
                <span className="tabular block text-[12px] text-muted">
                  {t.kind[m.kind]} · {describe(m, locale)}
                </span>
              </span>
              <ConfirmButton size="md" label={t.restore} confirmLabel={t.tapAgain} disabled={busy} onConfirm={() => void restore(m.id, formatWhen(m.createdAt, locale))} />
            </li>
          ))}
        </ul>
      )}
      {message && (
        <div role="status" className="mt-2 flex flex-wrap items-center gap-2">
          <p className={`text-[13px] font-semibold ${message.ok ? "text-success-ink" : "text-danger-ink"}`}>{message.text}</p>
          {message.undoId && (
            <button type="button" disabled={busy} onClick={() => void restore(message.undoId!, "", true)} className={`${BUTTON.base} ${BUTTON.secondary}`}>
              {t.undo}
            </button>
          )}
        </div>
      )}
      <p className="mt-2 text-[12px] text-faint">{t.note}</p>
    </div>
  );
}
