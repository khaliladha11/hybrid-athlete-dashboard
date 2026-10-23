"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSyncStatus } from "@/lib/sync/client";
import { needsAttention } from "./syncStatus";

/** Titik status di AppBar, hanya saat sinkron bermasalah (docs/SYNC.md §7). Normal: tidak tampil apa pun. */
export function SyncAlert() {
  const meta = useSyncStatus();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!needsAttention(meta, now)) return null;
  const label = meta.state === "conflict" ? "Sinkron konflik. Buka Setting" : "Ada perubahan yang belum terkirim. Buka Setting";
  return (
    <Link href="/setting#data" aria-label={label} title={label} className="pressable grid h-11 w-11 place-items-center rounded-full">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-danger" />
    </Link>
  );
}
