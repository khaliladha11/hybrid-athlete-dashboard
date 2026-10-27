"use client";

import { useEffect, useState } from "react";

export type WakeState = "on" | "off" | "unsupported";

/**
 * Layar tetap menyala selama `on` (Screen Wake Lock API). Kunci dilepas browser saat tab disembunyikan, jadi diminta
 * lagi setiap kali halaman terlihat. Tanpa dukungan: "unsupported" (layar mengikuti pengaturan perangkat).
 */
export function useWakeLock(on: boolean): WakeState {
  const [state, setState] = useState<WakeState>("off");
  useEffect(() => {
    if (!on) return;
    if (!("wakeLock" in navigator)) {
      queueMicrotask(() => setState("unsupported"));
      return;
    }
    let alive = true;
    let sentinel: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (!alive) return void sentinel.release();
        setState("on");
        sentinel.addEventListener("release", () => alive && setState("off"));
      } catch {
        // Ditolak (mis. hemat daya): layar mengikuti pengaturan perangkat.
        if (alive) setState("off");
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [on]);
  return state;
}

/** Jam yang berdetak tiap `ms` (dan saat halaman terlihat lagi), untuk timer berbasis `endsAt`. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ms]);
  return now;
}

export const canVibrate = () => typeof navigator !== "undefined" && "vibrate" in navigator;

export function vibrate(pattern: number[]) {
  try {
    if (canVibrate()) navigator.vibrate(pattern);
  } catch {
    // Tidak didukung: diam.
  }
}
