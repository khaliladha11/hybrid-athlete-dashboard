"use client";

/**
 * Riwayat sesi di perangkat (localStorage). Sejak 0.12.1 setiap entri punya `id` & `updatedAt`, dan hapus
 * menjadi tombstone (`deletedAt`) supaya bisa disinkron (`lib/log-entries.ts`). Tombstone tidak pernah
 * tampil, tidak dihitung progresi, dan tidak ikut ekspor; hanya `all()` (sinkron) yang melihatnya.
 */
import { useSyncExternalStore } from "react";
import { emitLocalChange } from "@/lib/local-change";
import { isLive, mergeLogs, normalizeLog, tombstone } from "@/lib/log-entries";
import type { LogEntry } from "@/lib/progression";
import { PREF_KEYS } from "@/lib/preference-keys";

const KEY = PREF_KEYS.log;
const EMPTY: LogEntry[] = [];
const listeners = new Set<() => void>();
/** Semua entri termasuk tombstone, dan turunan entri hidup (referensi stabil untuk React). */
let cache: { all: LogEntry[]; live: LogEntry[] } | null = null;

const setCache = (all: LogEntry[]) => (cache = { all, live: all.filter(isLive) });

function persist(all: LogEntry[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

function readAll(): LogEntry[] {
  if (cache) return cache.all;
  let raw: unknown = [];
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    raw = [];
  }
  // Migrasi sekali: id untuk entri lama, updatedAt, dan urutan stabil.
  const { entries, changed } = normalizeLog(raw);
  setCache(entries);
  if (changed && Array.isArray(raw) && raw.length) persist(entries);
  return entries;
}

const readLive = (): LogEntry[] => (readAll(), cache!.live);

/** Mengembalikan false bila penyimpanan gagal (mode privat, kuota penuh). */
function write(next: LogEntry[]): boolean {
  setCache(next);
  const ok = persist(next);
  listeners.forEach((l) => l());
  emitLocalChange(KEY);
  return ok;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Sinkron antar tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Entri hidup saja. */
export function useTrainingLog(): LogEntry[] {
  return useSyncExternalStore(subscribe, readLive, () => EMPTY);
}

export function newEntryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const nowIso = () => new Date().toISOString();

export const trainingLog = {
  add(entries: LogEntry[]): boolean {
    // Minta browser tidak menghapus data ini otomatis (penting di iOS/PWA).
    void navigator.storage?.persist?.().catch(() => {});
    const now = nowIso();
    return write(mergeLogs(readAll(), entries.map((e) => ({ ...e, updatedAt: now }))));
  },
  /** Hapus = tombstone, supaya hapus ikut ke perangkat lain saat sinkron. */
  remove(id: string): boolean {
    const now = nowIso();
    return write(readAll().map((e) => (e.id === id ? tombstone(e, now) : e)));
  },
  clear(): boolean {
    const now = nowIso();
    return write(readAll().map((e) => tombstone(e, now)));
  },
  /** Gabungkan hasil impor per id. Entri yang sudah dihapus di perangkat ini tidak hidup lagi. */
  merge(incoming: unknown): { added: number; skipped: number; ok: boolean } {
    const list = Array.isArray(incoming) ? incoming : [];
    const { entries } = normalizeLog(list);
    const before = new Set(readAll().map((e) => e.id));
    const fresh = entries.filter((e) => !before.has(e.id) && isLive(e));
    const ok = entries.length ? write(mergeLogs(readAll(), entries)) : true;
    return { added: fresh.length, skipped: list.length - fresh.length, ok };
  },
  /** Ekspor: entri hidup saja, supaya file tetap terbaca versi lama. */
  exportJson(): string {
    return JSON.stringify(readLive(), null, 2);
  },
  /** Untuk sinkron: semua entri termasuk tombstone. */
  all(): LogEntry[] {
    return readAll();
  },
  /** Untuk sinkron: ganti seluruh isi dengan hasil gabungan. */
  replaceAll(entries: LogEntry[]): boolean {
    return write(entries);
  },
};
