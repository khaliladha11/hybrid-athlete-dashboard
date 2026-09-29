"use client";

/**
 * Riwayat sesi disimpan di perangkat (localStorage), tidak dikirim ke server.
 * Kelemahan: hanya di satu perangkat & hilang bila data aplikasi dihapus —
 * karena itu tersedia ekspor/impor JSON di halaman Log.
 */
import { useSyncExternalStore } from "react";
import { isLogEntry, type LogEntry } from "@/lib/progression";

const KEY = "hybrid-athlete.log.v1";
const EMPTY: LogEntry[] = [];
const listeners = new Set<() => void>();
let cache: LogEntry[] | null = null;

function read(): LogEntry[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter(isLogEntry) : [];
  } catch {
    cache = [];
  }
  return cache;
}

/** Mengembalikan false bila penyimpanan gagal (mode privat, kuota penuh). */
function write(next: LogEntry[]): boolean {
  cache = next;
  let ok = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    ok = false;
  }
  listeners.forEach((l) => l());
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

export function useTrainingLog(): LogEntry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function newEntryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const trainingLog = {
  add(entries: LogEntry[]): boolean {
    // Minta browser tidak menghapus data ini otomatis (penting di iOS/PWA).
    void navigator.storage?.persist?.().catch(() => {});
    return write([...read(), ...entries]);
  },
  remove(id: string): boolean {
    return write(read().filter((e) => e.id !== id));
  },
  clear(): boolean {
    return write([]);
  },
  /** Gabungkan hasil impor; entri dengan id yang sama tidak diduplikasi. */
  merge(incoming: unknown): { added: number; skipped: number; ok: boolean } {
    const list = Array.isArray(incoming) ? incoming : [];
    const valid = list.filter(isLogEntry);
    const have = new Set(read().map((e) => e.id));
    const fresh = valid.filter((e) => !have.has(e.id));
    const ok = fresh.length ? write([...read(), ...fresh]) : true;
    return { added: fresh.length, skipped: list.length - fresh.length, ok };
  },
  exportJson(): string {
    return JSON.stringify(read(), null, 2);
  },
};
