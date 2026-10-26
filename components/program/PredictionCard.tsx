"use client";

import Link from "next/link";
import { Card, Chip } from "@/components/ui/Card";
import { formatClock, formatPaceTag } from "@/components/ui/format";
import { pillClasses } from "@/components/ui/tones";
import { formatDateId } from "@/lib/date";
import type { Program } from "@/lib/program";
import { targetGap, type Confidence, type Prediction } from "@/lib/program/prediction";
import { RACE_DISTANCES } from "@/lib/run-zones";

const LABEL: Record<string, string> = { "5k": "5K", "10k": "10K", hm: "HM", fm: "FM" };
const CONFIDENCE_LABEL: Record<Confidence, string> = { tinggi: "Yakin tinggi", sedang: "Yakin sedang", rendah: "Yakin rendah" };
const km = (m: number) => (Math.round(m / 100) / 10).toLocaleString("id-ID");

function ConfidenceChip({ c }: { c: Confidence }) {
  if (c === "rendah") return <Chip>{CONFIDENCE_LABEL[c]}</Chip>;
  return <span className={pillClasses(c === "tinggi" ? "success" : "warning")}>{CONFIDENCE_LABEL[c]}</span>;
}

function sourceText(p: Prediction): string {
  const s = p.source;
  if (s.kind === "race") {
    const label = RACE_DISTANCES.find((d) => d.key === s.distance)?.label ?? s.distance;
    return `Hasil lomba ${label} ${formatClock(s.seconds)} · ${formatDateId(s.date)}.`;
  }
  return `Lari "${s.name}" ${km(s.meters)} km dalam ${formatClock(s.seconds)} · ${formatDateId(s.date)}. Lari latihan biasanya lebih lambat dari kemampuan lomba, jadi perkiraan ini cenderung hati-hati.`;
}

/**
 * Perkiraan waktu lomba (PROGRAM-HIDUP §4.6, D1): jarak × perkiraan dari VDOT, selisih terhadap target,
 * dan detail sumber dengan pembanding Riegel. Copy selalu "perkiraan", tanpa janji.
 */
export function PredictionCard({ program, prediction: pred }: { program: Program; prediction: Prediction | null }) {
  const race = program.input.race;

  if (!pred) {
    return (
      <Card title="Perkiraan waktu lomba">
        <p className="text-[14px] text-muted">Belum ada hasil lomba atau lari ≥ 3 km dalam 90 hari terakhir.</p>
        <Link href="/setting#zona" className="mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-ink hover:underline">
          Catat hasil lomba di Setting › Zona
        </Link>
      </Card>
    );
  }

  const mine = pred.distances.find((d) => d.distance === race)!;
  const gap = targetGap(mine.seconds, program.input.goalSec, mine.meters);
  return (
    <Card title="Perkiraan waktu lomba" action={<ConfidenceChip c={mine.confidence} />}>
      <ul className="-mx-2 space-y-1">
        {pred.distances.map((d) => {
          const target = d.distance === race;
          return (
            <li key={d.distance} className={`flex min-h-11 items-center gap-3 rounded-inner px-2 ${target ? "bg-subtle" : ""}`}>
              <span className="t-label w-9 shrink-0">{LABEL[d.distance]}</span>
              <span className="tabular text-[17px] font-semibold">{formatClock(d.seconds)}</span>
              <span className="tabular text-[13px] text-muted">{formatPaceTag(d.seconds / (d.meters / 1000))}/km</span>
              <span className="ml-auto">{d.distance === "fm" && d.confidence !== pred.confidence ? <ConfidenceChip c={d.confidence} /> : target ? <Chip tone="accent">Program</Chip> : null}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[14px]">
        <span className="text-muted">Target {formatClock(program.input.goalSec)}: </span>
        {gap.onTrack ? (
          <span className="font-semibold text-success-ink">di jalur</span>
        ) : (
          <span className="font-semibold text-ink">perlu {gap.secPerKm}&quot;/km lebih cepat</span>
        )}
      </p>
      <p className="mt-1 text-[12px] text-faint">Perkiraan dari VDOT {pred.vdot.toFixed(1)}, bukan janji. Cuaca, rute, dan kondisi hari lomba ikut menentukan.</p>
      <details className="group mt-3 rounded-inner border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[14px] font-semibold">
          Dari mana angka ini
          <span className="text-[13px] text-faint transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
            ›
          </span>
        </summary>
        <div className="details-body space-y-2 px-3 pb-3 text-[13px] text-ink">
          <p>{sourceText(pred)}</p>
          <p className="text-muted">
            Pembanding Riegel:{" "}
            <span className="tabular">{pred.distances.map((d) => `${LABEL[d.distance]} ${formatClock(d.riegelSeconds)}`).join(" · ")}</span>
          </p>
          <p className="text-muted">
            Maraton butuh volume long run memadai. Long run terjauh 30 hari: {pred.longestRunKm !== undefined ? `${pred.longestRunKm.toLocaleString("id-ID")} km` : "·"}
            {pred.fmLimited ? ", jadi keyakinan maraton paling tinggi rendah." : "."}
          </p>
          {pred.source.kind === "activity" && (
            <p className="text-muted">
              Catat hasil lomba atau time trial di{" "}
              <Link href="/setting#zona" className="font-semibold text-brand-ink hover:underline">
                Setting › Zona
              </Link>{" "}
              untuk perkiraan yang lebih yakin.
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}
