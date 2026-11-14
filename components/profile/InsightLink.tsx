"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { PROFILE } from "@/lib/i18n/messages/profile";

/** Tautan ke Insight (0.15.0): baris teks di akhir kartu, area sentuh 44px. */
export function InsightLink() {
  const t = useT(PROFILE);
  return (
    <div className="mt-4 border-t border-line pt-1">
      <Link href="/insight" className="pressable inline-flex min-h-11 items-center text-body font-semibold text-brand-ink">
        {t.insightLink}
      </Link>
    </div>
  );
}
