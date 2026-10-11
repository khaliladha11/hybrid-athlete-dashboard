"use client";

import { useRef, useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { parseSettings } from "@/lib/athlete-settings";
import { todayWib } from "@/lib/date";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useBlockEnabled, useStoredString, useThemePreference } from "@/lib/preferences";
import { baseProfile } from "@/lib/profile";
import { trainingLog, useTrainingLog } from "@/lib/training-log";

/**
 * Cadangan semua data perangkat: log sesi, pengaturan atlet, program target, dan preferensi.
 * Format v2 = objek; file lama (v1, array log saja) tetap bisa diimpor.
 */
export function DataBackupCard() {
  const entries = useTrainingLog();
  const [settingsRaw, setSettingsRaw] = useStoredString(PREF_KEYS.settings, "");
  const [programRaw, setProgramRaw] = useStoredString(PREF_KEYS.program, "");
  const [theme, setTheme] = useThemePreference();
  const [blockEnabled, setBlockEnabled] = useBlockEnabled();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const exportFile = () => {
    const data = {
      app: "hybrid-athlete",
      version: 2,
      exportedAt: new Date().toISOString(),
      log: JSON.parse(trainingLog.exportJson()),
      settings: settingsRaw ? parseSettings(settingsRaw, baseProfile) : null,
      program: programRaw || null,
      preferences: { theme, blockEnabled },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hybrid-athlete-backup-${todayWib()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text());
      const parts: string[] = [];
      if (Array.isArray(data)) {
        const r = trainingLog.merge(data);
        parts.push(`${r.added} entri log baru, ${r.skipped} dilewati`);
      } else if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (Array.isArray(d.log)) {
          const r = trainingLog.merge(d.log);
          parts.push(`${r.added} entri log baru, ${r.skipped} dilewati`);
        }
        if (d.settings && typeof d.settings === "object") {
          setSettingsRaw(JSON.stringify(parseSettings(d.settings, baseProfile)));
          parts.push("pengaturan atlet dipulihkan");
        }
        if (typeof d.program === "string") {
          setProgramRaw(d.program);
          parts.push("program target dipulihkan");
        }
        const prefs = d.preferences as Record<string, unknown> | undefined;
        if (prefs?.theme === "system" || prefs?.theme === "light" || prefs?.theme === "dark") setTheme(prefs.theme);
        if (typeof prefs?.blockEnabled === "boolean") setBlockEnabled(prefs.blockEnabled);
      }
      setStatus(parts.length ? `✓ Impor selesai: ${parts.join("; ")}.` : "✕ File tidak berisi data yang dikenali.");
    } catch {
      setStatus("✕ File tidak bisa dibaca. Pastikan itu file JSON hasil ekspor.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card title="Data & cadangan" action={<span className="text-[12px] text-faint">tersimpan di perangkat ini</span>}>
      <p className="text-[13px] text-muted">
        Log sesi, pengaturan, dan program hanya ada di HP/browser ini. Ekspor berkala supaya tidak hilang saat data aplikasi dihapus atau ganti HP.
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
