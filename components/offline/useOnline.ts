"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Status jaringan browser (0.16). Server & render pertama: dianggap online. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/** Minta service worker menghapus salinan halaman (berisi data), mis. saat "Kunci perangkat ini". */
export async function clearOfflineData(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    reg?.active?.postMessage({ type: "CLEAR_DATA" });
    const names = (await caches?.keys()) ?? [];
    await Promise.all(names.filter((n) => n.startsWith("ha-pages-")).map((n) => caches.delete(n)));
  } catch {
    /* tanpa service worker: tidak ada yang dihapus */
  }
}
