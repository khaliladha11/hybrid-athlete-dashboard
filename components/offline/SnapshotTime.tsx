"use client";

import { useEffect, useState } from "react";
import { snapshotText } from "@/lib/offline";
import { useOnline } from "./useOnline";

/**
 * "Data terakhir {waktu}" (0.16): waktu render halaman ini di server. Hanya tampil saat offline, karena saat itu
 * halaman datang dari salinan service worker dan saran/angka intervals.icu belum diperbarui.
 */
export function SnapshotTime({ at }: { at: string }) {
  const online = useOnline();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), [online]);
  if (online || now === null) return null;
  const text = snapshotText(at, now);
  return text ? <p className="rounded-inner bg-subtle px-3 py-2 text-[13px] text-muted">{text}</p> : null;
}
