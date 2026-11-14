/**
 * Judul & pesan error intervals.icu per bahasa (1.2.0). Lib tetap membuat error dengan teks Indonesia (log, test lama);
 * tampilan memanggil `errorText`. Bahasa Indonesia memakai teks asli error apa adanya.
 */
import type { Locale } from "@/lib/i18n/locale";
import { LIB_MISC } from "@/lib/i18n/messages/lib-misc";
import type { IntervalsError } from "./types";

export function errorText(e: IntervalsError, locale: Locale = "id"): { title: string; message: string } {
  if (locale === "id") return { title: e.title, message: e.message };
  const t = LIB_MISC[locale].error;
  return e.detail ? t[e.detail] : t[e.code](e.status);
}
