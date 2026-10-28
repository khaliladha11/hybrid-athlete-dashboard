"use client";

/**
 * Check-in harian di perangkat (localStorage `hybrid-athlete.checkins.v1`, 0.15.2). Pola sama dengan
 * `st-session-store.ts`: hapus = tombstone supaya ikut sinkron. "Lewati hari ini" = entri tanpa isian untuk tanggal
 * itu, jadi tidak ada pengingat berulang (juga di perangkat lain).
 */
import { useSyncExternalStore } from "react";
import { checkinOn, hasValues, isLiveCheckin, mergeCheckins, normalizeCheckins, tombstoneCheckin, type Checkin, type CheckinField } from "@/lib/checkin";
import { emitLocalChange } from "@/lib/local-change";
import { PREF_KEYS } from "@/lib/preference-keys";

const KEY = PREF_KEYS.checkins;
const EMPTY: Checkin[] = [];
const listeners = new Set<() => void>();
let cache: { all: Checkin[]; live: Checkin[] } | null = null;

const setCache = (all: Checkin[]) => (cache = { all, live: all.filter(isLiveCheckin) });

function readAll(): Checkin[] {
  if (cache) return cache.all;
  let raw: unknown = [];
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    raw = [];
  }
  setCache(normalizeCheckins(raw));
  return cache!.all;
}

function write(next: Checkin[]): boolean {
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

/** Check-in hidup (termasuk entri "dilewati" tanpa isian). */
export function useCheckins(): Checkin[] {
  return useSyncExternalStore(subscribe, () => (readAll(), cache!.live), () => EMPTY);
}

/** Check-in berisi untuk tanggal itu (entri "dilewati" tidak dihitung). */
export const filledCheckin = (list: Checkin[], date: string) => {
  const c = checkinOn(list, date);
  return c && hasValues(c) ? c : undefined;
};

export const checkinStore = {
  /** Simpan isian hari itu (menggantikan isian sebelumnya di tanggal yang sama). */
  save(date: string, values: Partial<Record<CheckinField, number>>): boolean {
    const entry = normalizeCheckins([{ date, ...values, updatedAt: new Date().toISOString() }])[0];
    return entry ? write(mergeCheckins(readAll(), [entry])) : false;
  },
  /** "Lewati hari ini": entri tanpa isian. */
  skip(date: string): boolean {
    return this.save(date, {});
  },
  remove(date: string): boolean {
    const now = new Date().toISOString();
    return write(readAll().map((c) => (c.date === date ? tombstoneCheckin(c, now) : c)));
  },
  /** Impor cadangan: gabung per tanggal. */
  merge(incoming: unknown): { added: number; skipped: number } {
    const list = Array.isArray(incoming) ? incoming : [];
    const entries = normalizeCheckins(list);
    const before = new Set(readAll().map((c) => c.date));
    const fresh = entries.filter((c) => !before.has(c.date) && isLiveCheckin(c));
    if (entries.length) write(mergeCheckins(readAll(), entries));
    return { added: fresh.length, skipped: list.length - fresh.length };
  },
  live(): Checkin[] {
    return readAll().filter(isLiveCheckin);
  },
  all(): Checkin[] {
    return readAll();
  },
  replaceAll(list: Checkin[]): boolean {
    return write(list);
  },
};
