"use client";

import { useT } from "@/lib/i18n/client";
import { CHROME } from "@/lib/i18n/messages/chrome";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT(CHROME).error;
  // Sengaja tidak menampilkan error.message / stack ke user.
  return (
    <div role="alert" className="space-y-3 rounded-card border border-danger/30 bg-danger-soft p-5 text-danger-ink">
      <p className="font-semibold">{t.title}</p>
      <p className="text-body opacity-90">{t.body}</p>
      <button type="button" onClick={reset} className="pressable min-h-11 rounded-control bg-inverse px-4 text-base font-semibold text-on-inverse">
        {t.retry}
      </button>
    </div>
  );
}
