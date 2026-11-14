"use client";

import Link from "next/link";
import { Card, Chip } from "@/components/ui/Card";
import { formatClock, formatPaceTag } from "@/components/ui/format";
import { pillClasses } from "@/components/ui/tones";
import { formatDateId } from "@/lib/date";
import type { Program } from "@/lib/program";
import { targetGap, type Confidence, type Prediction } from "@/lib/program/prediction";
import { RACE_DISTANCES } from "@/lib/run-zones";
import { useLocale, useT } from "@/lib/i18n/client";
import { PROGRAM } from "@/lib/i18n/messages/program";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";

const LABEL: Record<string, string> = { "5k": "5K", "10k": "10K", hm: "HM", fm: "FM" };
const km = (m: number, l: Locale) => formatNumber(l, Math.round(m / 100) / 10);

function ConfidenceChip({ c }: { c: Confidence }) {
  const label = useT(PROGRAM).prediction.confidence[c];
  if (c === "rendah") return <Chip>{label}</Chip>;
  return <span className={pillClasses(c === "tinggi" ? "success" : "warning")}>{label}</span>;
}

function sourceText(p: Prediction, l: Locale): string {
  const s = p.source;
  const t = PROGRAM[l].prediction;
  if (s.kind === "race") {
    const label = RACE_DISTANCES.find((d) => d.key === s.distance)?.label ?? s.distance;
    return t.fromRace(label, formatClock(s.seconds), formatDateId(s.date, l));
  }
  return t.fromRun(s.name, km(s.meters, l), formatClock(s.seconds), formatDateId(s.date, l));
}

/**
 * Perkiraan waktu lomba (PROGRAM-HIDUP §4.6, D1): jarak × perkiraan dari VDOT, selisih terhadap target,
 * dan detail sumber dengan pembanding Riegel. Copy selalu "perkiraan", tanpa janji.
 */
export function PredictionCard({ program, prediction: pred }: { program: Program; prediction: Prediction | null }) {
  const race = program.input.race;
  const locale = useLocale();
  const t = useT(PROGRAM).prediction;

  if (!pred) {
    return (
      <Card title={t.title}>
        <p className="text-[14px] text-muted">{t.empty}</p>
        <Link href="/setting#zona" className="mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-ink hover:underline">
          {t.logLink}
        </Link>
      </Card>
    );
  }

  const mine = pred.distances.find((d) => d.distance === race)!;
  const gap = targetGap(mine.seconds, program.input.goalSec, mine.meters);
  return (
    <Card title={t.title} action={<ConfidenceChip c={mine.confidence} />}>
      <ul className="-mx-2 space-y-1">
        {pred.distances.map((d) => {
          const target = d.distance === race;
          return (
            <li key={d.distance} className={`flex min-h-11 items-center gap-3 rounded-inner px-2 ${target ? "bg-subtle" : ""}`}>
              <span className="t-label w-9 shrink-0">{LABEL[d.distance]}</span>
              <span className="tabular text-[17px] font-semibold">{formatClock(d.seconds)}</span>
              <span className="tabular text-[13px] text-muted">{formatPaceTag(d.seconds / (d.meters / 1000))}/km</span>
              <span className="ml-auto">{d.distance === "fm" && d.confidence !== pred.confidence ? <ConfidenceChip c={d.confidence} /> : target ? <Chip tone="accent">{t.program}</Chip> : null}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[14px]">
        <span className="text-muted">{t.target(formatClock(program.input.goalSec))}</span>
        {gap.onTrack ? (
          <span className="font-semibold text-success-ink">{t.onTrack}</span>
        ) : (
          <span className="font-semibold text-ink">{t.faster(gap.secPerKm)}</span>
        )}
      </p>
      <p className="mt-1 text-[12px] text-faint">{t.basis(pred.vdot.toFixed(1))}</p>
      <details className="group mt-3 rounded-inner border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[14px] font-semibold">
          {t.where}
          <span className="text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
            ›
          </span>
        </summary>
        <div className="details-body space-y-2 px-3 pb-3 text-[13px] text-ink">
          <p>{sourceText(pred, locale)}</p>
          <p className="text-muted">
            {t.riegel}{" "}
            <span className="tabular">{pred.distances.map((d) => `${LABEL[d.distance]} ${formatClock(d.riegelSeconds)}`).join(" · ")}</span>
          </p>
          <p className="text-muted">
            {t.marathon} {pred.longestRunKm !== undefined ? `${formatNumber(locale, pred.longestRunKm)} km` : "·"}
            {pred.fmLimited ? t.fmLimited : "."}
          </p>
          {pred.source.kind === "activity" && (
            <p className="text-muted">
              {t.logFor}{" "}
              <Link href="/setting#zona" className="font-semibold text-brand-ink hover:underline">
                {t.zoneLink}
              </Link>{" "}
              {t.moreSure}
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}
