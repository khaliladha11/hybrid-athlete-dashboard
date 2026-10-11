"use client";

import { useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import type { AthleteSettings } from "@/lib/athlete-settings";
import { BAND_LEVELS, barbellLoads, dumbbellLoads, type Equipment } from "@/lib/equipment";

const INPUT = "min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink tabular focus:border-brand";

/** Angka desimal opsional; disimpan saat fokus lepas supaya bisa mengetik "1," dulu. */
function NumberField({
  label,
  value,
  onSave,
  placeholder,
  suffix,
}: {
  label: string;
  value?: number;
  onSave: (v: number | undefined) => void;
  placeholder?: string;
  suffix?: string;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const parsed = text.trim() === "" ? undefined : Number(text.replace(",", "."));
  const invalid = parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0 || parsed > 200);
  return (
    <label className="block min-w-0 text-[12px] text-muted">
      {label}
      <span className="relative mt-1 block">
        <input
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => !invalid && parsed !== value && onSave(parsed)}
          className={`${INPUT} ${suffix ? "pr-9" : ""} ${invalid ? "border-danger" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-faint">{suffix}</span>}
      </span>
    </label>
  );
}

function LoadList({ label, loads }: { label: string; loads?: number[] }) {
  return (
    <div>
      <p className="text-[12px] text-muted">{label}</p>
      {loads === undefined ? (
        <p className="text-[13px] text-faint">Isi berat handle/batang dulu.</p>
      ) : loads.length ? (
        <p className="tabular text-[13px] text-ink">{loads.map((v) => v.toLocaleString("id-ID")).join(" · ")} kg</p>
      ) : (
        <p className="text-[13px] text-danger-ink">✕ Tidak ada kombinasi.</p>
      )}
    </div>
  );
}

/** Alat yang dimiliki → gerakan yang bisa dipilih generator & beban yang bisa dirakit. */
export function EquipmentSettings({ settings, onChange }: { settings: AthleteSettings; onChange: (s: AthleteSettings) => void }) {
  const eq = settings.equipment;
  const set = (patch: Partial<Equipment>) => onChange({ ...settings, equipment: { ...eq, ...patch } });
  const [other, setOther] = useState("");

  return (
    <Card title="Alat">
      <p className="text-[13px] text-muted">
        Gerakan yang butuh alat yang tidak dimiliki otomatis tidak dipakai. Setelah berat handle/batang diisi, beban yang diresepkan selalu bisa dirakit
        dari plat yang ada.
      </p>

      <div className="mt-4 space-y-4">
        <section className="space-y-3">
          <Switch checked={eq.dumbbell.enabled} onChange={(enabled) => set({ dumbbell: { ...eq.dumbbell, enabled } })} label="Dumbbell modular" />
          {eq.dumbbell.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                key={`h-${eq.dumbbell.handleKg}`}
                label="Berat handle kosong"
                value={eq.dumbbell.handleKg}
                placeholder="mis. 2"
                suffix="kg"
                onSave={(handleKg) => set({ dumbbell: { ...eq.dumbbell, handleKg } })}
              />
              <Segmented
                label="Jumlah handle"
                value={eq.dumbbell.handles >= 2 ? 2 : 1}
                onChange={(handles) => set({ dumbbell: { ...eq.dumbbell, handles } })}
                options={[
                  { value: 1, label: "1" },
                  { value: 2, label: "2" },
                ]}
              />
            </div>
          )}
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <Switch
            checked={eq.barbell.enabled}
            onChange={(enabled) => set({ barbell: { ...eq.barbell, enabled } })}
            label="Barbell mode"
            description="Connecting bar untuk Hip Thrust/Sumo Deadlift & Squat ringan."
          />
          {eq.barbell.enabled && (
            <NumberField
              key={`b-${eq.barbell.barKg}`}
              label="Berat batang kosong (termasuk connector)"
              value={eq.barbell.barKg}
              placeholder="mis. 5"
              suffix="kg"
              onSave={(barKg) => set({ barbell: { ...eq.barbell, barKg } })}
            />
          )}
        </section>

        <section className="border-t border-line pt-4">
          <p className="text-body font-semibold">Plat</p>
          <p className="mt-0.5 text-[13px] text-muted">Jumlah keping per berat. Plat dipasang berpasangan (kiri–kanan) supaya seimbang.</p>
          <ul className="mt-2 space-y-2">
            {eq.plates.map((p, i) => (
              <li key={`${i}-${p.kg}-${p.count}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <NumberField
                  label="Berat"
                  value={p.kg}
                  suffix="kg"
                  onSave={(kg) => kg && set({ plates: eq.plates.map((x, j) => (j === i ? { ...x, kg } : x)) })}
                />
                <NumberField
                  label="Jumlah"
                  value={p.count}
                  suffix="pcs"
                  onSave={(count) => count && set({ plates: eq.plates.map((x, j) => (j === i ? { ...x, count: Math.round(count) } : x)) })}
                />
                <button
                  type="button"
                  aria-label={`Hapus plat ${p.kg} kg`}
                  onClick={() => set({ plates: eq.plates.filter((_, j) => j !== i) })}
                  className="pressable grid h-11 w-11 place-items-center rounded-control text-muted hover:bg-subtle hover:text-danger-ink"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={eq.plates.length >= 12}
            onClick={() => set({ plates: [...eq.plates, { kg: 2.5, count: 2 }] })}
            className={`${BUTTON.base} ${BUTTON.secondary} mt-2 w-full disabled:opacity-40`}
          >
            + Tambah plat
          </button>
          <div className="mt-3 space-y-2 rounded-inner bg-subtle p-3">
            <LoadList label="Bisa dirakit · sepasang dumbbell (per tangan)" loads={eq.dumbbell.enabled ? dumbbellLoads(eq, true) : []} />
            {eq.barbell.enabled && <LoadList label="Bisa dirakit · barbell (total)" loads={barbellLoads(eq)} />}
          </div>
        </section>

        <section className="border-t border-line pt-4">
          <p className="text-body font-semibold">Resistance band</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Band yang dimiliki">
            {BAND_LEVELS.map((b) => {
              const on = eq.bands.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ bands: BAND_LEVELS.filter((x) => (x === b ? !on : eq.bands.includes(x))) })}
                  className={`pressable min-h-11 rounded-control border px-2 text-body ${
                    on ? "border-success bg-success-soft font-semibold text-success-ink" : "border-line-strong bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {b}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 border-t border-line pt-4">
          <Switch checked={eq.pullUpBar} onChange={(pullUpBar) => set({ pullUpBar })} label="Pull-up bar" />
          <Switch checked={eq.bench} onChange={(bench) => set({ bench })} label="Kursi / bench / step box" description="Dinding & lantai dianggap selalu ada." />
        </section>

        <section className="border-t border-line pt-4">
          <p className="text-body font-semibold">Alat lainnya</p>
          <p className="mt-0.5 text-[13px] text-muted">Dicatat dulu; gerakan untuk alat ini akan ditambahkan di pengembangan berikutnya.</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = other.trim();
              if (v && !eq.other.includes(v)) set({ other: [...eq.other, v].slice(0, 20) });
              setOther("");
            }}
          >
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={60}
              placeholder="mis. Kettlebell 8 kg"
              aria-label="Alat lain"
              className={`${INPUT} min-w-0 flex-1`}
            />
            <button type="submit" disabled={!other.trim()} className={`${BUTTON.base} ${BUTTON.secondary} shrink-0 px-3 disabled:opacity-40`}>
              Tambah
            </button>
          </form>
          {eq.other.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {eq.other.map((o) => (
                <li key={o} className="inline-flex items-center gap-1 rounded-full bg-subtle-strong py-0.5 pr-1 pl-2.5 text-[13px]">
                  {o}
                  <button
                    type="button"
                    aria-label={`Hapus ${o}`}
                    onClick={() => set({ other: eq.other.filter((x) => x !== o) })}
                    className="grid h-6 w-6 place-items-center rounded-full text-muted hover:text-danger-ink"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  );
}
