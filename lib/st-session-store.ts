"use client";

/**
 * Sesi ST mode latihan di perangkat (localStorage `hybrid-athlete.st-sessions.v1`, 0.14.1). Pola sama dengan
 * `pr-store.ts`: hapus = tombstone supaya ikut sinkron; tampilan dan perhitungan hanya melihat sesi hidup.
 */
import { useSyncExternalStore } from "react";
import { emitLocalChange } from "@/lib/local-change";
import { PREF_KEYS } from "@/lib/preference-keys";
import { isLiveSession, mergeSessions, normalizeSessions, tombstoneSession, type StSession } from "@/lib/st-session";

const KEY = PREF_KEYS.sessions;
const EMPTY: StSession[] = [];
const listeners = new Set<() => void>();
let cache: { all: StSession[]; live: StSession[] } | null = null;

const setCache = (all: StSession[]) => (cache = { all, live: all.filter(isLiveSession) });

function readAll(): StSession[] {
  if (cache) return cache.all;
  let raw: unknown = [];
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    raw = [];
  }
  setCache(normalizeSessions(raw));
  return cache!.all;
}

function write(next: StSession[]): boolean {
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

/** Sesi hidup saja. */
export function useStSessions(): StSession[] {
  return useSyncExternalStore(subscribe, () => (readAll(), cache!.live), () => EMPTY);
}

export const stSessionStore = {
  /** Tambah sesi baru (atau ubah bila id sama). */
  add(s: Omit<StSession, "updatedAt">): boolean {
    const entry = normalizeSessions([{ ...s, updatedAt: new Date().toISOString() }])[0];
    return entry ? write(mergeSessions(readAll(), [entry])) : false;
  },
  remove(id: string): boolean {
    const now = new Date().toISOString();
    return write(readAll().map((s) => (s.id === id ? tombstoneSession(s, now) : s)));
  },
  /** Impor cadangan: gabung per id. */
  merge(incoming: unknown): { added: number; skipped: number } {
    const list = Array.isArray(incoming) ? incoming : [];
    const entries = normalizeSessions(list);
    const before = new Set(readAll().map((s) => s.id));
    const fresh = entries.filter((s) => !before.has(s.id) && isLiveSession(s));
    if (entries.length) write(mergeSessions(readAll(), entries));
    return { added: fresh.length, skipped: list.length - fresh.length };
  },
  live(): StSession[] {
    return readAll().filter(isLiveSession);
  },
  all(): StSession[] {
    return readAll();
  },
  replaceAll(list: StSession[]): boolean {
    return write(list);
  },
};
