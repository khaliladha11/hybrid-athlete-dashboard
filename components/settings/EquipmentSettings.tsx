"use client";

import { useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import type { AthleteSettings } from "@/lib/athlete-settings";
import { BAND_LEVELS, ITEM_LABEL, MAX_ITEMS, barbellLoads, dumbbellLoads, type Equipment, type EquipmentItemKind } from "@/lib/equipment";
import { LoadRuleNotice } from "@/components/strength/LoadRuleNotice";
import { useLocale, useT } from "@/lib/i18n/client";
import { SETTINGS } from "@/lib/i18n/messages/settings";
import { formatNumber } from "@/lib/i18n/format";

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
  const locale = useLocale();
  const t = useT(SETTINGS).equipment;
  return (
    <div>
      <p className="text-[12px] text-muted">{label}</p>
      {loads === undefined ? (
        <p className="text-[13px] text-faint">{t.fillFirst}</p>
      ) : loads.length ? (
        <p className="tabular text-[13px] text-ink">{loads.map((v) => formatNumber(locale, v)).join(" · ")} kg</p>
      ) : (
        <p className="text-[13px] text-danger-ink">{t.noCombo}</p>
      )}
    </div>
  );
}

/** Alat yang dimiliki → gerakan yang bisa dipilih generator & beban yang bisa dirakit. */
export function EquipmentSettings({ settings, onChange }: { settings: AthleteSettings; onChange: (s: AthleteSettings) => void }) {
  const eq = settings.equipment;
  const set = (patch: Partial<Equipment>) => onChange({ ...settings, equipment: { ...eq, ...patch } });
  const [other, setOther] = useState("");
  const t = useT(SETTINGS).equipment;

  return (
    <Card title={t.title}>
      <p className="text-[13px] text-muted">{t.intro}</p>

      <div className="mt-4 space-y-4">
        <section className="space-y-3">
          <p className="text-body font-semibold">{t.loadLimit}</p>
          <LoadRuleNotice inset />
          {settings.loadRule?.acceptedAt && (
            <Switch
              checked={!!settings.loadRule.limitToLibrary}
              onChange={(limitToLibrary) => onChange({ ...settings, loadRule: { ...settings.loadRule, limitToLibrary } })}
              label={t.limitLibrary}
              description={t.limitLibraryDesc}
            />
          )}
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <Switch checked={eq.dumbbell.enabled} onChange={(enabled) => set({ dumbbell: { ...eq.dumbbell, enabled } })} label={t.dumbbell} />
          {eq.dumbbell.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                key={`h-${eq.dumbbell.handleKg}`}
                label={t.handleKg}
                value={eq.dumbbell.handleKg}
                placeholder={t.eg("2")}
                suffix="kg"
                onSave={(handleKg) => set({ dumbbell: { ...eq.dumbbell, handleKg } })}
              />
              <Segmented
                label={t.handles}
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
            label={t.barbell}
            description={t.barbellDesc}
          />
          {eq.barbell.enabled && (
            <NumberField
              key={`b-${eq.barbell.barKg}`}
              label={t.barKg}
              value={eq.barbell.barKg}
              placeholder={t.eg("5")}
              suffix="kg"
              onSave={(barKg) => set({ barbell: { ...eq.barbell, barKg } })}
            />
          )}
        </section>

        <section className="border-t border-line pt-4">
          <p className="text-body font-semibold">{t.plates}</p>
          <p className="mt-0.5 text-[13px] text-muted">{t.platesDesc}</p>
          <ul className="mt-2 space-y-2">
            {eq.plates.map((p, i) => (
              <li key={`${i}-${p.kg}-${p.count}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <NumberField
                  label={t.weight}
                  value={p.kg}
                  suffix="kg"
                  onSave={(kg) => kg && set({ plates: eq.plates.map((x, j) => (j === i ? { ...x, kg } : x)) })}
                />
                <NumberField
                  label={t.count}
                  value={p.count}
                  suffix="pcs"
                  onSave={(count) => count && set({ plates: eq.plates.map((x, j) => (j === i ? { ...x, count: Math.round(count) } : x)) })}
                />
                <button
                  type="button"
                  aria-label={t.removePlate(p.kg)}
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
            {t.addPlate}
          </button>
          <div className="mt-3 space-y-2 rounded-inner bg-subtle p-3">
            <LoadList label={t.pairLoads} loads={eq.dumbbell.enabled || eq.items.some((i) => i.kind === "fixedDumbbell") ? dumbbellLoads(eq, true) : []} />
            {eq.barbell.enabled && <LoadList label={t.barLoads} loads={barbellLoads(eq)} />}
          </div>
        </section>

        <section className="border-t border-line pt-4">
          <p className="text-body font-semibold">{t.fixed}</p>
          <p className="mt-0.5 text-[13px] text-muted">{t.fixedDesc}</p>
          <ul className="mt-2 space-y-2">
            {eq.items.map((it) => (
              <li key={it.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <p className="pb-3 text-[14px] font-semibold">{ITEM_LABEL[it.kind]}</p>
                <NumberField
                  label={t.weight}
                  value={it.kg}
                  suffix="kg"
                  onSave={(kg) => kg && set({ items: eq.items.map((x) => (x.id === it.id ? { ...x, kg } : x)) })}
                />
                <NumberField
                  label={t.count}
                  value={it.count}
                  suffix="pcs"
                  onSave={(count) => count && set({ items: eq.items.map((x) => (x.id === it.id ? { ...x, count: Math.round(count) } : x)) })}
                />
                <button
                  type="button"
                  aria-label={t.removeItem(ITEM_LABEL[it.kind], it.kg)}
                  onClick={() => set({ items: eq.items.filter((x) => x.id !== it.id) })}
                  className="pressable grid h-11 w-11 place-items-center rounded-control text-muted hover:bg-subtle hover:text-danger-ink"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["fixedDumbbell", "kettlebell"] as EquipmentItemKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={eq.items.length >= MAX_ITEMS}
                onClick={() => set({ items: [...eq.items, { id: `${kind}-${Date.now().toString(36)}`, kind, kg: kind === "kettlebell" ? 8 : 5, count: kind === "kettlebell" ? 1 : 2 }] })}
                className={`${BUTTON.base} ${BUTTON.secondary} disabled:opacity-40`}
              >
                + {ITEM_LABEL[kind]}
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-line pt-4">
          <p className="text-body font-semibold">Resistance band</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label={t.bands}>
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
          <div className="mt-4">
            <Switch
              checked={eq.bandAnchor}
              onChange={(bandAnchor) => set({ bandAnchor })}
              label={t.anchor}
              description={t.anchorDesc}
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-line pt-4">
          <Switch checked={eq.pullUpBar} onChange={(pullUpBar) => set({ pullUpBar })} label="Pull-up bar" />
          <Switch checked={eq.bench} onChange={(bench) => set({ bench })} label={t.bench} description={t.benchDesc} />
        </section>

        <section className="border-t border-line pt-4">
          <p className="text-body font-semibold">{t.other}</p>
          <p className="mt-0.5 text-[13px] text-muted">{t.otherDesc}</p>
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
              placeholder={t.otherPlaceholder}
              aria-label={t.otherLabel}
              className={`${INPUT} min-w-0 flex-1`}
            />
            <button type="submit" disabled={!other.trim()} className={`${BUTTON.base} ${BUTTON.secondary} shrink-0 px-3 disabled:opacity-40`}>
              {t.add}
            </button>
          </form>
          {eq.other.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {eq.other.map((o) => (
                <li key={o} className="inline-flex items-center gap-1 rounded-full bg-subtle-strong py-0.5 pr-1 pl-2.5 text-[13px]">
                  {o}
                  <button
                    type="button"
                    aria-label={t.remove(o)}
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
