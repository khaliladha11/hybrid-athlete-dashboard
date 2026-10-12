"use client";

import { useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { CONDITION_IDS, CONDITIONS, type ConditionId } from "@/lib/conditions";
import type { AthleteSettings } from "@/lib/athlete-settings";

/** Kondisi dari katalog berbasis riset (memengaruhi generator) + catatan bebas (tampil saja). */
export function ConditionsSettings({
  settings,
  onChange,
  warnings,
}: {
  settings: AthleteSettings;
  onChange: (s: AthleteSettings) => void;
  warnings: string[];
}) {
  const [draft, setDraft] = useState("");
  const active = new Set(settings.conditions);
  const toggle = (id: ConditionId, on: boolean) =>
    onChange({ ...settings, conditions: CONDITION_IDS.filter((c) => (c === id ? on : active.has(c))) });
  const addNote = () => {
    const v = draft.trim();
    if (!v || settings.customConditions.includes(v)) return;
    onChange({ ...settings, customConditions: [...settings.customConditions, v].slice(0, 20) });
    setDraft("");
  };

  return (
    <Card title="Kondisi & batasan" action={<span className="text-[12px] text-faint">{active.size} aktif</span>}>
      <p className="text-[13px] text-muted">
        Kondisi aktif mengubah hasil generator lari & ST. Aturan umum (RPE ≤ 7, beban ≤ alat, long run ≤ 10%/minggu) selalu berlaku.
      </p>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-2">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2 rounded-inner bg-danger-soft px-3 py-2 text-[13px] text-ink">
              <span aria-hidden className="font-semibold text-danger-ink">
                ✕
              </span>
              {w}
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-2 divide-y divide-line">
        {CONDITION_IDS.map((id) => {
          const c = CONDITIONS[id];
          return (
            <li key={id} className="py-3">
              <Switch checked={active.has(id)} onChange={(on) => toggle(id, on)} label={c.label} description={c.effect} />
              <details className="group mt-1">
                <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">
                  Sumber ({c.sources.length})
                  <span className="transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                    ›
                  </span>
                </summary>
                <ul className="details-body mt-1 space-y-1 border-l-2 border-line pl-3 text-[12px] text-muted">
                  {c.sources.map((s) => (
                    <li key={s.label}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 border-t border-line pt-4">
        <p className="text-body font-semibold">Catatan kondisi lain</p>
        <p className="mt-0.5 text-[13px] text-muted">
          Tampil di catatan setiap workout, tapi tidak mengubah generator. Untuk kondisi di luar katalog, konsultasikan dengan tenaga medis.
        </p>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addNote();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={120}
            placeholder="mis. Pergelangan tangan kiri mudah pegal"
            aria-label="Catatan kondisi baru"
            className="min-h-11 min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand"
          />
          <button type="submit" disabled={!draft.trim()} className={`${BUTTON.base} ${BUTTON.secondary} shrink-0 px-3 disabled:opacity-40`}>
            Tambah
          </button>
        </form>
        {settings.customConditions.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {settings.customConditions.map((c) => (
              <li key={c} className="flex items-center gap-2 rounded-inner bg-subtle py-1.5 pr-1.5 pl-3 text-[14px]">
                <span className="min-w-0 flex-1">{c}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, customConditions: settings.customConditions.filter((x) => x !== c) })}
                  aria-label={`Hapus catatan: ${c}`}
                  className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-control text-muted hover:bg-subtle-strong hover:text-danger-ink"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
