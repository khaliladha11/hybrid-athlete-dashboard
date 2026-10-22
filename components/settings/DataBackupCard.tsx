"use client";

import { useRef, useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { downloadDeviceBackup, importBackupFile } from "@/lib/backup-store";
import { todayWib } from "@/lib/date";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { trainingLog, useTrainingLog } from "@/lib/training-log";

/**
 * Cadangan semua data perangkat: log sesi, pengaturan & profil, program target, preferensi, dan
 * status onboarding (format v3, `lib/backup.ts`). File v1 dan v2 tetap bisa diimpor; log selalu digabung.
 */
export function DataBackupCard() {
  const entries = useTrainingLog();
  const [, setSettingsRaw] = useStoredString(PREF_KEYS.settings, "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const exportFile = () => downloadDeviceBackup(`hybrid-athlete-backup-${todayWib()}.json`);

  const importFile = async (file: File) => {
    const r = await importBackupFile(file);
    setStatus(r.message);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card title="Data & cadangan" tour="data-backup" action={<span className="text-[12px] text-faint">tersimpan di perangkat ini</span>}>
      <p className="text-[13px] text-muted">
        Log sesi, profil, pengaturan, dan program hanya ada di HP/browser ini. Ekspor berkala supaya tidak hilang saat data aplikasi dihapus atau ganti HP.
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
