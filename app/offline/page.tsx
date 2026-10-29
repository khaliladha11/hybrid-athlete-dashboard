import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Offline · Hybrid Athlete" };

// Cadangan service worker (0.16) untuk halaman yang belum pernah tersimpan. Statis, publik, tanpa data.
export default function OfflinePage() {
  return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-lg font-semibold">Halaman ini belum tersimpan untuk offline</p>
      <p className="text-body text-muted">Buka halaman ini sekali saat online supaya bisa dibuka tanpa sinyal. Log ST dan check-in tetap tersimpan di perangkat.</p>
      <Link href="/" className={`${BUTTON.base} ${BUTTON.secondary}`}>
        Buka Profil
      </Link>
    </div>
  );
}
