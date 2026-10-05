"use client";

import { useMemo } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Segmented } from "@/components/ui/Segmented";
import { INTENSITY_TONE, TONES, pillClasses, type Tone } from "@/components/ui/tones";
import { addDays, formatDateId, startOfWeekMonday } from "@/lib/date";
import { DIFFICULTY_LABEL } from "@/lib/generator/types";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import {
  PHASE_LABEL,
  RACES,
  buildProgram,
  currentWeekIndex,
  formatGoal,
  formatPaceSec,
  goalFromProfile,
  parseGoal,
  weekToText,
  type Phase,
  type ProgramWeek,
  type RaceTarget,
} from "@/lib/program";

interface Settings {
  race: RaceTarget;
  goal: string;
  startDate: string;
  runsPerWeek: 3 | 4;
}

/** Warna fase: Base hijau (ringan), Build kuning, Peak merah (paling berat), Taper biru. */
const PHASE_STYLE: Record<Phase, { fill: string; text: string }> = {
  base: { fill: "bg-success", text: "text-success-ink" },
  build: { fill: "bg-warning", text: "text-warning-ink" },
  peak: { fill: "bg-danger", text: "text-danger-ink" },
  taper: { fill: "bg-info", text: "text-info" },
};

const RACE_OPTIONS: RaceTarget[] = ["5k", "10k", "hm", "fm"];
const DAY_MONTH = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const weekdayYear = (d: Date) => `${WEEKDAY.format(d)}, ${d.getUTCFullYear()}`;

function defaults(today: string, race: RaceTarget = "10k"): Settings {
  return { race, goal: formatGoal(goalFromProfile(race)), startDate: startOfWeekMonday(today), runsPerWeek: 3 };
}

function parseSettings(raw: string, today: string): Settings {
  try {
    const s = JSON.parse(raw) as Partial<Settings>;
    const base = defaults(today, s.race && s.race in RACES ? s.race : "10k");
    return {
      race: base.race,
      goal: typeof s.goal === "string" ? s.goal : base.goal,
      startDate: typeof s.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate) ? s.startDate : base.startDate,
      runsPerWeek: s.runsPerWeek === 4 ? 4 : 3,
    };
  } catch {
    return defaults(today);
  }
}

export function ProgramView({ today, currentLongRunKm }: { today: string; currentLongRunKm?: number }) {
  const [raw, setRaw] = useStoredString(PREF_KEYS.program, "");
  const settings = useMemo(() => parseSettings(raw, today), [raw, today]);
  const save = (patch: Partial<Settings>) => setRaw(JSON.stringify({ ...settings, ...patch }));

  const goalSec = parseGoal(settings.goal);
  // Tanggal mulai selalu dinormalkan ke Senin.
  const startDate = startOfWeekMonday(settings.startDate);
  const program = useMemo(
    () =>
      goalSec
        ? buildProgram({ race: settings.race, goalSec, startDate, runsPerWeek: settings.runsPerWeek, currentLongRunKm })
        : null,
    [settings.race, goalSec, startDate, settings.runsPerWeek, currentLongRunKm],
  );
  const current = program ? currentWeekIndex(program, today) : 0;
  const currentWeek = program?.weeks.find((w) => w.index === current);

  return (
    <div className="space-y-4">
      <Card title="Target">
        <div className="space-y-4">
          <Segmented
            label="Program"
            value={settings.race}
            onChange={(race) => save({ race, goal: formatGoal(goalFromProfile(race)) })}
            options={RACE_OPTIONS.map((r) => ({ value: r, label: r === "hm" ? "HM" : r === "fm" ? "FM" : RACES[r].short }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[12px] text-muted">
              Target waktu
              <input
                type="text"
                inputMode="numeric"
                placeholder={settings.race === "5k" ? "mm:ss" : "h:mm:ss"}
                value={settings.goal}
                onChange={(e) => save({ goal: e.target.value })}
                aria-invalid={!goalSec}
                className={`mt-1 block min-h-11 w-full rounded-control border bg-surface px-3 text-base text-ink tabular ${
                  goalSec ? "border-line-strong focus:border-brand" : "border-danger"
                }`}
              />
            </label>
            <label className="text-[12px] text-muted">
              Mulai (Senin)
              <input
                type="date"
                value={startDate}
                onChange={(e) => e.target.value && save({ startDate: startOfWeekMonday(e.target.value) })}
                className="mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand"
              />
            </label>
          </div>
          {!goalSec && <p className="text-[13px] font-semibold text-danger-ink">✕ Format waktu tidak valid. Contoh: 28:30 atau 2:45:00.</p>}
          <Segmented
            label="Lari per minggu"
            value={settings.runsPerWeek}
            onChange={(runsPerWeek) => save({ runsPerWeek })}
            options={[
              { value: 3, label: "3× lari" },
              { value: 4, label: "4× lari" },
            ]}
          />
          <button type="button" onClick={() => setRaw(null)} className={`${BUTTON.base} ${BUTTON.secondary} w-full text-body`}>
            Reset ke target profil
          </button>
        </div>
      </Card>

      {program && (
        <>
          <Card
            title={program.spec.label}
            action={<span className={pillClasses(current ? "success" : "danger")}>{current ? `Minggu ${current}/${program.spec.weeks}` : today < startDate ? "Belum mulai" : "Selesai"}</span>}
          >
            <div className="grid grid-cols-3 gap-x-3 gap-y-3">
              <Fact label="Hari lomba" value={DAY_MONTH.format(new Date(`${program.raceDate}T00:00:00Z`))} sub={weekdayYear(new Date(`${program.raceDate}T00:00:00Z`))} />
              <Fact label="Race pace" value={formatPaceSec(program.racePaceSec).replace("/km", "")} sub="/km" />
              <Fact label="Durasi" value={`${program.spec.weeks}`} sub="minggu" />
            </div>

            <PhaseBar weeks={program.weeks} current={current} />

            {program.warnings.length > 0 && (
              <ul className="mt-4 space-y-2">
                {program.warnings.map((w) => (
                  <li key={w} className="flex gap-2 rounded-inner bg-danger-soft px-3 py-2 text-[13px] text-ink">
                    <span aria-hidden className="font-semibold text-danger-ink">
                      ✕
                    </span>
                    {w}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-faint">
              Long run awal {currentLongRunKm ? `dari data terakhirmu (${currentLongRunKm} km terjauh 30 hari)` : "memakai default program"}.
            </p>
          </Card>

          {currentWeek && (
            <Card
              title={`Minggu ini · ${PHASE_LABEL[currentWeek.phase]}`}
              action={<CopyButton text={weekToText(program, currentWeek)} label="Copy" className={`${BUTTON.secondary} min-h-9 px-3 text-[13px]`} />}
            >
              <WeekDetail week={currentWeek} />
            </Card>
          )}

          <Card title="Semua minggu" flush className="!pb-1">
            <ul className="divide-y divide-line">
              {program.weeks.map((w) => (
                <li key={w.index}>
                  <details className="group" open={w.index === current && !currentWeek}>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2">
                      <span className={`h-8 w-1 shrink-0 rounded-full ${PHASE_STYLE[w.phase].fill}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-semibold">
                          Minggu {w.index}
                          {w.index === current && <span className="ml-2 text-[12px] font-semibold text-brand-ink">● sekarang</span>}
                        </p>
                        <p className="text-[13px] text-muted">
                          <span className={`font-semibold ${PHASE_STYLE[w.phase].text}`}>{PHASE_LABEL[w.phase]}</span>
                          {w.cutback && " · cutback"} · {formatDateId(w.start)} · ±{w.totalKm} km
                        </p>
                      </div>
                      <span className="text-[13px] text-faint transition-transform duration-150 ease group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                        ›
                      </span>
                    </summary>
                    <div className="details-body px-4 pb-4">
                      <WeekDetail week={w} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Kombinasi dengan strength">
            <p className="text-[14px] text-ink">{program.strengthNote}</p>
          </Card>
        </>
      )}
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="tabular truncate text-[18px] leading-tight font-semibold">{value}</p>
      {sub && <p className="text-[12px] text-faint">{sub}</p>}
    </div>
  );
}

function PhaseBar({ weeks, current }: { weeks: ProgramWeek[]; current: number }) {
  const phases = [...new Set(weeks.map((w) => w.phase))];
  return (
    <div className="mt-4">
      <div className="flex gap-1" aria-hidden>
        {weeks.map((w) => (
          <span
            key={w.index}
            className={`h-2.5 flex-1 rounded-full ${PHASE_STYLE[w.phase].fill} ${w.index === current ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""} ${
              w.cutback ? "opacity-50" : ""
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
        {phases.map((p) => (
          <span key={p} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${PHASE_STYLE[p].fill}`} />
            {PHASE_LABEL[p]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-faint opacity-50" />
          Cutback
        </span>
      </div>
    </div>
  );
}

function WeekDetail({ week }: { week: ProgramWeek }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-muted">{week.focus}</p>
      <ul className="space-y-2">
        {week.sessions.map((s) => {
          const tone: Tone = INTENSITY_TONE[s.intensity];
          return (
            <li key={s.day + s.title} className="flex gap-3 rounded-inner bg-subtle px-3 py-2.5">
              <span className={`w-1 shrink-0 self-stretch rounded-full ${TONES[tone].fill}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-body font-semibold">
                    <span className="text-muted">{s.day} · </span>
                    {s.title}
                  </p>
                  <span className={`shrink-0 ${pillClasses(tone)}`}>{s.isRace ? "Lomba" : DIFFICULTY_LABEL[s.intensity]}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[12px] text-faint">Total ±{week.totalKm} km · mulai {formatDateId(week.start)} – {formatDateId(addDays(week.start, 6))}</p>
    </div>
  );
}
