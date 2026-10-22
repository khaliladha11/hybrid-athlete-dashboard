"use client";

/** `BackupStore` di atas localStorage perangkat (dipakai Setting › Data & cadangan dan onboarding langkah 1). */
import { parseSettings } from "./athlete-settings";
import { applyBackup, buildBackup, parseBackup, type BackupFile, type BackupStore } from "./backup";
import { parseOnboardingState } from "./onboarding";
import { PREF_KEYS } from "./preference-keys";
import { applyTheme, readStored, writeStored } from "./preferences";
import { baseProfile } from "./profile";
import { trainingLog } from "./training-log";

export const deviceBackupStore: BackupStore = {
  getSettingsRaw: () => readStored(PREF_KEYS.settings) ?? "",
  setSettingsRaw: (v) => writeStored(PREF_KEYS.settings, v),
  getProgramRaw: () => readStored(PREF_KEYS.program) ?? "",
  setProgramRaw: (v) => writeStored(PREF_KEYS.program, v),
  getThemeRaw: () => readStored(PREF_KEYS.theme) ?? "",
  setTheme: (t) => {
    writeStored(PREF_KEYS.theme, t === "system" ? null : t);
    applyTheme(t);
  },
  getBlockRaw: () => readStored(PREF_KEYS.blockEnabled) ?? "",
  setBlockEnabled: (v) => writeStored(PREF_KEYS.blockEnabled, v ? "1" : "0"),
  setOnboarding: (v) => writeStored(PREF_KEYS.onboarding, JSON.stringify(v)),
  mergeLog: (entries) => trainingLog.merge(entries),
};

/** Cadangan v3 dari isi perangkat sekarang. */
export function exportDeviceBackup(now = new Date().toISOString()): BackupFile {
  const settingsRaw = readStored(PREF_KEYS.settings);
  const theme = readStored(PREF_KEYS.theme);
  const block = readStored(PREF_KEYS.blockEnabled);
  return buildBackup({
    log: JSON.parse(trainingLog.exportJson()),
    settings: settingsRaw ? parseSettings(settingsRaw, baseProfile) : null,
    program: readStored(PREF_KEYS.program),
    theme: theme === "light" || theme === "dark" ? theme : "system",
    blockEnabled: block === "1" ? true : block === "0" ? false : undefined,
    onboarding: parseOnboardingState(readStored(PREF_KEYS.onboarding) ?? ""),
    now,
  });
}

/** Baca file JSON pilihan pengguna lalu terapkan ke perangkat. Pesan mengikuti gaya UI (✓/✕). */
export async function importBackupFile(file: File): Promise<{ ok: boolean; message: string; kind?: "backup" | "defaults" }> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, message: "✕ File tidak bisa dibaca. Pastikan itu file JSON hasil ekspor." };
  }
  const parsed = parseBackup(data);
  if (!parsed) return { ok: false, message: "✕ File tidak berisi data yang dikenali." };
  const parts = applyBackup(parsed, deviceBackupStore, baseProfile);
  return { ok: true, kind: parsed.kind, message: parts.length ? `✓ Impor selesai: ${parts.join("; ")}.` : "✓ Impor selesai." };
}

/** Unduh cadangan v3 sebagai file JSON. */
export function downloadDeviceBackup(fileName: string) {
  const blob = new Blob([JSON.stringify(exportDeviceBackup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
