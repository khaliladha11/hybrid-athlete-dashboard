"use client";

/**
 * PR kemampuan di perangkat (localStorage `hybrid-athlete.prs.v1`, 0.14.0). Pola sama dengan `training-log.ts`:
 * hapus = tombstone supaya ikut sinkron; tampilan dan progresi hanya melihat entri hidup.
 */
import { useSyncExternalStore } from "react";
import { emitLocalChange } from "@/lib/local-change";
import { PREF_KEYS } from "@/lib/preference-keys";
import { allMovementNames, baseProfile } from "@/lib/profile";
import { detectPrs, isLivePr, mergePrs, normalizePrs, tombstonePr, type PrEntry } from "@/lib/prs";
import type { LogEntry } from "@/lib/progression";
import { newEntryId } from "@/lib/training-log";

const KEY = PREF_KEYS.prs;
const EMPTY: PrEntry[] = [];
const listeners = new Set<() => void>();
let cache: { all: PrEntry[]; live: PrEntry[] } | null = null;

/** PR hanya untuk gerakan dari library. */
export const prLibrary = (): ReadonlySet<string> => allMovementNames(baseProfile.movementLibrary);

const setCache = (all: PrEntry[]) => (cache = { all, live: all.filter(isLivePr) });

function readAll(): PrEntry[] {
  if (cache) return cache.all;
  let raw: unknown = [];
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    raw = [];
  }
  setCache(normalizePrs(raw, prLibrary()));
  return cache!.all;
}

function write(next: PrEntry[]): boolean {
  setCache(next);
  let ok = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    ok = false;
  }
  listeners.forEach((l) => l());
  emitLocalChange(KEY);
  return ok;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
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

/** PR hidup saja. */
export function usePrs(): PrEntry[] {
  return useSyncExternalStore(subscribe, () => (readAll(), cache!.live), () => EMPTY);
}

const nowIso = () => new Date().toISOString();

export const prStore = {
  /** Tambah atau ubah (id sama = ubah). */
  upsert(e: Omit<PrEntry, "id" | "updatedAt"> & { id?: string }): boolean {
    const entry = normalizePrs([{ ...e, id: e.id ?? newEntryId(), updatedAt: nowIso() }], prLibrary())[0];
    return entry ? write(mergePrs(readAll(), [entry])) : false;
  },
  remove(id: string): boolean {
    const now = nowIso();
    return write(readAll().map((e) => (e.id === id ? tombstonePr(e, now) : e)));
  },
  /** PR baru dari log (dipanggil setelah sesi dicatat). Mengembalikan jumlah PR baru. */
  detectFromLog(log: LogEntry[]): number {
    const fresh = detectPrs(log, readAll(), nowIso(), prLibrary());
    if (fresh.length) write(mergePrs(readAll(), fresh));
    return fresh.length;
  },
  /** Impor cadangan: gabung per id. Entri yang sudah dihapus di perangkat ini tidak hidup lagi. */
  merge(incoming: unknown): { added: number; skipped: number } {
    const list = Array.isArray(incoming) ? incoming : [];
    const entries = normalizePrs(list, prLibrary());
    const before = new Set(readAll().map((e) => e.id));
    const fresh = entries.filter((e) => !before.has(e.id) && isLivePr(e));
    if (entries.length) write(mergePrs(readAll(), entries));
    return { added: fresh.length, skipped: list.length - fresh.length };
  },
  /** Ekspor: hidup saja. */
  live(): PrEntry[] {
    return readAll().filter(isLivePr);
  },
  /** Sinkron: semua termasuk tombstone. */
  all(): PrEntry[] {
    return readAll();
  },
  replaceAll(entries: PrEntry[]): boolean {
    return write(entries);
  },
};
