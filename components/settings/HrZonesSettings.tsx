"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import type { AthleteSettings } from "@/lib/athlete-settings";
import type { Difficulty } from "@/lib/generator/types";
import { DIFFICULTY_LABEL } from "@/lib/generator/types";
import {
  DEFAULT_STRENGTH_RPE,
  HR_MODE_LABEL,
  HR_MODE_SOURCE,
  HR_ZONE_MODES,
  RUN_RPE,
  STRENGTH_RPE_MAX,
  STRENGTH_RPE_MIN,
  hrTargets,
  validateRef,
  validateStrengthRpe,
  validateTops,
  zoneRangeText,
  zoneRows,
  zoneTops,
  type HrZoneMode,
  type StrengthRpe,
  type ZoneTops,
} from "@/lib/hr-zones";

/** LTHR dan HR maks lari dari intervals.icu (server), untuk mengisi awal. */
export interface HrRefs {
  lthr?: number;
  maxHr?: number;
}

const RESET =
  "pressable min-h-9 rounded-control px-2 text-[13px] font-semibold text-muted hover:bg-subtle hover:text-ink";
const INPUT = "tabular min-h-11 w-full rounded-control border bg-surface px-3 text-base text-ink focus:border-brand";

/**
 * Zona HR lari (bawaan / LTHR / HR maks / manual) dan RPE per level (0.17, docs/RELEASE-1.0.md #7). Zona hanya mengubah
 * target workout dan tampilan; ambang lari berat untuk saran tetap 90% LTHR (0.15.2).
 */
export function HrZonesSettings({ settings, onChange, refs = {} }: { settings: AthleteSettings; onChange: (s: AthleteSettings) => void; refs?: HrRefs }) {
  const hr = settings.hrZones ?? { mode: "default" as const };
  const tops = zoneTops(settings.hrZones);
  const targets = hrTargets(tops);
  const customized = !!settings.hrZones && settings.hrZones.mode !== "default";

  const setHr = (next: AthleteSettings["hrZones"]) => {
    const { hrZones: _old, ...rest } = settings;
    onChange(next && next.mode !== "default" ? { ...rest, hrZones: next } : rest);
  };
  const pickMode = (mode: HrZoneMode) => {
    if (mode === "lthr") setHr({ mode, lthr: hr.lthr ?? refs.lthr });
    else if (mode === "maxHr") setHr({ mode, maxHr: hr.maxHr ?? refs.maxHr });
    else if (mode === "manual") setHr({ mode, tops: hr.tops ?? tops });
    else setHr(undefined);
  };

  return (
    <Card title="Zona HR & RPE" action={customized ? <button type="button" onClick={() => setHr(undefined)} className={RESET}>Kembalikan bawaan</button> : <span className="text-[12px] text-faint">bawaan</span>}>
      <p className="text-[13px] text-muted">Dipakai untuk target HR di generator lari, Program, dan workout yang dikirim ke jam. Ambang lari berat untuk saran tetap 90% LTHR.</p>
      <div className="mt-3">
        <Segmented wrap label="Sumber zona" value={hr.mode} onChange={pickMode} options={HR_ZONE_MODES.map((m) => ({ value: m, label: HR_MODE_LABEL[m] }))} />
      </div>
      <p className="mt-2 text-[12px] text-faint">{HR_MODE_SOURCE[hr.mode]}</p>

      {(hr.mode === "lthr" || hr.mode === "maxHr") && (
        <RefInput
          key={hr.mode}
          mode={hr.mode}
          value={hr.mode === "lthr" ? hr.lthr : hr.maxHr}
          fromIcu={hr.mode === "lthr" ? refs.lthr : refs.maxHr}
          onSave={(v) => setHr(hr.mode === "lthr" ? { mode: "lthr", lthr: v } : { mode: "maxHr", maxHr: v })}
        />
      )}
      {hr.mode === "manual" && <ManualTops saved={hr.tops ?? tops} onSave={(t) => setHr({ mode: "manual", tops: t })} />}

      <table className="tabular mt-4 w-full text-[14px]">
        <caption className="t-label mb-2 text-left">Zona efektif (bpm)</caption>
        <tbody className="divide-y divide-line">
          {zoneRows(tops).map((r) => (
            <tr key={r.zone}>
              <th scope="row" className="py-1.5 text-left font-semibold">{r.zone}</th>
              <td className="py-1.5 text-right">{zoneRangeText(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
        {[
          ["Pemulihan", targets.recovery],
          ["Easy", targets.easy],
          ["Tempo", targets.tempo],
          ["Norwegian 4×4", targets.norwegian],
          ["Interval", targets.interval],
        ].map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="tabular text-right text-ink">HR {v}</dd>
          </div>
        ))}
      </dl>

      <RpeSection settings={settings} onChange={onChange} />
    </Card>
  );
}

function RefInput({ mode, value, fromIcu, onSave }: { mode: "lthr" | "maxHr"; value?: number; fromIcu?: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(value !== undefined ? String(value) : "");
  const n = draft.trim() === "" ? undefined : Number(draft);
  const error = draft.trim() === "" ? (value === undefined ? `Isi ${mode === "lthr" ? "LTHR" : "HR maks"} lari. Sampai diisi, zona bawaan yang dipakai.` : null) : validateRef(mode, n);
  const label = mode === "lthr" ? "LTHR lari (bpm)" : "HR maks lari (bpm)";
  return (
    <label className="mt-3 block text-[13px] text-muted">
      {label}
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number(e.target.value);
          if (e.target.value.trim() && !validateRef(mode, v)) onSave(v);
        }}
        aria-invalid={!!error}
        className={`${INPUT} mt-1 ${error && draft ? "border-danger" : "border-line-strong"}`}
      />
      <span className={`mt-1 block text-[12px] ${error && draft ? "font-semibold text-danger-ink" : "text-faint"}`}>
        {error ?? (fromIcu !== undefined ? (Number(draft) === fromIcu ? "Dari pengaturan lari intervals.icu." : `intervals.icu: ${fromIcu} bpm.`) : "Tidak ada di intervals.icu, isi sendiri.")}
      </span>
    </label>
  );
}

function ManualTops({ saved, onSave }: { saved: ZoneTops; onSave: (t: ZoneTops) => void }) {
  const [draft, setDraft] = useState<string[]>(saved.map(String));
  const nums = draft.map((d) => (d.trim() === "" ? NaN : Number(d)));
  const errors = validateTops(nums);
  const change = (i: number, v: string) => {
    const next = draft.map((d, j) => (j === i ? v : d));
    setDraft(next);
    const t = next.map(Number) as ZoneTops;
    if (validateTops(t).every((e) => e === null)) onSave(t);
  };
  return (
    <fieldset className="mt-3">
      <legend className="text-[13px] text-muted">Batas atas tiap zona (bpm). Z5 di atas Z4.</legend>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {draft.map((d, i) => (
          <label key={i} className="block text-[13px] text-muted">
            Z{i + 1} sampai
            <input
              type="number"
              inputMode="numeric"
              value={d}
              onChange={(e) => change(i, e.target.value)}
              aria-invalid={!!errors[i]}
              className={`${INPUT} mt-1 ${errors[i] ? "border-danger" : "border-line-strong"}`}
            />
            {errors[i] && <span className="mt-1 block text-[12px] font-semibold text-danger-ink">{errors[i]}</span>}
          </label>
        ))}
      </div>
      {errors.some(Boolean) && <p className="mt-1 text-[12px] text-muted">Belum disimpan. Zona terakhir yang valid tetap dipakai.</p>}
    </fieldset>
  );
}

const LEVELS: Difficulty[] = ["easy", "moderate", "high"];

function RpeSection({ settings, onChange }: { settings: AthleteSettings; onChange: (s: AthleteSettings) => void }) {
  const rpe: StrengthRpe = settings.strengthRpe ?? DEFAULT_STRENGTH_RPE;
  const set = (next: StrengthRpe | undefined) => {
    const { strengthRpe: _old, ...rest } = settings;
    const isDefault = !next || LEVELS.every((d) => next[d] === DEFAULT_STRENGTH_RPE[d]);
    onChange(isDefault ? rest : { ...rest, strengthRpe: next });
  };
  const step = (d: Difficulty, delta: number) => {
    const next = { ...rpe, [d]: rpe[d] + delta };
    if (Object.values(validateStrengthRpe(next)).every((e) => e === null)) set(next);
  };
  const can = (d: Difficulty, delta: number) => Object.values(validateStrengthRpe({ ...rpe, [d]: rpe[d] + delta })).every((e) => e === null);

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="t-label">RPE per level</p>
        {settings.strengthRpe ? (
          <button type="button" onClick={() => set(undefined)} className={RESET}>
            Kembalikan bawaan
          </button>
        ) : (
          <span className="text-[12px] text-faint">bawaan</span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-muted">Lari</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
        {RUN_RPE.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="tabular text-right text-ink">RPE {r.rpe}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] text-muted">
        Strength · {STRENGTH_RPE_MIN} sampai {STRENGTH_RPE_MAX}, tidak pernah lebih dari {STRENGTH_RPE_MAX}. Minggu deload turun satu.
      </p>
      <ul className="mt-1 space-y-1">
        {LEVELS.map((d) => (
          <li key={d} className="flex items-center justify-between gap-2">
            <span className="text-body">{DIFFICULTY_LABEL[d]}</span>
            <span className="flex items-center gap-1">
              <button type="button" aria-label={`Turunkan RPE ${DIFFICULTY_LABEL[d]}`} disabled={!can(d, -1)} onClick={() => step(d, -1)} className="pressable min-h-11 min-w-11 rounded-control border border-line-strong text-body font-semibold disabled:text-faint">
                −
              </button>
              <span className="tabular w-14 text-center text-body font-semibold" aria-live="polite">
                RPE {rpe[d]}
              </span>
              <button type="button" aria-label={`Naikkan RPE ${DIFFICULTY_LABEL[d]}`} disabled={!can(d, 1)} onClick={() => step(d, 1)} className="pressable min-h-11 min-w-11 rounded-control border border-line-strong text-body font-semibold disabled:text-faint">
                +
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
