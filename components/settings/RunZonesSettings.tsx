"use client";

import { useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import type { AthleteSettings } from "@/lib/athlete-settings";
import { baseProfile } from "@/lib/profile";
import {
  RACE_DISTANCES,
  ZONE_KEYS,
  ZONE_LABEL,
  ZONE_SOURCE,
  formatPace,
  formatRange,
  parseDuration,
  parsePace,
  parseRange,
  vdot,
  zonesFromVdot,
  type RaceDistanceKey,
  type ZoneKey,
} from "@/lib/run-zones";

const INPUT = "min-h-11 w-full rounded-control border bg-surface px-3 text-base text-ink tabular focus:border-brand";

function defaultPace(k: ZoneKey): string {
  const v = baseProfile.runZones?.[k]?.pace;
  return typeof v === "string" ? (v.endsWith("/km") ? v : `${v}/km`) : "—";
}

/** Pace per zona bisa diubah manual atau dihitung dari hasil lomba (VDOT Daniels). */
export function RunZonesSettings({ settings, onChange }: { settings: AthleteSettings; onChange: (s: AthleteSettings) => void }) {
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
      <p className="text-[13px] text-muted">Format m:ss per km. Dipakai generator lari dan Program target.</p>
      <ul className="mt-3 space-y-4">
        {ZONE_KEYS.map((k) => (
          <ZoneRow key={`${k}-${settings.runZones[k] ?? ""}`} zone={k} value={settings.runZones[k]} onSave={(p) => setZone(k, p)} />
        ))}
      </ul>
      <VdotCalculator onApply={(zones) => onChange({ ...settings, runZones: zones })} />
    </Card>
  );
}

function ZoneRow({ zone, value, onSave }: { zone: ZoneKey; value?: string; onSave: (pace: string | null) => void }) {
  const current = parseRange(value ?? defaultPace(zone));
  const [fast, setFast] = useState(current ? formatPace(current.fast) : "");
  const [slow, setSlow] = useState(current ? formatPace(current.slow) : "");
  const f = parsePace(fast);
  const s = parsePace(slow);
  const valid = f !== undefined && s !== undefined && f <= s;

  const commit = () => {
    if (!valid) return;
    const next = formatRange({ fast: f, slow: s });
    if (next !== (value ?? defaultPace(zone))) onSave(next === defaultPace(zone) ? null : next);
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
        <input
          aria-label={`${ZONE_LABEL[zone]} batas cepat`}
          inputMode="numeric"
          placeholder="cepat"
          value={fast}
          onChange={(e) => setFast(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className={`${INPUT} ${f === undefined || !valid ? "border-danger" : "border-line-strong"}`}
        />
        <span className="text-muted" aria-hidden>
          –
        </span>
        <input
          aria-label={`${ZONE_LABEL[zone]} batas lambat`}
          inputMode="numeric"
          placeholder="lambat"
          value={slow}
          onChange={(e) => setSlow(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className={`${INPUT} ${s === undefined || !valid ? "border-danger" : "border-line-strong"}`}
        />
      </div>
      <p className={`mt-1 text-[12px] ${valid ? "text-faint" : "font-semibold text-danger-ink"}`}>
        {valid ? `Default ${defaultPace(zone)} · ${ZONE_SOURCE[zone]}` : "✕ Format m:ss (2:30–15:00), batas cepat ≤ batas lambat."}
      </p>
    </li>
  );
}

function VdotCalculator({ onApply }: { onApply: (zones: Partial<Record<ZoneKey, string>>) => void }) {
  const [dist, setDist] = useState<RaceDistanceKey>("5k");
  const [time, setTime] = useState("");
  const meters = RACE_DISTANCES.find((d) => d.key === dist)!.meters;
  const sec = parseDuration(time);
  // Rentang wajar: pace 2:30–15:00/km.
  const plausible = sec !== undefined && sec / (meters / 1000) >= 150 && sec / (meters / 1000) <= 900;
  const v = plausible ? vdot(meters, sec!) : undefined;
  const zones = v ? zonesFromVdot(v) : undefined;

  return (
    <details className="group mt-4 rounded-inner border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-body font-semibold">
        Hitung dari hasil lomba (VDOT)
        <span className="text-[13px] text-faint transition-transform duration-150 ease group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
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
        <label className="block text-[12px] text-muted">
          Waktu
          <input
            inputMode="numeric"
            placeholder={dist === "5k" ? "mm:ss" : "h:mm:ss"}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`${INPUT} mt-1 ${time && !plausible ? "border-danger" : "border-line-strong"}`}
          />
        </label>
        {time && !plausible && <p className="text-[13px] font-semibold text-danger-ink">✕ Format mm:ss atau h:mm:ss dengan pace masuk akal.</p>}
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
