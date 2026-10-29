"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { shouldPromptUpdate } from "@/lib/offline";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { useOnline } from "./useOnline";

/**
 * Mode offline (0.16, docs/RELEASE-1.0.md #1): mendaftarkan service worker (produksi saja), menampilkan banner
 * "Sedang offline", dan prompt versi baru. Versi baru tidak pernah memuat ulang sendiri; prompt disembunyikan selama
 * sesi latihan berjalan dan baru memuat ulang setelah pengguna mengetuk "Muat ulang".
 */
export function OfflineAgent() {
  const online = useOnline();
  const path = usePathname();
  const [active] = useStoredString(PREF_KEYS.activeWorkout, "");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    const watch = (r: ServiceWorkerRegistration) => {
      // Versi baru menunggu hanya bila sudah ada versi yang mengendalikan halaman (bukan pemasangan pertama).
      if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
      r.addEventListener("updatefound", () => {
        const w = r.installing;
        w?.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) setWaiting(w);
        });
      });
    };
    const onControllerChange = () => {
      if (reloading.current) window.location.reload();
      // Versi baru aktif: salinan halaman versi lama sudah dibersihkan, simpan ulang rute utama.
      else if (navigator.onLine) navigator.serviceWorker.controller?.postMessage({ type: "WARM" });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void reg?.update().catch(() => {});
    };
    navigator.serviceWorker
      .register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`, { scope: "/" })
      .then((r) => {
        reg = r;
        watch(r);
        return navigator.serviceWorker.ready;
      })
      .then((r) => {
        // Simpan rute utama yang belum tersimpan (sekali per perangkat), hanya saat online.
        if (navigator.onLine) r.active?.postMessage({ type: "WARM" });
      })
      .catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const reload = () => {
    reloading.current = true;
    waiting?.postMessage({ type: "SKIP_WAITING" });
  };
  const showUpdate = !!waiting && shouldPromptUpdate({ path, activeWorkout: !!active });

  return (
    <>
      {!online && (
        <div role="status" aria-live="polite" className="border-b border-line bg-subtle px-4 py-2 text-center text-[13px] text-ink">
          <strong className="font-semibold">Sedang offline</strong> · perubahan disimpan di perangkat dan dikirim saat online.
        </div>
      )}
      {showUpdate && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-card border border-line bg-surface-raised px-4 py-2 shadow-card"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        >
          <span className="text-[13px] text-ink">Versi baru tersedia</span>
          <button type="button" onClick={reload} className={`${BUTTON.base} ${BUTTON.secondary} text-[13px]`}>
            Muat ulang
          </button>
        </div>
      )}
    </>
  );
}
