"use client";

import { useTour } from "@/components/onboarding/Tour";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { useThemePreference, type ThemePreference } from "@/lib/preferences";
import { useBlockMode } from "@/lib/settings-store";

/** Tampilan & program: tema dan blok mingguan. */
export function PreferencesCard() {
  const [theme, setTheme] = useThemePreference();
  const [blockEnabled, setBlockEnabled] = useBlockMode();
  const tour = useTour();
  return (
    <Card title="Tampilan & program">
      <div className="space-y-4">
        <Segmented<ThemePreference>
          label="Tema"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: "Sistem" },
            { value: "light", label: "Terang" },
            { value: "dark", label: "Gelap" },
          ]}
        />
        <div className="border-t border-line pt-4">
          <Switch
            checked={blockEnabled}
            onChange={setBlockEnabled}
            label="Program blok mingguan"
            description="Periodisasi 4 minggu (3 normal + 1 deload) & gerakan ★ per blok. Matikan untuk latihan bebas."
          />
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold">Tur aplikasi</span>
            <span className="block text-[13px] text-muted">Lima sorotan singkat di Profil, Lari, Strength, Program, dan Setting.</span>
          </span>
          <button type="button" onClick={tour.start} className={`${BUTTON.base} ${BUTTON.secondary} shrink-0`}>
            Ulangi tur
          </button>
        </div>
      </div>
    </Card>
  );
}
