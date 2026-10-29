"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, formatTimeOfDay, startOfWeekMonday } from "@/lib/date";
import { CATEGORY_LABEL, formatDuration, formatPace } from "@/lib/intervals/summary";
import { SessionStatusChip, sessionNote } from "@/components/program/SessionStatusChip";
import { INTENSITY_TONE, TONES } from "@/components/ui/tones";
import { isHardRun } from "@/lib/coach";
import { calendarItems, planMarker, type CalendarItem, type PlanMarker } from "@/lib/calendar";
import type { Activity, ActivityCategory } from "@/lib/intervals/types";
import type { PlannedSession } from "@/lib/program/sessions";
import { useProgramPlan } from "@/lib/program/use-program-plan";
import { useStSessions } from "@/lib/st-session-store";
import { useTrainingLog } from "@/lib/training-log";

/** Ikon garis 24×24 per kategori. */
const CATEGORY_ICON: Record<ActivityCategory, string> = {
  run: "M3 17h14.5a3.5 3.5 0 0 0 3.5-3.5l-6.5-1.5-3-4-3 1.2-1 3-4.5 1V17Zm0 0v2h18",
  walk: "M13 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M9.5 21l2-6 3 2v4m-7-9 3-3 3 1 2 3 3 1",
  strength: "M3 10v4m3-6v8m0-4h12m0-4v8m3-6v4",
  ride: "M2 17a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0m13 0a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M5.5 17 9 10h6l3.5 7M12 17l-3-7m5-4h2l1 4",
  other: "M12 4v4m0 8v4M4 12h4m8 0h4M6.5 6.5l2.5 2.5m6 6 2.5 2.5m0-11L15 9m-6 6-2.5 2.5",
};

/** Aktivitas selesai = oranye (aturan "rencana = warna intensitas, selesai = oranye"). */
const DONE_FILL = "bg-brand text-on-brand";
const STRENGTH_ICON = "M3 10v4m3-6v8m0-4h12m0-4v8m3-6v4";

/**
 * Tampilan sel untuk hari tanpa aktivitas tetapi ada sesi rencana (0.14.3): hanya penanda, tidak pernah oranye.
 * Sesi yang sudah dipenuhi di hari lain tampil redup dengan centang netral; yang lewat & belum dikerjakan netral.
 */
function planCell(s: PlannedSession, m: PlanMarker): { className: string; mark?: "check" } {
  switch (m) {
    case "fulfilled":
      return { className: "border border-line text-faint", mark: "check" };
    case "skipped":
      return { className: "border border-line text-faint line-through" };
    case "open":
      return { className: "border border-dashed border-line-strong text-muted" };
    default:
      return { className: `border-2 ${s.kind.startsWith("st-") ? "border-line-strong" : TONES[INTENSITY_TONE[s.intensity]].border} text-ink` };
  }
}

const WEEKDAYS = ["S", "S", "R", "K", "J", "S", "M"];
const MONTH_FMT = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const DAY_TITLE_FMT = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const utc = (date: string) => new Date(`${date}T00:00:00Z`);

function shiftMonth(month: string, delta: number): string {
  const d = utc(month);
  d.setUTCMonth(d.getUTCMonth() + delta, 1);
  return d.toISOString().slice(0, 10);
}

/** Minggu (Senin–Minggu) yang menutupi seluruh bulan `month` (YYYY-MM-01). */
function monthWeeks(month: string): string[][] {
  const next = shiftMonth(month, 1);
  const weeks: string[][] = [];
  for (let start = startOfWeekMonday(month); start < next; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

export function ActivityCalendar({ activities: serverActivities, today, oldest }: { activities: Activity[]; today: string; oldest: string }) {
  // Program tersimpan: aktivitas sejak awal program (diambil sekali bila perlu) + sesi rencana & statusnya.
  const plan = useProgramPlan({ activities: serverActivities, oldest, today });
  const activities = plan.activities;
  const stSessions = useStSessions();
  const log = useTrainingLog();
  const showPlan = plan.saved && !!plan.program && !plan.loading;
  const planByDate = useMemo(() => {
    const map = new Map<string, PlannedSession[]>();
    if (!showPlan) return map;
    // Sesi arsip (0.13.3) ikut tampil sebagai riwayat.
    for (const s of [...plan.archived.flatMap((a) => a.sessions), ...plan.sessions]) map.set(s.plannedDate, [...(map.get(s.plannedDate) ?? []), s]);
    return map;
  }, [showPlan, plan.sessions, plan.archived]);

  // Aktivitas (termasuk ST lokal) selalu di tanggal aslinya (0.14.3).
  const byDate = useMemo(() => calendarItems(activities, stSessions, log.map((e) => e.date)), [activities, stSessions, log]);

  const currentMonth = `${today.slice(0, 7)}-01`;
  // Navigasi sepanjang rentang program (awal program sampai bulan lomba), minimal 2 bulan terakhir.
  const programStart = showPlan ? `${[plan.program!.input.startDate, ...plan.archived.map((a) => a.archive.startDate)].sort()[0].slice(0, 7)}-01` : null;
  const raceMonth = showPlan ? `${plan.program!.raceDate.slice(0, 7)}-01` : null;
  const firstMonth = programStart && programStart < `${oldest.slice(0, 7)}-01` ? programStart : `${oldest.slice(0, 7)}-01`;
  const lastMonth = raceMonth && raceMonth > currentMonth ? raceMonth : currentMonth;
  const [month, setMonth] = useState(currentMonth);
  // Default: hari ini bila ada aktivitas, kalau tidak hari terakhir yang ada aktivitasnya.
  const [selected, setSelected] = useState(() => {
    if (byDate.has(today)) return today;
    return [...byDate.keys()].filter((d) => d <= today).sort().at(-1) ?? today;
  });

  const weeks = monthWeeks(month);
  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7);
  const monthItems = [...byDate.entries()].filter(([d]) => inMonth(d)).flatMap(([, list]) => list);
  const runKm = monthItems.reduce((s, i) => s + (i.kind === "activity" && i.activity.category === "run" ? (i.activity.distanceKm ?? 0) : 0), 0);
  const selectedList = byDate.get(selected) ?? [];
  const selectedPlan = planByDate.get(selected) ?? [];

  const go = (delta: number) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    // Pilih hari terakhir yang ada aktivitas di bulan baru (atau tanggal 1).
    const days = [...byDate.keys()].filter((d) => d.slice(0, 7) === next.slice(0, 7) && d <= today).sort();
    const planned = [...planByDate.keys()].filter((d) => d.slice(0, 7) === next.slice(0, 7)).sort();
    setSelected(days.at(-1) ?? (next.slice(0, 7) === today.slice(0, 7) ? today : (planned[0] ?? next)));
  };

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold capitalize">{MONTH_FMT.format(utc(month))}</h2>
        <div className="flex gap-1">
          <MonthButton label="Bulan sebelumnya" disabled={month <= firstMonth} onClick={() => go(-1)} d="m15 6-6 6 6 6" />
          <MonthButton label="Bulan berikutnya" disabled={month >= lastMonth} onClick={() => go(1)} d="m9 6 6 6-6 6" />
        </div>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[12px] text-muted">Aktivitas</p>
          <p className="tabular text-[22px] leading-tight font-semibold">{monthItems.length}</p>
        </div>
        <div>
          <p className="text-[12px] text-muted">Jarak lari</p>
          <p className="tabular text-[22px] leading-tight font-semibold">
            {runKm.toFixed(1)} <span className="text-[13px] font-normal text-muted">km</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(7,minmax(0,1fr))_2.25rem] gap-y-2 text-center" role="grid" aria-label="Kalender aktivitas">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[12px] font-semibold text-muted" aria-hidden>
            {w}
          </span>
        ))}
        <span className="text-[12px] font-semibold text-muted" aria-hidden>
          Mg
        </span>

        {weeks.map((week) => {
          const weekActive = week.some((d) => byDate.has(d));
          const weekDone = week[6] < today;
          return (
            <div key={week[0]} className="contents" role="row">
              {week.map((d) => {
                const future = d > today;
                const list = future ? [] : (byDate.get(d) ?? []);
                const planned = planByDate.get(d) ?? [];
                const own = inMonth(d);
                const isSel = d === selected;
                const first = list[0];
                const cell = !first && planned[0] ? planCell(planned[0], planMarker(planned[0], plan.results.get(planned[0].id), today)) : null;
                const label = [
                  list.length ? `${list.length} aktivitas` : future ? null : "tidak ada aktivitas",
                  planned.length ? `rencana: ${planned.map((p) => p.title).join(", ")}` : null,
                ].filter(Boolean);
                return (
                  <div key={d} role="gridcell" className="flex justify-center">
                    {own && (!future || planned.length > 0) ? (
                      <button
                        type="button"
                        onClick={() => setSelected(d)}
                        aria-pressed={isSel}
                        aria-label={`${DAY_TITLE_FMT.format(utc(d))}: ${label.join("; ")}`}
                        className={`pressable relative flex h-9 w-9 items-center justify-center rounded-full text-[14px] tabular ${
                          first ? DONE_FILL : cell ? cell.className : "bg-subtle text-ink"
                        } ${d === today ? "ring-2 ring-brand" : ""} ${isSel ? "outline-2 outline-offset-2 outline-ink" : ""}`}
                      >
                        {first ? (
                          <Icon d={itemIcon(first)} className="h-5 w-5" />
                        ) : cell?.mark === "check" ? (
                          <Icon d="m6 12 4 4 8-8" className="h-4 w-4" strokeWidth={2.2} />
                        ) : (
                          Number(d.slice(8))
                        )}
                        {list.length > 1 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-on-brand ring-2 ring-surface">
                            {list.length}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className={`flex h-9 w-9 items-center justify-center text-[14px] tabular ${own ? "rounded-full border border-line text-muted" : "text-faint"}`}>
                        {Number(d.slice(8))}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Status minggu: aktif = hijau ✓, minggu lewat tanpa aktivitas = netral (tanpa merah, 0.14.3). */}
              <div role="gridcell" className="flex items-center justify-center">
                {weekActive ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-bg" title="Minggu aktif">
                    <Icon d="m5 12 4.5 4.5L19 7" className="h-4 w-4" strokeWidth={3} />
                  </span>
                ) : weekDone ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-subtle-strong text-faint" title="Tidak ada aktivitas">
                    <Icon d="M7 12h10" className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="h-6 w-6 rounded-full border-2 border-line-strong" title="Minggu berjalan" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
        <Legend className="bg-brand" label="Selesai" />
        {showPlan && (
          <>
            <Legend className="border-2 border-success" label="Rencana easy" />
            <Legend className="border-2 border-warning" label="Moderate" />
            <Legend className="border-2 border-danger" label="High" />
            <Legend className="border border-line" label="Rencana sudah dipenuhi" />
          </>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[13px] font-semibold text-muted">{DAY_TITLE_FMT.format(utc(selected))}</p>
        {selectedPlan.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {selectedPlan.map((s) => {
              const r = plan.results.get(s.id);
              const note = sessionNote(r);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 text-[14px]">
                  <span className="t-label">Disarankan</span>
                  <span className="font-semibold">{s.title}</span>
                  <SessionStatusChip session={s} result={r} />
                  {note && <span className="text-[12px] text-muted">{note}</span>}
                </li>
              );
            })}
          </ul>
        )}
        {selectedList.length === 0 ? (
          selectedPlan.length === 0 && <p className="mt-1 text-body text-faint">{selected > today ? "Belum ada rencana." : "Tidak ada aktivitas. Hari istirahat."}</p>
        ) : (
          <ul key={selected} className="swap-in -mx-5 mt-1 divide-y divide-line">
            {selectedList.map((i) => (i.kind === "activity" ? <ActivityRow key={i.activity.id} a={i.activity} /> : <LocalStRow key={i.id} item={i} />))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const meta = [
    a.distanceKm ? `${a.distanceKm.toFixed(2)} km` : null,
    a.movingTimeSec ? formatDuration(a.movingTimeSec) : null,
    a.category === "run" && a.avgPaceSecPerKm ? formatPace(a.avgPaceSecPerKm) : null,
  ].filter(Boolean);
  const extra = [
    a.avgHr ? `♥ ${Math.round(a.avgHr)}` : null,
    a.cadenceSpm && a.category === "run" ? `${a.cadenceSpm} spm` : null,
    a.trainingLoad ? `load ${Math.round(a.trainingLoad)}` : null,
  ].filter(Boolean);
  return (
    <li>
      <Link href={`/activity/${encodeURIComponent(a.id)}`} className="flex items-center gap-3 px-5 py-3 hover:bg-subtle">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${DONE_FILL}`} aria-hidden>
          <Icon d={CATEGORY_ICON[a.category]} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-body font-semibold">{a.name}</p>
            <span className="shrink-0 text-[12px] text-muted">{formatTimeOfDay(a.startLocal)}</span>
          </div>
          <p className="tabular truncate text-[13px] text-muted">
            <span className="text-faint">
              {CATEGORY_LABEL[a.category]}
              {a.category === "run" ? (isHardRun(a) ? " berat" : " easy") : ""}
              {meta.length ? " · " : ""}
            </span>
            {meta.length ? meta.join(" · ") : <span className="text-faint">{a.source === "STRAVA" ? "data Strava tidak tersedia lewat API" : "tanpa data"}</span>}
          </p>
          {extra.length > 0 && <p className="tabular truncate text-[13px] text-faint">{extra.join(" · ")}</p>}
        </div>
        <span className="text-[13px] text-faint" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}

/** ST yang dicatat di perangkat (mode latihan atau log ★), tanpa aktivitas intervals.icu. */
function LocalStRow({ item }: { item: Extract<CalendarItem, { kind: "local-st" }> }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${DONE_FILL}`} aria-hidden>
        <Icon d={STRENGTH_ICON} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{item.title}</p>
        <p className="tabular truncate text-[13px] text-muted">
          <span className="text-faint">Dicatat di perangkat</span>
          {item.minutes ? ` · ${item.minutes}'` : ""}
        </p>
      </div>
    </li>
  );
}

const itemIcon = (i: CalendarItem) => (i.kind === "activity" ? CATEGORY_ICON[i.activity.category] : STRENGTH_ICON);

function MonthButton({ label, disabled, onClick, d }: { label: string; disabled: boolean; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink hover:bg-subtle disabled:opacity-30"
    >
      <Icon d={d} className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function Icon({ d, className, strokeWidth = 1.9 }: { d: string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
