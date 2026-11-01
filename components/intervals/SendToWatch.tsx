"use client";

import { useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { DEVICE_HELP, DEVICE_NOTE, HUAWEI_LIMITS, REMOVE_LABEL, RESEND_LABEL, SEND_LABEL, changedText, sentText } from "@/lib/intervals/send-status";
import { sendToCalendar, useSendQueue, useSent, type SendOutcome } from "@/lib/intervals/send-store";
import { eventHash, type ExportResult } from "@/lib/intervals/workout-export";

/**
 * "Kirim ke jam" (0.17, docs/RELEASE-1.0.md #6): kirim workout ke kalender intervals.icu atas ketukan pengguna,
 * lalu intervals.icu meneruskannya ke jam yang terhubung. Kirim ulang memperbarui event yang sama (id luar tetap).
 * Copy Set tetap ada sebagai cadangan.
 */
export function SendToWatch({
  externalId,
  date,
  onDateChange,
  result,
  sendLabel = SEND_LABEL,
  deviceNote = true,
  title = "Kirim ke jam",
}: {
  /** Id luar event untuk tanggal ini (`externalId.*`). */
  externalId: string;
  date: string;
  onDateChange?: (date: string) => void;
  /** Hasil mapper (`exportRun`, `exportProgramCard`, `exportStNote`). */
  result: ExportResult;
  sendLabel?: string;
  deviceNote?: boolean;
  title?: string;
}) {
  const sent = useSent()[externalId];
  const queued = useSendQueue()[externalId];
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<SendOutcome | null>(null);

  if (!result.ok) {
    return (
      <section aria-label={title} className="rounded-card border border-line bg-surface p-3">
        <p className="t-label">{title}</p>
        <p className="mt-1 text-[13px] text-muted">{result.reason}</p>
      </section>
    );
  }

  const hash = eventHash(result.event, date);
  const changed = !!sent && sent.hash !== hash;
  const run = async (action: "upsert" | "delete") => {
    setBusy(true);
    try {
      setLast(
        await sendToCalendar(
          action === "upsert" ? { action, externalId, date, event: result.event } : { action, externalId, date: sent?.date ?? date },
          action === "upsert" ? hash : undefined,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  // Status: hasil ketukan terakhir, lalu antrean, lalu catatan "sudah dikirim" di perangkat ini.
  const status = queued
    ? last?.kind === "queued"
      ? last.text
      : "Menunggu online untuk dikirim."
    : last && last.kind !== "queued"
      ? last.text
      : sent
        ? sentText(sent.date)
        : null;
  const tone = last?.kind === "error" ? "text-danger-ink" : "text-ink";

  return (
    <section aria-label={title} className="space-y-2 rounded-card border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="t-label">{title}</p>
        {onDateChange ? (
          <label className="flex items-center gap-2 text-[13px] text-muted">
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="tabular min-h-11 rounded-control border border-line-strong bg-surface px-2 text-base text-ink"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(!sent || changed) && (
          <button type="button" disabled={busy} onClick={() => void run("upsert")} className={`${BUTTON.base} ${BUTTON.secondary} flex-1`}>
            {busy ? "Mengirim" : sent ? RESEND_LABEL : sendLabel}
          </button>
        )}
        {sent && <ConfirmButton size="md" label={REMOVE_LABEL} confirmLabel="Tap lagi untuk menghapus" disabled={busy} onConfirm={() => void run("delete")} />}
      </div>

      <p role="status" aria-live="polite" className={`text-[13px] ${tone}`}>
        {status}
        {changed && !queued && last?.kind !== "error" ? <span className="block text-muted">{changedText}</span> : null}
        {last?.warning ? <span className="mt-1 block font-semibold text-warning-ink">{last.warning}</span> : null}
      </p>

      {deviceNote && (
        <details className="text-[13px] text-muted">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2">
            <span className="flex-1">{DEVICE_NOTE}</span>
            <span className="shrink-0 font-semibold text-ink underline">Apa ini?</span>
          </summary>
          <dl className="mt-2 space-y-2">
            {DEVICE_HELP.map((d) => (
              <div key={d.brand}>
                <dt className="font-semibold text-ink">{d.brand}</dt>
                <dd>{d.receives}</dd>
                <dd>{d.setting}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 font-semibold text-ink">Batas Huawei</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {HUAWEI_LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
