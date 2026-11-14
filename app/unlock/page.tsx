import type { Metadata } from "next";
import { UnlockForm } from "@/components/auth/UnlockForm";
import { sanitizeNext } from "@/lib/auth/access";
import { passcodeConfig } from "@/lib/auth/config";
import { MISC } from "@/lib/i18n/messages/misc";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: MISC[await getLocale()].unlock.meta };
}
export const dynamic = "force-dynamic";

/** Halaman kunci sandi aplikasi (docs/SYNC.md §3). Hanya status yang dikirim ke browser, bukan nilai env. */
export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const raw = (await searchParams).next;
  return <UnlockForm state={passcodeConfig().state} next={sanitizeNext(Array.isArray(raw) ? raw[0] : raw)} />;
}
