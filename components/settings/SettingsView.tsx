"use client";

import { useMemo } from "react";
import { resolveProfile } from "@/lib/athlete-settings";
import { baseProfile } from "@/lib/profile";
import { useAthleteSettings } from "@/lib/settings-store";
import { ConditionsSettings } from "./ConditionsSettings";
import { DataBackupCard } from "./DataBackupCard";
import { EquipmentSettings } from "./EquipmentSettings";
import { MovementSettings } from "./MovementSettings";
import { PreferencesCard } from "./PreferencesCard";
import { RunZonesSettings } from "./RunZonesSettings";

const SECTIONS = [
  ["kondisi", "Kondisi"],
  ["zona", "Zona lari"],
  ["alat", "Alat"],
  ["gerakan", "Gerakan"],
  ["tampilan", "Tampilan"],
  ["data", "Data"],
] as const;

export function SettingsView() {
  const [settings, save] = useAthleteSettings();
  const resolved = useMemo(() => resolveProfile(baseProfile, settings), [settings]);

  return (
    <div className="space-y-4">
      <nav aria-label="Bagian setting" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex gap-2">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="pressable inline-flex min-h-9 items-center rounded-full border border-line-strong bg-surface px-3 text-[13px] font-semibold whitespace-nowrap text-ink hover:bg-subtle"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div id="kondisi" className="scroll-mt-4">
        <ConditionsSettings settings={settings} onChange={save} warnings={resolved.warnings} />
      </div>
      <div id="zona" className="scroll-mt-4">
        <RunZonesSettings settings={settings} onChange={save} />
      </div>
      <div id="alat" className="scroll-mt-4">
        <EquipmentSettings settings={settings} onChange={save} />
      </div>
      <div id="gerakan" className="scroll-mt-4">
        <MovementSettings settings={settings} onChange={save} resolved={resolved} />
      </div>
      <div id="tampilan" className="scroll-mt-4">
        <PreferencesCard />
      </div>
      <div id="data" className="scroll-mt-4">
        <DataBackupCard />
      </div>
    </div>
  );
}
