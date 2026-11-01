"use client";

/**
 * Kirim ke kalender intervals.icu dari browser (0.17): memanggil `/api/intervals/workout`, mencatat apa yang sudah
 * dikirim dari perangkat ini, dan mengantrekan kiriman saat offline (0.16) untuk dikirim saat online lagi.
 * Keduanya hanya di perangkat ini (tidak disinkron): sumber kebenaran tetap kalender intervals.icu, dan rute selalu
 * mencari event per id luar sebelum menulis.
 */
import { useSyncExternalStore } from "react";
import { PREF_KEYS } from "@/lib/preference-keys";
import type { SendRequest, SendResponse } from "./calendar";
import { applySent, checkText, demoText, warningTexts, dequeue, enqueue, normalizeQueue, normalizeSent, queueOrder, queuedText, removedText, retryable, sendErrorText, sentText, type SendQueue, type SentMap } from "./send-status";

const ENDPOINT = "/api/intervals/workout";

function jsonStore<T>(key: string, normalize: (raw: unknown) => T, empty: T) {
  const listeners = new Set<() => void>();
  let cache: T | null = null;
  const read = (): T => {
    if (cache) return cache;
    try {
      cache = normalize(JSON.parse(localStorage.getItem(key) ?? "null"));
    } catch {
      cache = empty;
    }
    return cache;
  };
  const write = (next: T) => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* penyimpanan penuh/diblokir: tetap di memori */
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = null;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };
  return { read, write, subscribe, empty };
}

const sentStore = jsonStore<SentMap>(PREF_KEYS.sentWorkouts, normalizeSent, {});
const queueStore = jsonStore<SendQueue>(PREF_KEYS.sendQueue, normalizeQueue, {});

export const useSent = (): SentMap => useSyncExternalStore(sentStore.subscribe, sentStore.read, () => sentStore.empty);
export const useSendQueue = (): SendQueue => useSyncExternalStore(queueStore.subscribe, queueStore.read, () => queueStore.empty);

export type SendOutcome = { kind: "sent" | "removed" | "queued" | "demo" | "error" | "checked"; text: string; warnings?: string[] };

async function post(req: SendRequest): Promise<SendResponse> {
  try {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req), cache: "no-store" });
    const body = (await res.json().catch(() => null)) as SendResponse | null;
    if (body && typeof body.status === "string") return body;
    return { status: "error", code: res.status === 401 ? "LOCKED" : "UNKNOWN" };
  } catch {
    return { status: "error", code: "NETWORK" };
  }
}

const now = () => new Date().toISOString();

function outcome(req: SendRequest, res: SendResponse, hash?: string): SendOutcome {
  if (res.status === "error") return { kind: "error", text: sendErrorText(res.code, res.retryAfterSec) };
  if (res.status === "demo") return { kind: "demo", text: demoText };
  if (res.status === "checked") return { kind: "checked", text: checkText(res, req.watch) };
  sentStore.write(applySent(sentStore.read(), req, res, hash, now()));
  if (req.action === "delete") return { kind: "removed", text: removedText };
  const warnings = warningTexts(res.warnings, req.watch);
  return { kind: "sent", text: sentText(req.date), ...(warnings.length ? { warnings } : {}) };
}

/** Kirim / hapus satu event. Offline atau jaringan putus = masuk antrean. */
export async function sendToCalendar(req: SendRequest, hash?: string): Promise<SendOutcome> {
  if (!navigator.onLine) {
    queueStore.write(enqueue(queueStore.read(), req, hash, now()));
    return { kind: "queued", text: queuedText(req.action) };
  }
  const res = await post(req);
  if (res.status === "error" && res.code === "NETWORK") {
    queueStore.write(enqueue(queueStore.read(), req, hash, now()));
    return { kind: "queued", text: queuedText(req.action) };
  }
  // Kiriman langsung menggantikan kiriman lama yang masih antre untuk event yang sama.
  const q = queueStore.read()[req.externalId];
  if (q) queueStore.write(dequeue(queueStore.read(), req.externalId, q.queuedAt));
  return outcome(req, res, hash);
}

/** "Cek status unggah" (hanya baca): event, sakelar unggah merek jam, dan error unggah dari intervals.icu. */
export async function checkUpload(req: Omit<SendRequest, "action" | "event">): Promise<SendOutcome> {
  if (!navigator.onLine) return { kind: "error", text: sendErrorText("NETWORK") };
  return outcome({ ...req, action: "check" }, await post({ ...req, action: "check" }));
}

/** Berhenti mencatat event (tanpa menyentuh kalender), mis. "Biarkan" pada tawaran hapus. */
export function forgetSent(externalId: string) {
  const { [externalId]: _gone, ...rest } = sentStore.read();
  sentStore.write(rest);
}

let flushing = false;
/** Kirim antrean (dipanggil saat online lagi dan saat aplikasi dibuka). Berhenti di error yang layak diulang. */
export async function flushSendQueue(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    for (const item of queueOrder(queueStore.read())) {
      const res = await post(item.req);
      if (res.status === "error" && retryable(res.code)) break;
      queueStore.write(dequeue(queueStore.read(), item.req.externalId, item.queuedAt));
      outcome(item.req, res, item.hash);
    }
  } finally {
    flushing = false;
  }
}
