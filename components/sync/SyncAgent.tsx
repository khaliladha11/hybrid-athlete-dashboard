"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { markSyncOff, startSync } from "@/lib/sync/client";

/** Menjalankan sinkron di latar bila server menyatakan aktif (sandi + database). Tidak merender apa pun. */
export function SyncAgent({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  // Di halaman sandi belum ada sesi; sinkron dimulai setelah aplikasi terbuka.
  const locked = pathname === "/unlock";
  useEffect(() => {
    if (!enabled) {
      markSyncOff();
      return;
    }
    if (locked) return;
    return startSync();
  }, [enabled, locked]);
  return null;
}
