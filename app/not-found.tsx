import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { CHROME } from "@/lib/i18n/messages/chrome";

export default async function NotFound() {
  const t = (await getT(CHROME)).notFound;
  return (
    <div className="space-y-2 py-10 text-center">
      <p className="text-lg font-semibold">{t.title}</p>
      <Link href="/" className="text-body text-info underline">
        {t.back}
      </Link>
    </div>
  );
}
