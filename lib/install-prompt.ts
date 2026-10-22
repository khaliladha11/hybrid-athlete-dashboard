"use client";

/**
 * Status pemasangan PWA. `beforeinstallprompt` (Android/Chrome) dikirim browser sekali, sering sebelum
 * onboarding langkah 9 dibuka, jadi ditangkap di tingkat modul. Modul ini diimpor oleh `OnboardingGate`
 * (ada di layout) supaya pendengarnya terpasang sejak awal.
 */
import { useCallback, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform = "ios" | "android" | "other";

let deferred: InstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Tahan banner bawaan Chrome; tombol "Pasang aplikasi" di onboarding/Setting yang memanggilnya.
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installedNow = true;
    deferred = null;
    emit();
  });
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function platform(): InstallPlatform {
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOs) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function subscribe(l: () => void) {
  listeners.add(l);
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", l);
  return () => {
    listeners.delete(l);
    mq.removeEventListener("change", l);
  };
}

/** Snapshot sebagai string supaya stabil untuk useSyncExternalStore. */
const snapshot = () => `${isStandalone() ? 1 : 0}|${deferred ? 1 : 0}|${installedNow ? 1 : 0}|${platform()}`;
const serverSnapshot = () => "0|0|0|other";

export interface InstallState {
  /** Sedang dibuka sebagai aplikasi terpasang. */
  standalone: boolean;
  /** Browser menyediakan dialog pasang (Android/Chrome). */
  canPrompt: boolean;
  /** Baru saja dipasang di sesi ini. */
  installed: boolean;
  platform: InstallPlatform;
  /** Tampilkan dialog pasang bawaan browser. true bila pengguna menerima. */
  prompt: () => Promise<boolean>;
}

export function useInstallState(): InstallState {
  const snap = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [standalone, canPrompt, installed, plat] = snap.split("|");
  const prompt = useCallback(async () => {
    const e = deferred;
    if (!e) return false;
    deferred = null;
    emit();
    await e.prompt();
    const choice = await e.userChoice;
    return choice.outcome === "accepted";
  }, []);
  return { standalone: standalone === "1", canPrompt: canPrompt === "1", installed: installed === "1", platform: plat as InstallPlatform, prompt };
}
