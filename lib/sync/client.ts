"use client";

/**
 * Klien sinkron di browser: pemicu (buka, kembali terlihat, online, perubahan lokal dengan jeda 2 detik,
 * tombol manual), meta di localStorage, dan status untuk UI. Logika ada di `engine.ts` (murni).
 */
import { useSyncExternalStore } from "react";
import { onLocalChange, withoutLocalChange } from "@/lib/local-change";
import { PREF_KEYS } from "@/lib/preference-keys";
import { applyTheme, readStored, writeStored } from "@/lib/preferences";
import { baseProfile } from "@/lib/profile";
import { prStore } from "@/lib/pr-store";
import { stSessionStore } from "@/lib/st-session-store";
import { checkinStore } from "@/lib/checkin-store";
import { trainingLog } from "@/lib/training-log";
import { emptyMeta, markDirty, syncOnce, type GetResponse, type PostResult, type SyncIO, type SyncMeta } from "./engine";
import { localFromParts, partsFromLocal, type PartData } from "./parts";

export const SYNC_META_KEY = "hybrid-athlete.sync.v1";
export const DEBOUNCE_MS = 2000;

/** Key localStorage yang termasuk data sinkron. */
const SYNCED_KEYS = new Set<string>([PREF_KEYS.settings, PREF_KEYS.program, PREF_KEYS.theme, PREF_KEYS.blockEnabled, PREF_KEYS.onboarding, PREF_KEYS.log, PREF_KEYS.prs, PREF_KEYS.sessions, PREF_KEYS.checkins]);

// ---------- Meta & status (localStorage langsung, tanpa memicu perubahan lokal) ----------

let metaCache: SyncMeta | null = null;
const statusListeners = new Set<() => void>();

function getMeta(): SyncMeta {
  if (metaCache) return metaCache;
  try {
    const raw = JSON.parse(localStorage.getItem(SYNC_META_KEY) ?? "null") as SyncMeta | null;
    metaCache = raw && typeof raw === "object" && raw.parts ? raw : emptyMeta();
  } catch {
    metaCache = emptyMeta();
  }
  return metaCache;
}

function setMeta(m: SyncMeta) {
  metaCache = m;
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(m));
  } catch {
    // Penyimpanan penuh/diblokir: meta hanya di memori sesi ini.
  }
  statusListeners.forEach((l) => l());
}

// ---------- Data perangkat ----------

function readLocal(): PartData {
  return partsFromLocal(
    {
      settings: readStored(PREF_KEYS.settings),
      program: readStored(PREF_KEYS.program),
      theme: readStored(PREF_KEYS.theme),
      blockEnabled: readStored(PREF_KEYS.blockEnabled),
      onboarding: readStored(PREF_KEYS.onboarding),
    },
    trainingLog.all(),
    baseProfile,
    prStore.all(),
    stSessionStore.all(),
    checkinStore.all(),
  );
}

let known: PartData | null = null;

function applyLocal(changes: Partial<PartData>) {
  const next = { ...readLocal(), ...changes };
  const raw = localFromParts(next, baseProfile);
  withoutLocalChange(() => {
    if ("profile" in changes || "settings" in changes) writeStored(PREF_KEYS.settings, raw.settings);
    if ("program" in changes) writeStored(PREF_KEYS.program, raw.program);
    if ("onboarding" in changes) writeStored(PREF_KEYS.onboarding, raw.onboarding);
    if ("preferences" in changes) {
      writeStored(PREF_KEYS.theme, raw.theme);
      writeStored(PREF_KEYS.blockEnabled, raw.blockEnabled);
      applyTheme(next.preferences.theme ?? "system");
    }
    if (changes.log) trainingLog.replaceAll(changes.log);
    if (changes.prs) prStore.replaceAll(changes.prs);
    if (changes.sessions) stSessionStore.replaceAll(changes.sessions);
    if (changes.checkins) checkinStore.replaceAll(changes.checkins);
  });
  known = readLocal();
}

// ---------- Jaringan ----------

async function getParts(): Promise<GetResponse> {
  const res = await fetch("/api/sync", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as GetResponse;
}

async function postParts(writes: Parameters<SyncIO["post"]>[0]): Promise<PostResult[]> {
  const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ writes }), cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const body = (await res.json()) as { results?: PostResult[] };
  if (!Array.isArray(body.results)) throw new Error("invalid");
  return body.results;
}

const io: SyncIO = { get: getParts, post: postParts, readLocal, applyLocal, getMeta, setMeta, now: () => new Date().toISOString() };

// ---------- Penjadwalan ----------

let running: Promise<SyncMeta> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Jalankan sinkron sekarang; bila sedang berjalan, satu putaran lagi dijadwalkan sesudahnya. */
export function syncNow(): Promise<SyncMeta> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (running) {
    again = true;
    return running;
  }
  running = syncOnce(io).finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return running;
}

function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, DEBOUNCE_MS);
}

function handleLocalChange(key: string) {
  if (!SYNCED_KEYS.has(key)) return;
  const next = readLocal();
  setMeta(markDirty(getMeta(), known ?? next, next, io.now()));
  known = next;
  scheduleSync();
}

let stopFn: (() => void) | null = null;

/** Pasang pemicu sinkron (sekali per halaman). */
export function startSync(): () => void {
  if (stopFn) return stopFn;
  known = readLocal();
  if (getMeta().state === "off") setMeta({ ...getMeta(), state: "ok" });
  const offChange = onLocalChange(handleLocalChange);
  const onVisible = () => {
    if (document.visibilityState === "visible") void syncNow();
  };
  const onOnline = () => void syncNow();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  void syncNow();
  stopFn = () => {
    offChange();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    if (timer) clearTimeout(timer);
    stopFn = null;
  };
  return stopFn;
}

/** Sinkron tidak aktif di deploy ini (tanpa sandi atau database). */
export function markSyncOff() {
  if (getMeta().state !== "off") setMeta({ ...getMeta(), state: "off" });
}

const EMPTY_STATUS: SyncMeta = { parts: {}, state: "off" };

export function useSyncStatus(): SyncMeta {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      const onStorage = (e: StorageEvent) => {
        if (e.key === SYNC_META_KEY) {
          metaCache = null;
          l();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        statusListeners.delete(l);
        window.removeEventListener("storage", onStorage);
      };
    },
    getMeta,
    () => EMPTY_STATUS,
  );
}
