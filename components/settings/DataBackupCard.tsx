"use client";

import { useRef, useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { downloadDeviceBackup, downloadJson, importBackupFile } from "@/lib/backup-store";
import { formatDateId, todayWib } from "@/lib/date";
import { parsePreMigration, PRE_MIGRATION_KEY, preMigrationBackup } from "@/lib/migrations/device";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { trainingLog, useTrainingLog } from "@/lib/training-log";
import { BackupHistory } from "./BackupHistory";
import { useLocale, useT } from "@/lib/i18n/client";
import { SETTINGS } from "@/lib/i18n/messages/settings";

/**
 * Cadangan semua data perangkat: log sesi, pengaturan & profil, program target, preferensi, dan
 * status onboarding (`lib/backup.ts`). File v1 sampai versi sekarang bisa diimpor; log selalu digabung.
 * Bila data perangkat pernah dimigrasi (1.0), salinan sebelum migrasi bisa diunduh sebagai file cadangan.
 */
/** `synced`: sinkron aktif di deploy ini (data juga ada di database milik pengguna). */
export function DataBackupCard({ synced = false }: { synced?: boolean }) {
  const entries = useTrainingLog();
  const [, setSettingsRaw] = useStoredString(PREF_KEYS.settings, "");
  const [preRaw] = useStoredString(PRE_MIGRATION_KEY, "");
  const pre = parsePreMigration(preRaw || null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const locale = useLocale();
  const t = useT(SETTINGS).backup;

  const exportFile = () => downloadDeviceBackup(`hybrid-athlete-backup-${todayWib()}.json`);

  const importFile = async (file: File) => {
    const r = await importBackupFile(file, locale);
    setStatus(r.message);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card title={t.title} tour="data-backup" action={<span className="text-[12px] text-faint">{t.where(synced)}</span>}>
      <p className="text-[13px] text-muted">
        {synced ? t.bodySynced : t.bodyLocal}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={exportFile} className={`${BUTTON.base} ${BUTTON.inverse}`}>
          {t.export}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={`${BUTTON.base} ${BUTTON.secondary}`}>
          {t.import}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
          }}
        />
      </div>
      {status && (
        <p role="status" className={`mt-2 text-[13px] font-semibold ${status.startsWith("✓") ? "text-success-ink" : "text-danger-ink"}`}>
          {status}
        </p>
      )}
      {pre && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-card bg-subtle px-3 py-2">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold">{t.preTitle}</p>
            <p className="text-[12px] text-faint">{formatDateId(todayWib(new Date(pre.at)), locale)} · {t.preAuto}</p>
          </div>
          <button
            type="button"
            onClick={() => downloadJson(preMigrationBackup(pre), `hybrid-athlete-sebelum-pembaruan-${pre.at.slice(0, 10)}.json`)}
            className="inline-flex min-h-11 items-center text-[13px] font-semibold text-brand-ink underline underline-offset-2"
          >
            {t.download}
          </button>
        </div>
      )}
      {synced && <BackupHistory />}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-[13px] text-muted">{t.logCount(entries.length)}</span>
        <div className="flex flex-wrap gap-1">
          <ConfirmButton label={t.reset} confirmLabel={t.resetConfirm} onConfirm={() => setSettingsRaw(null)} />
          {entries.length > 0 && <ConfirmButton label={t.clearLog} confirmLabel={t.clearConfirm} onConfirm={() => trainingLog.clear()} />}
        </div>
      </div>
    </Card>
  );
}
