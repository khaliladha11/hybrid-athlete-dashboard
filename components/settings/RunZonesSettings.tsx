"use client";

import { useId, useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { TimePicker } from "@/components/ui/TimePicker";
import type { AthleteSettings } from "@/lib/athlete-settings";
import { baseProfile } from "@/lib/profile";
import {
  RACE_DISTANCES,
  ZONE_KEYS,
  ZONE_LABEL,
  ZONE_SOURCE,
  formatPace,
  formatRange,
  parsePace,
  parseRange,
  vdot,
  zonesFromVdot,
  type RaceDistanceKey,
  type ZoneKey,
} from "@/lib/run-zones";

/** Batas pace yang diterima lib (2:30–15:00/km), dipakai ulang lewat parsePace. */
const inBounds = (sec: number) => parsePace(formatPace(sec)) !== undefined;

function defaultPace(k: ZoneKey): string {
  const v = baseProfile.runZones?.[k]?.pace;
  return typeof v === "string" ? (v.endsWith("/km") ? v : `${v}/km`) : "·";
}

/** Pace per zona bisa diubah manual atau dihitung dari hasil lomba (VDOT Daniels). */
export function RunZonesSettings({
  settings,
  onChange,
  calculatorOpen = false,
}: {
  settings: AthleteSettings;
  onChange: (s: AthleteSettings) => void;
  /** Buka kalkulator VDOT sejak awal (onboarding jalur "Dari hasil lomba"). */
  calculatorOpen?: boolean;
}) {
  const setZone = (k: ZoneKey, pace: string | null) => {
    const runZones = { ...settings.runZones };
    if (pace) runZones[k] = pace;
    else delete runZones[k];
    onChange({ ...settings, runZones });
  };
  const customized = Object.keys(settings.runZones).length > 0;

  return (
    <Card
      title="Zona lari"
      action={
        customized ? (
          <button type="button" onClick={() => onChange({ ...settings, runZones: {} })} className="pressable min-h-9 rounded-control px-2 text-[13px] font-semibold text-muted hover:bg-subtle hover:text-ink">
            Reset semua
          </button>
        ) : (
          <span className="text-[12px] text-faint">default profil</span>
        )
      }
    >
      <p className="text-[13px] text-muted">Pace per km (menit:detik). Ketuk angka untuk mengubah. Dipakai generator lari dan Program target.</p>
      <ul className="mt-3 space-y-4">
        {ZONE_KEYS.map((k) => (
          <ZoneRow key={k} zone={k} value={settings.runZones[k]} onSave={(p) => setZone(k, p)} />
        ))}
      </ul>
      <VdotCalculator open={calculatorOpen} onApply={(zones) => onChange({ ...settings, runZones: zones })} />
    </Card>
  );
}

function ZoneRow({ zone, value, onSave }: { zone: ZoneKey; value?: string; onSave: (pace: string | null) => void }) {
  const saved = value ?? defaultPace(zone);
  const current = parseRange(saved) ?? { fast: 360, slow: 360 };
  // Draft hanya hidup selama kombinasi belum valid, dan gugur bila nilai tersimpan berubah dari luar (reset, VDOT).
  const [draft, setDraft] = useState<{ base: string; fast: number; slow: number } | null>(null);
  const shown = draft && draft.base === saved ? draft : current;
  const valid = inBounds(shown.fast) && inBounds(shown.slow) && shown.fast <= shown.slow;

  const change = (next: { fast: number; slow: number }) => {
    if (!(inBounds(next.fast) && inBounds(next.slow) && next.fast <= next.slow)) {
      setDraft({ base: saved, ...next });
      return;
    }
    setDraft(null);
    const text = formatRange(next);
    if (text !== saved) onSave(text === defaultPace(zone) ? null : text);
  };

  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-body font-semibold">{ZONE_LABEL[zone]}</p>
        {value ? (
          <button type="button" onClick={() => onSave(null)} className="pressable text-[12px] font-semibold text-brand-ink hover:underline">
            Kembalikan default
          </button>
        ) : (
          <span className="text-[12px] text-faint">default</span>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TimePicker
          aria-label={`${ZONE_LABEL[zone]} batas cepat`}
          format="ms"
          minuteRange={[2, 15]}
          value={shown.fast}
          onChange={(fast) => change({ fast, slow: shown.slow })}
          invalid={!valid}
        />
        <span className="text-[13px] text-muted" aria-hidden>
          sampai
        </span>
        <TimePicker
          aria-label={`${ZONE_LABEL[zone]} batas lambat`}
          format="ms"
          minuteRange={[2, 15]}
          value={shown.slow}
          onChange={(slow) => change({ fast: shown.fast, slow })}
          invalid={!valid}
        />
      </div>
      <p className={`mt-1 text-[12px] ${valid ? "text-faint" : "font-semibold text-danger-ink"}`}>
        {valid ? `Default ${defaultPace(zone)} · ${ZONE_SOURCE[zone]}` : "✕ Pace harus 2:30–15:00/km dan batas cepat ≤ batas lambat. Belum disimpan."}
      </p>
    </li>
  );
}

function VdotCalculator({ onApply, open }: { onApply: (zones: Partial<Record<ZoneKey, string>>) => void; open?: boolean }) {
  const [dist, setDist] = useState<RaceDistanceKey>("5k");
  const [sec, setSec] = useState(0);
  const timeId = useId();
  const km = RACE_DISTANCES.find((d) => d.key === dist)!.meters / 1000;
  // Rentang wajar: pace 2:30–15:00/km. 0 = belum diisi.
  const pace = sec / km;
  const plausible = sec > 0 && inBounds(pace);
  const v = plausible ? vdot(km * 1000, sec) : undefined;
  const zones = v ? zonesFromVdot(v) : undefined;

  return (
    <details open={open || undefined} className="group mt-4 rounded-inner border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-body font-semibold">
        Hitung dari hasil lomba (VDOT)
        <span className="text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
          ›
        </span>
      </summary>
      <div className="details-body space-y-3 px-3 pb-3">
        <p className="text-[13px] text-muted">
          Masukkan hasil lomba atau time trial terbaru (usaha maksimal). Rumus VDOT dari Daniels &amp; Gilbert (Daniels&apos; Running Formula, 2014).
        </p>
        <Segmented
          label="Jarak"
          value={dist}
          onChange={setDist}
          options={RACE_DISTANCES.map((d) => ({ value: d.key, label: d.key === "hm" ? "HM" : d.key === "fm" ? "FM" : d.label }))}
        />
        <div>
          <p id={timeId} className="t-label">
            Waktu
          </p>
          <TimePicker
            aria-labelledby={timeId}
            format="hms"
            maxHours={Math.floor((km * 900) / 3600)}
            value={sec}
            onChange={setSec}
            invalid={sec > 0 && !plausible}
            placeholder={sec === 0}
            units
            className="mt-1"
          />
        </div>
        {sec > 0 && !plausible && (
          <p className="text-[13px] font-semibold text-danger-ink">✕ Pace {formatPace(pace)}/km di luar rentang wajar 2:30–15:00/km. Cek jarak dan waktunya.</p>
        )}
        {zones && v && (
          <>
            <div className="rounded-inner bg-subtle p-3">
              <p className="text-[13px] text-muted">
                VDOT <span className="tabular text-[18px] font-semibold text-ink">{v.toFixed(1)}</span>
              </p>
              <dl className="mt-2 space-y-1 text-[13px]">
                {ZONE_KEYS.map((k) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-muted">{ZONE_LABEL[k]}</dt>
                    <dd className="tabular font-semibold">{formatRange(zones[k])}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <button
              type="button"
              onClick={() => onApply(Object.fromEntries(ZONE_KEYS.map((k) => [k, formatRange(zones[k])])))}
              className={`${BUTTON.base} ${BUTTON.primary} w-full`}
            >
              Terapkan ke semua zona
            </button>
          </>
        )}
      </div>
    </details>
  );
}
