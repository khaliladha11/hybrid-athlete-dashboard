"use client";

import { BUTTON } from "@/components/ui/Card";
import { useAthleteSettings, useIsClient } from "@/lib/settings-store";
import { useT } from "@/lib/i18n/client";
import { STRENGTH } from "@/lib/i18n/messages/strength";

/**
 * Layar sekali "Perubahan batas beban" (0.14.0, STRENGTH-HIDUP §2). Sampai pengguna menekan "Saya mengerti, aktifkan",
 * generator dan progresi tetap memakai rentang library sebagai batas. Persetujuan tersimpan di Setting (ikut sinkron).
 */
export function LoadRuleNotice({ inset = false }: { inset?: boolean }) {
  const [settings, save] = useAthleteSettings();
  const isClient = useIsClient();
  const t = useT(STRENGTH).loadRule;
  if (!isClient || settings.loadRule?.acceptedAt) return null;
  const accept = () => save({ ...settings, loadRule: { ...settings.loadRule, acceptedAt: new Date().toISOString(), limitToLibrary: false } });
  return (
    <section
      aria-label={t.title}
      className={inset ? "rounded-inner border border-line-strong p-3" : "rounded-card border border-line bg-surface p-4 shadow-card"}
    >
      <p className="t-label">{t.title}</p>
      <p className="mt-2 text-body font-semibold">{t.lead}</p>
      <ul className="mt-2 space-y-1.5 text-[14px] text-ink">
        {t.points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className="text-info">
              ›
            </span>
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-muted">{t.until}</p>
      <button type="button" onClick={accept} className={`${BUTTON.base} ${BUTTON.primary} mt-3 w-full`}>
        {t.accept}
      </button>
    </section>
  );
}
