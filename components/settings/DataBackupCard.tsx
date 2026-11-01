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

  const exportFile = () => downloadDeviceBackup(`hybrid-athlete-backup-${todayWib()}.json`);

  const importFile = async (file: File) => {
    const r = await importBackupFile(file);
    setStatus(r.message);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card title="Data & cadangan" tour="data-backup" action={<span className="text-[12px] text-faint">{synced ? "perangkat & database" : "tersimpan di perangkat ini"}</span>}>
      <p className="text-[13px] text-muted">
        {synced
          ? "Log sesi, profil, pengaturan, dan program disinkronkan ke database milikmu. Ekspor JSON tetap berguna sebagai cadangan terpisah."
          : "Log sesi, profil, pengaturan, dan program hanya ada di HP/browser ini. Ekspor berkala supaya tidak hilang saat data aplikasi dihapus atau ganti HP."}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={exportFile} className={`${BUTTON.base} ${BUTTON.inverse}`}>
          Ekspor JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={`${BUTTON.base} ${BUTTON.secondary}`}>
          Impor JSON
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
            <p className="text-[13px] font-semibold">Cadangan sebelum pembaruan data</p>
            <p className="text-[12px] text-faint">{formatDateId(todayWib(new Date(pre.at)))} · dibuat otomatis</p>
          </div>
          <button
            type="button"
            onClick={() => downloadJson(preMigrationBackup(pre), `hybrid-athlete-sebelum-pembaruan-${pre.at.slice(0, 10)}.json`)}
            className="inline-flex min-h-11 items-center text-[13px] font-semibold text-brand-ink underline underline-offset-2"
          >
            Unduh
          </button>
        </div>
      )}
      {synced && <BackupHistory />}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-[13px] text-muted">{entries.length} entri log tersimpan</span>
        <div className="flex flex-wrap gap-1">
          <ConfirmButton label="Reset pengaturan" confirmLabel="Tap lagi untuk reset" onConfirm={() => setSettingsRaw(null)} />
          {entries.length > 0 && <ConfirmButton label="Hapus semua log" confirmLabel="Tap lagi untuk hapus" onConfirm={() => trainingLog.clear()} />}
        </div>
      </div>
    </Card>
  );
}
