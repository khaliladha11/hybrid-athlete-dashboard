import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON } from "@/components/ui/Card";
import { getT } from "@/lib/i18n/server";
import { CHROME } from "@/lib/i18n/messages/chrome";

export const metadata: Metadata = { title: "Offline · Hybrid Athlete" };

// Cadangan service worker (0.16) untuk halaman yang belum pernah tersimpan. Statis, publik, tanpa data.
export default async function OfflinePage() {
  const t = (await getT(CHROME)).offline;
  return (
    <div className="space-y-4 py-10 text-center">
      <p className="text-lg font-semibold">{t.title}</p>
      <p className="text-body text-muted">{t.body}</p>
      <Link href="/" className={`${BUTTON.base} ${BUTTON.secondary}`}>
        {t.open}
      </Link>
    </div>
  );
}
