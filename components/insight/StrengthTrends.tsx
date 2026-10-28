"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { ChartCard, Swatch } from "@/components/charts/ChartCard";
import { LineChart } from "@/components/charts/LineChart";
import { LEVEL_OPACITY, MuscleMap } from "@/components/charts/MuscleMap";
import { Segmented } from "@/components/ui/Segmented";
import { MOVEMENT_CATEGORIES } from "@/lib/athlete-settings";
import { int, num1 } from "@/lib/insight/format";
import { heatSummary, movementsFor, muscleHeat, musclesOfRegion, rarelyTrained, regionsOfMuscles, type MuscleMode } from "@/lib/insight/muscle-load";
import { MARKER_LABEL, movementsWithLoad, prSeries, prSummary, type StageMarker } from "@/lib/insight/pr-trend";
import { PATTERN_LABEL, auSummary, patternSummary, type StrengthWeek, type WorkSet } from "@/lib/insight/strength-trends";
import { weekLabel } from "@/lib/insight/weeks";
import type { MuscleRegion } from "@/lib/movements/muscle-regions";
import type { MovementCategory, ResolvedProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import type { PrEntry } from "@/lib/prs";

const weekRow = (r: { start: string; current: boolean }) => `${weekLabel(r.start)}${r.current ? " (minggu ini)" : ""}`;
const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLabel = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`)).replace(".", "");
const fmt = (v: number) => num1(v).replace(",0", "");

/** #4 Volume ST per pola + beban session-RPE mingguan. */
export function StrengthVolume({ rows }: { rows: StrengthWeek[] }) {
  const [cat, setCat] = useState<MovementCategory>("lower");
  const s = patternSummary(rows, cat);
  const au = auSummary(rows);
  const current = rows.findIndex((r) => r.current);
  return (
    <>
      <ChartCard
        title="Volume ST per pola"
        summary={s.text}
        drawable={s.drawable}
        legend={
          <>
            <Swatch className="bg-brand" label="Set per minggu" />
            {rows.some((r) => r.estimated) && <span>* perkiraan (hanya gerakan ★)</span>}
          </>
        }
        table={{
          columns: ["Minggu", "Set", "kg × rep", "Detik", "Rep"],
          rows: [...rows].reverse().map((r) => {
            const v = r.patterns[cat];
            return [`${weekRow(r)}${r.estimated ? " *" : ""}`, String(v.sets), v.kg ? int(v.kg) : undefined, v.sec ? int(v.sec) : undefined, v.reps ? int(v.reps) : undefined];
          }),
        }}
        header={
          <Segmented
            label="Pola gerakan"
            value={cat}
            wrap
            options={MOVEMENT_CATEGORIES.map((c) => ({ value: c, label: PATTERN_LABEL[c] }))}
            onChange={setCat}
          />
        }
      >
        <BarChart
          ariaLabel={`Grafik batang set ${PATTERN_LABEL[cat]} per minggu. ${s.text}`}
          labels={rows.map((r) => weekLabel(r.start))}
          stacks={[{ values: rows.map((r) => r.patterns[cat].sets), tone: "brand" }]}
          marks={rows.map((r) => (r.estimated && r.patterns[cat].sets ? "*" : undefined))}
          partial={current >= 0 ? current : undefined}
          integer
        />
      </ChartCard>
      <ChartCard
        title="Beban ST (session-RPE)"
        summary={au.text}
        drawable={au.drawable}
        legend={<Swatch className="bg-brand" label="AU per minggu" line />}
        table={{
          columns: ["Minggu", "AU", "Sesi"],
          rows: [...rows].reverse().map((r) => [weekRow(r), r.au === undefined ? undefined : int(r.au), String(r.stSessions)]),
        }}
      >
        <LineChart
          ariaLabel={`Grafik beban ST session-RPE per minggu. ${au.text}`}
          labels={rows.map((r) => weekLabel(r.start))}
          series={[{ values: rows.map((r) => r.au), tone: "brand", dots: true }]}
        />
      </ChartCard>
    </>
  );
}

/** #5 Heatmap otot 7/30 hari, frekuensi/volume, otot jarang dilatih, ketuk otot → gerakan tersedia. */
export function MuscleHeatmap({ work, today, available }: { work: WorkSet[]; today: string; available: string[] }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [mode, setMode] = useState<MuscleMode>("frequency");
  const [picked, setPicked] = useState<string | null>(null);
  const heat = useMemo(() => muscleHeat(work, today, days, mode), [work, today, days, mode]);
  const rare = useMemo(() => rarelyTrained(work, available, today), [work, available, today]);
  const s = heatSummary(heat, days, mode);
  const dashed = (rare ? regionsOfMuscles(rare) : []).filter((r) => !heat.levels[r]);
  const pick = (m: string) => setPicked((cur) => (cur === m ? null : m));
  const onRegion = (r: MuscleRegion) => {
    const ms = musclesOfRegion(r);
    setPicked(ms.find((m) => heat.muscles.some((x) => x.muscle === m)) ?? ms[0] ?? null);
  };
  const unit = mode === "frequency" ? "sesi" : "set";

  return (
    <ChartCard
      title="Heatmap otot"
      summary={s.text}
      drawable={s.drawable}
      header={
        <div className="space-y-3">
          <Segmented label="Rentang" value={days} options={[{ value: 7, label: "7 hari" }, { value: 30, label: "30 hari" }]} onChange={(v) => setDays(v)} />
          <Segmented label="Ukuran" value={mode} options={[{ value: "frequency", label: "Frekuensi" }, { value: "volume", label: "Volume" }]} onChange={setMode} />
        </div>
      }
      table={{ columns: ["Otot", mode === "frequency" ? "Sesi berbobot" : "Set berbobot"], rows: heat.muscles.map((m) => [m.muscle, fmt(m.score)]) }}
    >
      <MuscleMap levels={heat.levels} dashed={dashed} onSelect={onRegion} label={`Heatmap otot ${days} hari. ${s.text}`} />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
        {heat.legend.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-brand" style={{ opacity: LEVEL_OPACITY[i + 1] }} />≤ {fmt(v)}
          </span>
        ))}
        {dashed.length > 0 && <Swatch className="border border-dashed border-ink" label="Jarang dilatih" />}
        <span>Utama 1, sekunder 0,5 per {unit}</span>
      </div>
      <div className="mt-4 space-y-3">
        <MuscleButtons title={`Dilatih ${days} hari terakhir`} muscles={heat.muscles.map((m) => ({ name: m.muscle, note: fmt(m.score) }))} picked={picked} onPick={pick} />
        {rare === null ? (
          <p className="text-[13px] text-muted">Belum ada sesi ST 14 hari terakhir, jadi otot jarang dilatih belum dinilai.</p>
        ) : rare.length ? (
          <MuscleButtons title="Tanpa kerja utama 14 hari" muscles={rare.map((m) => ({ name: m }))} picked={picked} onPick={pick} dashed />
        ) : (
          <p className="text-[13px] text-muted">Semua otot yang bisa dilatih dengan alatmu kena kerja utama dalam 14 hari.</p>
        )}
        {picked && <MovementsForMuscle muscle={picked} available={available} />}
      </div>
    </ChartCard>
  );
}

function MuscleButtons({
  title,
  muscles,
  picked,
  onPick,
  dashed = false,
}: {
  title: string;
  muscles: { name: string; note?: string }[];
  picked: string | null;
  onPick: (m: string) => void;
  dashed?: boolean;
}) {
  if (!muscles.length) return null;
  return (
    <div>
      <h3 className="t-label mb-1.5">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {muscles.map((m) => (
          <li key={m.name}>
            <button
              type="button"
              aria-pressed={picked === m.name}
              onClick={() => onPick(m.name)}
              className={`pressable inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-[13px] ${dashed ? "border-dashed border-ink" : "border-line-strong"} ${picked === m.name ? "bg-brand-soft text-brand-ink" : "bg-surface text-ink"}`}
            >
              {m.name}
              {m.note && <span className="font-mono text-[11px] tabular-nums text-muted">{m.note}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MovementsForMuscle({ muscle, available }: { muscle: string; available: string[] }) {
  const r = movementsFor(muscle, available);
  return (
    <div className="rounded-inner border border-line p-3" aria-live="polite">
      <h3 className="text-[15px] font-semibold">{muscle}</h3>
      {!r.primary.length && !r.secondary.length ? (
        <p className="mt-1 text-[13px] text-muted">Belum ada gerakan tersedia untuk otot ini dengan alat dan kondisi sekarang. Lihat Setting › Alat.</p>
      ) : (
        <dl className="mt-1 space-y-1 text-[13px]">
          {r.primary.length > 0 && (
            <div>
              <dt className="t-label inline">Utama: </dt>
              <dd className="inline">{r.primary.join(", ")}</dd>
            </div>
          )}
          {r.secondary.length > 0 && (
            <div>
              <dt className="t-label inline">Sekunder: </dt>
              <dd className="inline">{r.secondary.join(", ")}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

const MARK_LETTER: Record<StageMarker, string> = { rep: "R", tempo: "T", variant: "V" };

/** #8 Tren PR per gerakan dengan penanda tahap progresi. */
export function PrTrend({ prs, log, capOf }: { prs: PrEntry[]; log: LogEntry[]; capOf: (movement: string) => number | undefined }) {
  const movements = useMemo(() => movementsWithLoad(prs, log), [prs, log]);
  const [chosen, setChosen] = useState<string | null>(null);
  // Awal: gerakan terbaru yang sudah punya ≥ 2 catatan beban (tren bisa digambar).
  const firstDrawable = useMemo(() => movements.find((m) => prSeries(m, prs, log).points.filter((p) => !p.carried).length >= 2), [movements, prs, log]);
  const movement = chosen && movements.includes(chosen) ? chosen : (firstDrawable ?? movements[0]);
  if (!movement) {
    return (
      <ChartCard title="Tren PR" summary="Belum ada PR atau log ★ berbeban. Tren muncul setelah sesi dengan beban dicatat." drawable={false} table={{ columns: [], rows: [] }}>
        {null}
      </ChartCard>
    );
  }
  const series = prSeries(movement, prs, log, capOf(movement));
  const s = prSummary(series);
  return (
    <ChartCard
      title="Tren PR"
      summary={s.text}
      drawable={s.drawable}
      header={
        <label className="block">
          <span className="t-label mb-2 block">Gerakan</span>
          <select
            value={movement}
            onChange={(e) => setChosen(e.target.value)}
            className="min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink"
          >
            {movements.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      }
      legend={
        <>
          <Swatch className="bg-brand" label="Beban terbaik" line />
          {series.capKg !== undefined && <Swatch className="bg-ink" label={`Batas alat ${fmt(series.capKg)} kg`} line />}
          <span>R rep naik · T tempo/jeda · V varian</span>
        </>
      }
      table={{
        columns: ["Tanggal", "Beban", "Rep", "Tahap"],
        rows: [...series.points].reverse().map((p) => [
          dayLabel(p.date),
          p.carried ? undefined : `${fmt(p.load)} kg`,
          p.reps ? String(p.reps) : undefined,
          p.markers.length ? p.markers.map((m) => MARKER_LABEL[m]).join(", ") : undefined,
        ]),
      }}
    >
      <LineChart
        ariaLabel={`Grafik beban terbaik ${movement} per catatan. ${s.text}`}
        labels={series.points.map((p) => dayLabel(p.date))}
        series={[
          {
            values: series.points.map((p) => p.load),
            tone: "brand",
            dots: series.points.map((p) => (p.carried ? "thin" : "filled")),
            marks: series.points.map((p) => (p.markers.length ? p.markers.map((m) => MARK_LETTER[m]).join("") : undefined)),
          },
        ]}
        target={series.capKg}
        yFormat={(v) => fmt(v)}
      />
    </ChartCard>
  );
}

/** Gerakan library yang tersedia sekarang (alat + kondisi + pilihan). */
export const availableMovements = (p: ResolvedProfile) => MOVEMENT_CATEGORIES.flatMap((c) => (p.movementLibrary[c] ?? []).filter((m) => m.available !== false).map((m) => m.name));
