import type { Metadata } from "next";
import { UnlockForm } from "@/components/auth/UnlockForm";
import { sanitizeNext } from "@/lib/auth/access";
import { passcodeConfig } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Buka · Hybrid Athlete" };
export const dynamic = "force-dynamic";

/** Halaman kunci sandi aplikasi (docs/SYNC.md §3). Hanya status yang dikirim ke browser, bukan nilai env. */
export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const raw = (await searchParams).next;
  return <UnlockForm state={passcodeConfig().state} next={sanitizeNext(Array.isArray(raw) ? raw[0] : raw)} />;
}
