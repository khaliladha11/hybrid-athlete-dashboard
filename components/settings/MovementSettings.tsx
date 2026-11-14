"use client";

import { CONDITIONS } from "@/lib/conditions";
import { conditionShort } from "@/lib/i18n/safety-text";
import { statusReason } from "@/lib/athlete-settings";
import { defaultSelected, MOVEMENT_CATEGORIES, type AthleteSettings, type ResolvedProfile } from "@/lib/athlete-settings";
import { STABILITY_HIP } from "@/lib/generator/meta";
import { baseProfile, type MovementCategory } from "@/lib/profile";
import { Card } from "@/components/ui/Card";
import { useLocale, useT } from "@/lib/i18n/client";
import { SETTINGS } from "@/lib/i18n/messages/settings";
import { formatNumber } from "@/lib/i18n/format";

/** Pilih gerakan library yang boleh dipakai generator ST. */
export function MovementSettings({
  settings,
  onChange,
  resolved,
}: {
  settings: AthleteSettings;
  onChange: (s: AthleteSettings) => void;
  resolved: ResolvedProfile;
}) {
  const locale = useLocale();
  const t = useT(SETTINGS).movements;
  // Status terpilih dari resolveProfile, termasuk gerakan cadangan yang aktif otomatis.
  const selected = (name: string) =>
    settings.movements[name] ?? resolved.movementStatus[name]?.selected ?? defaultSelected(baseProfile.movementLibrary[categoryOf(name)]!.find((m) => m.name === name)!);
  const setSelected = (name: string, on: boolean) => onChange({ ...settings, movements: { ...settings.movements, [name]: on } });

  // Gerakan yang dikunci karena diwajibkan kondisi aktif.
  const lockReason = (name: string): string | undefined => {
    const req = resolved.activeConditions.filter((id) => CONDITIONS[id].rules.requiredLower?.includes(name));
    if (req.length) return t.required(req.map((id) => conditionShort(id, locale).split(" /")[0]).join(", "));
    if (resolved.rules.hipStability && STABILITY_HIP.includes(name)) {
      const others = STABILITY_HIP.filter((n) => n !== name && selected(n));
      if (!others.length && selected(name)) return t.hipMin;
    }
    return undefined;
  };

  const counts = MOVEMENT_CATEGORIES.map((c) => resolved.movementLibrary[c].filter((m) => m.available !== false).length);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <Card title={t.title} action={<span className="text-[12px] text-faint">{t.active(total)}</span>}>
      <p className="text-[13px] text-muted">
        {t.intro}
      </p>
      <div className="mt-2 divide-y divide-line">
        {MOVEMENT_CATEGORIES.map((cat, ci) => (
          <details key={cat} className="group">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-body font-semibold">
              <span className="flex-1">{t.category[cat]}</span>
              <span className={`text-[12px] ${counts[ci] ? "text-muted" : "font-semibold text-danger-ink"}`}>
                {t.count(counts[ci], baseProfile.movementLibrary[cat].length)}
              </span>
              <span className="text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                ›
              </span>
            </summary>
            <ul className="details-body space-y-1.5 pb-3">
              {baseProfile.movementLibrary[cat].map((m) => {
                const status = resolved.movementStatus[m.name];
                const isOn = selected(m.name);
                const lock = lockReason(m.name);
                const resolvedWeight = resolved.movementLibrary[cat].find((x) => x.name === m.name)?.weight ?? m.weight;
                const note = lock ?? (isOn && !status?.available ? statusReason(status, locale) : undefined);
                return (
                  <li key={m.name}>
                    <label className={`flex min-h-12 items-center gap-3 rounded-inner px-2 py-1.5 ${lock ? "" : "cursor-pointer hover:bg-subtle"}`}>
                      <input
                        type="checkbox"
                        checked={isOn || !!lock}
                        disabled={!!lock}
                        onChange={(e) => setSelected(m.name, e.target.checked)}
                        className="h-5 w-5 shrink-0 accent-success"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[14px] ${isOn ? "font-semibold text-ink" : "text-muted line-through decoration-faint"}`}>{m.name}</span>
                        <span className="tabular block text-[12px] text-muted">
                          {resolvedWeight}
                          {status?.loads?.length ? t.loads(status.loads.map((v) => formatNumber(locale, v)).join("/")) : ""}
                        </span>
                        {status?.fallback && !note && settings.movements[m.name] === undefined && (
                          <span className="block text-[12px] text-faint">
                            {status.autoSelected ? t.fallbackAuto : t.fallback}
                          </span>
                        )}
                        {note && (
                          <span className={`block text-[12px] font-semibold ${lock ? "text-success-ink" : "text-danger-ink"}`}>
                            {lock ? "✓ " : "✕ "}
                            {note}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </Card>
  );
}

function categoryOf(name: string): MovementCategory {
  return MOVEMENT_CATEGORIES.find((c) => baseProfile.movementLibrary[c].some((m) => m.name === name)) ?? "upperPush";
}
