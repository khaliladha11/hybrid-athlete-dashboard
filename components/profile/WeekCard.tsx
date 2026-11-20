"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ShareWeekButton } from "@/components/share/ShareWeekSheet";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale, useT } from "@/lib/i18n/client";
import { PROFILE } from "@/lib/i18n/messages/profile";
import { TRAINING_CARD } from "@/lib/i18n/messages/training-card";
import type { Activity } from "@/lib/intervals/types";
import { PREF_KEYS } from "@/lib/preference-keys";
import { BLOCKS, parseShareOptions, type CardKind } from "@/lib/share-card";
import { useStSessions } from "@/lib/st-session-store";
import { cardAriaLabel, cardElements, weekRunModel, type CardElement, type CardFont, type CardRole } from "@/lib/week-run-card";
import { trainingAriaLabel, trainingCardElements, trainingTableRows } from "@/lib/weekly/training-card";
import { trainingWeek } from "@/lib/weekly/training-week";

/** Peran warna kartu → token tema (layar). Ekspor PNG memakai warna tetap (`lib/share-card.ts`). */
const ROLE: Record<CardRole, string> = {
  ink: "fill-ink",
  dim: "fill-ink opacity-50",
  faint: "fill-ink opacity-30",
  rule: "fill-ink opacity-25",
  brand: "fill-brand",
  ride: "fill-info",
};
const STROKE: Partial<Record<CardRole, string>> = { ink: "stroke-ink", dim: "stroke-ink opacity-50" };

const FONT: Record<CardFont, React.CSSProperties> = {
  display: { fontFamily: "var(--font-sans)", fontStyle: "italic", fontStretch: "75%", fontVariationSettings: "'wdth' 75", fontVariantNumeric: "tabular-nums" },
  sans: { fontFamily: "var(--font-sans)", fontStyle: "normal", fontStretch: "100%", fontVariationSettings: "normal", fontVariantNumeric: "tabular-nums" },
  mono: { fontFamily: "var(--font-mono)", fontStyle: "normal", fontStretch: "100%", fontVariationSettings: "normal" },
};

/** Layout kartu yang sama dengan ekspor PNG, digambar dengan token tema. Arsir indoor lewat pola SVG per kartu. */
export function WeekCardSvg({ elements, ariaLabel, block }: { elements: CardElement[]; ariaLabel: string; block: { x: number; y: number; w: number; h: number } }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hatch = (h: string) => `url(#${id}-hatch-${h})`;
  return (
    <svg viewBox={`${block.x} ${block.y} ${block.w} ${block.h}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
      <defs>
        <pattern id={`${id}-hatch-light`} patternUnits="userSpaceOnUse" width="18" height="18" patternTransform="rotate(45)">
          <rect width="7" height="18" fill="#FFFFFF" fillOpacity={0.5} />
        </pattern>
        <pattern id={`${id}-hatch-ink`} patternUnits="userSpaceOnUse" width="18" height="18" patternTransform="rotate(45)">
          <rect width="5" height="18" className="fill-ink" fillOpacity={0.7} />
        </pattern>
      </defs>
      {elements.map((e) => {
        switch (e.kind) {
          case "rect": {
            if (e.outline) {
              const g = { x: e.x + 2, y: e.y + 2, width: e.w - 4, height: e.h - 4, rx: e.rx - 2 };
              return (
                <g key={e.key}>
                  {e.hatch && <rect {...g} fill={hatch(e.hatch)} />}
                  <rect {...g} fill="none" strokeWidth={4} className={STROKE[e.role] ?? "stroke-ink"} />
                </g>
              );
            }
            const g = { x: e.x, y: e.y, width: e.w, height: e.h, rx: e.rx };
            return (
              <g key={e.key}>
                <rect {...g} className={ROLE[e.role]} />
                {e.hatch && <rect {...g} fill={hatch(e.hatch)} />}
              </g>
            );
          }
          case "circle":
            return <circle key={e.key} cx={e.cx} cy={e.cy} r={e.r} className={ROLE[e.role]} />;
          case "line":
            return <rect key={e.key} x={e.x1} y={e.y - e.width / 2} width={e.x2 - e.x1} height={e.width} className={ROLE[e.role]} />;
          case "text":
            return (
              <text
                key={e.key}
                x={e.x}
                y={e.y}
                fontSize={e.size}
                fontWeight={e.weight}
                textAnchor={e.anchor ?? "start"}
                letterSpacing={e.spacing ? e.spacing * e.size : undefined}
                className={ROLE[e.role]}
                style={FONT[e.font]}
              >
                {e.spans.map((s, i) => (
                  <tspan key={i} dx={s.dx} fontSize={s.size} fontWeight={s.weight} className={s.role ? ROLE[s.role] : undefined} style={s.font ? FONT[s.font] : undefined}>
                    {s.text}
                  </tspan>
                ))}
              </text>
            );
        }
      })}
    </svg>
  );
}

function storedKind(): CardKind {
  try {
    return parseShareOptions(localStorage.getItem(PREF_KEYS.shareCard)).kind;
  } catch {
    return "training";
  }
}

/** Simpan jenis kartu bersama opsi bagikan (satu key), tanpa menyentuh pilihan lain. */
export function storeKind(kind: CardKind) {
  try {
    const prev = JSON.parse(localStorage.getItem(PREF_KEYS.shareCard) ?? "{}") as Record<string, unknown>;
    localStorage.setItem(PREF_KEYS.shareCard, JSON.stringify({ ...prev, kind }));
  } catch {}
}

/**
 * Kartu mingguan di Profil. 1.3.0: "Semua latihan" (bawaan; lari, sepeda, strength, lainnya, dengan sesi ST dari
 * perangkat) atau "Lari" (kartu 1.1.0). Ketuk kartu untuk detail di Tren. "Lihat tabel" dan tombol Bagikan di luar
 * tautan.
 */
export function WeekCard({ activities, today }: { activities: Activity[]; today: string }) {
  const locale = useLocale();
  const t = useT(PROFILE).week;
  const tt = useT(TRAINING_CARD).table;
  const sessions = useStSessions();
  const [kind, setKind] = useState<CardKind>("training");
  const [table, setTable] = useState(false);
  const tableId = useId();
  useEffect(() => setKind(storedKind()), []);

  const training = useMemo(() => trainingWeek(activities, sessions, today), [activities, sessions, today]);
  const run = useMemo(() => weekRunModel(activities, today), [activities, today]);
  const isTraining = kind === "training";
  const elements = isTraining ? trainingCardElements(training, locale) : cardElements(run, locale);
  const aria = isTraining ? trainingAriaLabel(training, locale) : cardAriaLabel(run, locale);
  const change = (k: CardKind) => {
    setKind(k);
    storeKind(k);
  };

  return (
    <section aria-label={isTraining ? t.regionTraining : t.region} className="rounded-card border border-line bg-surface shadow-card">
      <div className="px-4 pt-4">
        <Segmented
          label={t.kind}
          value={kind}
          options={[
            { value: "training", label: t.kindTraining },
            { value: "run", label: t.kindRun },
          ]}
          onChange={change}
        />
      </div>
      <Link href="/insight#minggu-ini" className="pressable block rounded-card px-3 pt-3 hover:bg-subtle/60">
        <WeekCardSvg elements={elements} ariaLabel={`${aria} ${t.openDetail}`} block={BLOCKS[kind]} />
      </Link>
      {isTraining && (
        <div className="px-5">
          <button
            type="button"
            aria-expanded={table}
            aria-controls={tableId}
            onClick={() => setTable((v) => !v)}
            className="pressable inline-flex min-h-11 items-center text-body font-semibold text-brand-ink"
          >
            {table ? tt.hide : tt.show}
          </button>
          {table && (
            <div id={tableId} className="overflow-x-auto pb-2">
              <table className="w-full border-collapse text-left text-[13px] tabular-nums">
                <caption className="sr-only">{tt.caption}</caption>
                <thead>
                  <tr className="border-b border-line">
                    {[tt.day, tt.sport, tt.minutes, tt.where].map((c, i) => (
                      <th key={c} scope="col" className={`t-label py-2 font-normal ${i >= 2 ? "pl-2 text-right" : i ? "pl-2" : ""}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trainingTableRows(training, locale).map((r, ri) => (
                    <tr key={ri} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2 pr-2 font-normal">
                        {r[0]}
                      </th>
                      <td className={`py-2 pl-2 ${r[2] === "·" ? "text-muted" : ""}`}>{r[1]}</td>
                      <td className={`py-2 pl-2 text-right ${r[2] === "·" ? "text-faint" : ""}`}>{r[2]}</td>
                      <td className={`py-2 pl-2 text-right ${r[3] === "·" ? "text-faint" : ""}`}>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-5 pt-1 pb-4">
        <span className="text-[13px] text-muted">{t.hint}</span>
        <ShareWeekButton training={training} run={run} kind={kind} onKindChange={change} />
      </div>
    </section>
  );
}
