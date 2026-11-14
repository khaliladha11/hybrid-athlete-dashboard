"use client";

import { useTour } from "@/components/onboarding/Tour";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString, useThemePreference, type ThemePreference } from "@/lib/preferences";
import { useBlockMode } from "@/lib/settings-store";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locale";
import { SETTINGS } from "@/lib/i18n/messages/settings";

/** Tampilan & program: tema, blok mingguan, dan catatan ST di kalender intervals.icu (0.17, per perangkat). */
export function PreferencesCard() {
  const [theme, setTheme] = useThemePreference();
  const [blockEnabled, setBlockEnabled] = useBlockMode();
  const [stNote, setStNote] = useStoredString(PREF_KEYS.stCalendarNote, "");
  const tour = useTour();
  const t = useT(SETTINGS).prefs;
  const locale = useLocale();
  const setLocale = useSetLocale();
  return (
    <Card title={t.title}>
      <div className="space-y-4">
        <Segmented<ThemePreference>
          label={t.theme}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t.system },
            { value: "light", label: t.light },
            { value: "dark", label: t.dark },
          ]}
        />
        <Segmented<Locale>
          label={t.language}
          value={locale}
          onChange={setLocale}
          options={[
            { value: "id", label: "Indonesia" },
            { value: "en", label: "English" },
          ]}
        />
        <div className="border-t border-line pt-4">
          <Switch
            checked={blockEnabled}
            onChange={setBlockEnabled}
            label={t.block}
            description={t.blockDesc}
          />
        </div>
        <div className="border-t border-line pt-4">
          <Switch
            checked={stNote === "1"}
            onChange={(v) => setStNote(v ? "1" : null)}
            label={t.stNote}
            description={t.stNoteDesc}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold">{t.tour}</span>
            <span className="block text-[13px] text-muted">{t.tourDesc}</span>
          </span>
          <button type="button" onClick={tour.start} className={`${BUTTON.base} ${BUTTON.secondary} shrink-0`}>
            {t.tourAgain}
          </button>
        </div>
      </div>
    </Card>
  );
}
