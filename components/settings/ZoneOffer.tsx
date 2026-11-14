"use client";

import { BUTTON } from "@/components/ui/Card";
import { formatDateId, todayWib } from "@/lib/date";
import { zoneOffer } from "@/lib/program/prediction";
import { ZONE_KEYS, ZONE_LABEL, formatRange, parseRange, zoneVdot, zonesFromVdot } from "@/lib/run-zones";
import { useAthleteSettings, useIsClient, useResolvedProfile } from "@/lib/settings-store";
import { useLocale, useT } from "@/lib/i18n/client";
import { SETTINGS } from "@/lib/i18n/messages/settings";

/**
 * Tawaran update zona (PROGRAM-HIDUP §4.7) di Setting › Zona dan Profil. Tidak pernah otomatis:
 * Perbarui menulis zona dari VDOT hasil terbaru; Tolak mengingat VDOT itu sampai ada kenaikan ≥ 1 lagi.
 */
export function ZoneOffer({ today, inset = false }: { today?: string; /** Di dalam kartu lain (Setting › Zona). */ inset?: boolean }) {
  const [settings, save] = useAthleteSettings();
  const p = useResolvedProfile();
  const isClient = useIsClient();
  const locale = useLocale();
  const t = useT(SETTINGS).zoneOffer;
  if (!isClient) return null;
  const pace = p.runZones?.tempo?.pace;
  const tempo = typeof pace === "string" ? parseRange(pace) : undefined;
  const offer = zoneOffer({
    raceResults: settings.raceResults,
    zoneVdot: tempo ? zoneVdot(tempo) : undefined,
    dismissedVdot: settings.zoneOfferDismissedVdot,
    today: today ?? todayWib(),
  });
  if (!offer) return null;
  const zones = zonesFromVdot(offer.vdot);

  return (
    <section aria-label={t.region} className={inset ? "rounded-inner border border-line-strong p-3" : "rounded-card border border-line bg-surface p-4 shadow-card"}>
      <p className="text-body font-semibold">{t.title(formatDateId(offer.result.date, locale))}</p>
      <p className="mt-1 text-[13px] text-muted">
        {t.bodyA}<span className="tabular">{offer.vdot.toFixed(1)}</span>{t.bodyB}<span className="tabular">{offer.zoneVdot.toFixed(1)}</span>{t.bodyC}
      </p>
      <dl className="mt-2 space-y-1 text-[13px]">
        {ZONE_KEYS.map((k) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted">{ZONE_LABEL[k]}</dt>
            <dd className="tabular font-semibold">{formatRange(zones[k])}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => save({ ...settings, zoneOfferDismissedVdot: Math.round(offer.vdot * 10) / 10 })} className={`${BUTTON.base} ${BUTTON.secondary}`}>
          {t.decline}
        </button>
        <button
          type="button"
          onClick={() => save({ ...settings, runZones: Object.fromEntries(ZONE_KEYS.map((k) => [k, formatRange(zones[k])])) })}
          className={`${BUTTON.base} ${BUTTON.primary}`}
        >
          {t.update}
        </button>
      </div>
    </section>
  );
}
