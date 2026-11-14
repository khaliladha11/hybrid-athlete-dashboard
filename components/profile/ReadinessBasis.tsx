"use client";

import { filledCheckin, useCheckins } from "@/lib/checkin-store";
import { readinessBasis } from "@/lib/readiness";
import { useLocale } from "@/lib/i18n/client";

/** Kalimat dasar kesiapan (0.15.2): sinyal wellness dari server + check-in hari ini di perangkat. */
export function ReadinessBasis({ used, today }: { used: string[]; today: string }) {
  const checkin = filledCheckin(useCheckins(), today);
  return <>{readinessBasis(used, !!checkin, useLocale())}</>;
}
