/**
 * Cadangan otomatis di server (murni, docs/SYNC.md §4 "Cadangan otomatis"): snapshot harian saat sinkron
 * pertama hari itu (WIB) dan snapshot "sebelum pulihkan". Simpan 7 terbaru dari semua jenis.
 * Ringkasan hanya berisi hitungan/ada-tidak, bukan data mentah.
 */
import type { LogEntry } from "@/lib/progression";
import { hasData, PART_NAMES, type PartName } from "./parts";

export const MAX_SNAPSHOTS = 7;

export type SnapshotKind = "daily" | "before-restore";

export interface SnapshotSummary {
  logEntries: number;
  profile: boolean;
  settings: boolean;
  program: boolean;
}

export interface SnapshotMeta {
  id: string;
  kind: SnapshotKind;
  /** ISO, UTC. */
  createdAt: string;
  summary: SnapshotSummary;
}

export type SnapshotParts = Record<PartName, { rev: number; data: unknown }>;

export const dailyId = (dateWib: string) => `daily-${dateWib}`;
export const beforeRestoreId = (iso: string) => `before-restore-${iso.replace(/\D/g, "").slice(0, 17)}`;
export const isSnapshotId = (x: unknown): x is string => typeof x === "string" && /^(daily-\d{4}-\d{2}-\d{2}|before-restore-\d{8,17})$/.test(x);

export function summarize(parts: SnapshotParts): SnapshotSummary {
  const log = Array.isArray(parts.log?.data) ? (parts.log.data as LogEntry[]) : [];
  return {
    logEntries: log.filter((e) => !e.deletedAt).length,
    profile: hasData("profile", parts.profile?.data),
    settings: hasData("settings", parts.settings?.data),
    program: hasData("program", parts.program?.data),
  };
}

/** Server sudah berisi data (snapshot harian tidak dibuat untuk database kosong). */
export const serverHasData = (parts: SnapshotParts) => PART_NAMES.some((p) => hasData(p, parts[p]?.data));

/** Id snapshot yang harus dihapus supaya tersisa `max` terbaru (berdasarkan createdAt, lalu id). */
export function pruneIds(metas: SnapshotMeta[], max = MAX_SNAPSHOTS): string[] {
  return [...metas]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .slice(max)
    .map((m) => m.id);
}

export const sortSnapshots = (metas: SnapshotMeta[]) => [...metas].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
