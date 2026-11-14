import { getT } from "@/lib/i18n/server";
import { CHROME } from "@/lib/i18n/messages/chrome";

export async function DemoBanner() {
  const t = (await getT(CHROME)).demo;
  return (
    <div className="border-b border-brand/25 bg-brand-soft px-4 py-2 text-center text-[13px] text-ink">
      <strong className="font-semibold">{t.lead}</strong> {t.body} <code className="font-mono">INTERVALS_API_KEY</code> {t.in}{" "}
      <code className="font-mono">.env.local</code> {t.tail}
    </div>
  );
}
