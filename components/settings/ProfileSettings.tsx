"use client";

import { useId, useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { TimePicker } from "@/components/ui/TimePicker";
import { formatRaceTarget, RACE_LABEL, type AthleteSettings, type ProfileSettings as Profile, type RaceKey } from "@/lib/athlete-settings";
import { startOfWeekMonday, todayWib } from "@/lib/date";
import { useBlockMode } from "@/lib/settings-store";
import { useT } from "@/lib/i18n/client";
import { SETTINGS } from "@/lib/i18n/messages/settings";

const INPUT = "mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand";
const RACE_KEYS: RaceKey[] = ["5k", "10k", "hm", "fm"];
const RACE_SHORT: Record<RaceKey, string> = { "5k": "5K", "10k": "10K", hm: "HM", fm: "FM" };
/** Default pemilih waktu per jarak (titik awal saja, bukan saran). */
const DEFAULT_GOAL: Record<RaceKey, number> = { "5k": 30 * 60, "10k": 60 * 60, hm: 2.5 * 3600, fm: 5 * 3600 };
const MAX_HOURS: Record<RaceKey, number> = { "5k": 1, "10k": 2, hm: 4, fm: 7 };

/**
 * Teks yang disimpan saat kolom ditinggalkan, bukan tiap ketikan: `parseSettings` merapikan spasi,
 * jadi menyimpan per ketikan akan memakan spasi di akhir kata yang sedang diketik.
 */
function TextField({
  label,
  value,
  onCommit,
  placeholder,
  maxLength,
  required,
}: {
  label: string;
  value?: string;
  onCommit: (v: string | undefined) => void;
  placeholder?: string;
  maxLength: number;
  required?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value ?? "";
  const t = useT(SETTINGS).profile;
  const commit = () => {
    if (draft === null) return;
    const v = draft.trim();
    onCommit(v || undefined);
    setDraft(null);
  };
  return (
    <label className="block text-[12px] text-muted">
      {label}
      {required && <span className="text-danger-ink">{t.required}</span>}
      <input
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        maxLength={maxLength}
        placeholder={placeholder}
        className={INPUT}
      />
    </label>
  );
}

/**
 * Usia disimpan saat kolom ditinggalkan. Menyimpan per ketikan membuat digit pertama ("2" dari 23)
 * ditolak karena di bawah 10, sehingga angka kedua tidak pernah bisa diketik.
 */
function AgeField({ value, onCommit }: { value?: number; onCommit: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? String(value) : "");
  const t = useT(SETTINGS).profile;
  const n = Number(shown);
  const invalid = shown !== "" && !(n >= 10 && n <= 100);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (draft === "") onCommit(undefined);
    else if (v >= 10 && v <= 100) onCommit(v);
    setDraft(null);
  };
  return (
    <label className="block text-[12px] text-muted">
      {t.age}
      <input
        inputMode="numeric"
        maxLength={3}
        value={shown}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        placeholder={t.agePlaceholder}
        aria-invalid={invalid || undefined}
        className={invalid ? INPUT.replace("border-line-strong", "border-danger") : INPUT}
      />
      {invalid && <span className="mt-1 block text-danger-ink">{t.ageRange}</span>}
    </label>
  );
}

/** Profil dasar: nama, usia, gaya hidup, fokus, target lomba, tujuan, dan periodisasi. Dipakai di Setting & onboarding. */
export function ProfileSettings({
  settings,
  onChange,
  showGoals = true,
}: {
  settings: AthleteSettings;
  onChange: (s: AthleteSettings) => void;
  /** Daftar tujuan latihan (teks bebas). Onboarding menyembunyikannya supaya singkat. */
  showGoals?: boolean;
}) {
  const pr = settings.profile;
  const set = (patch: Partial<Profile>) => {
    const next: Profile = { ...pr, ...patch };
    for (const k of Object.keys(next) as (keyof Profile)[]) if (next[k] === undefined) delete next[k];
    onChange({ ...settings, profile: next });
  };
  const [blockOn, setBlockOn] = useBlockMode();
  const [race, setRace] = useState<RaceKey>("5k");
  const [goalSec, setGoalSec] = useState(DEFAULT_GOAL["5k"]);
  const [goalDraft, setGoalDraft] = useState("");
  const dateId = useId();
  const t = useT(SETTINGS).profile;
  const targets = pr.raceTargets ?? [];
  const goals = pr.goals ?? [];

  const addTarget = () => {
    const text = formatRaceTarget(race, goalSec);
    // Satu target per jarak: target baru menggantikan target lama dengan jarak yang sama.
    const label = RACE_LABEL[race];
    set({ raceTargets: [...targets.filter((t) => !t.endsWith(` ${label}`)), text].slice(0, 4) });
  };

  return (
    <Card title={t.title}>
      <p className="text-[13px] text-muted">{t.intro}</p>
      <div className="mt-3 space-y-3">
        <TextField label={t.name} value={pr.name} onCommit={(name) => set({ name })} maxLength={60} placeholder={t.namePlaceholder} required />
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <AgeField value={pr.age} onCommit={(age) => set({ age })} />
          <TextField label={t.lifestyle} value={pr.occupation} onCommit={(occupation) => set({ occupation })} maxLength={80} placeholder={t.lifestylePlaceholder} />
        </div>
        <TextField label={t.focus} value={pr.category} onCommit={(category) => set({ category })} maxLength={80} placeholder={t.focusPlaceholder} />
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-body font-semibold">{t.targets}</p>
        <p className="mt-0.5 text-[13px] text-muted">{t.targetsHint}</p>
        {targets.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {targets.map((tg) => (
              <li key={tg} className="flex items-center gap-2 rounded-inner bg-subtle py-1 pr-1 pl-3 text-[14px]">
                <span className="min-w-0 flex-1">{tg}</span>
                <button
                  type="button"
                  onClick={() => set({ raceTargets: targets.filter((x) => x !== tg) })}
                  aria-label={t.removeTarget(tg)}
                  className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-control text-muted hover:bg-subtle-strong hover:text-danger-ink"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 space-y-2">
          <Segmented
            label={t.distance}
            value={race}
            onChange={(r) => {
              setRace(r);
              setGoalSec(DEFAULT_GOAL[r]);
            }}
            options={RACE_KEYS.map((k) => ({ value: k, label: RACE_SHORT[k] }))}
          />
          <p className="t-label">{t.goalTime}</p>
          <TimePicker aria-label={t.goalTimeOf(RACE_LABEL[race])} format="hms" maxHours={MAX_HOURS[race]} value={goalSec} onChange={setGoalSec} units />
          <button type="button" onClick={addTarget} disabled={goalSec <= 0} className={`${BUTTON.base} ${BUTTON.secondary} w-full disabled:opacity-40`}>
            {t.saveTarget(RACE_LABEL[race])}
          </button>
        </div>
      </div>

      {showGoals && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-body font-semibold">{t.goals}</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = goalDraft.trim();
              if (!v || goals.includes(v)) return;
              set({ goals: [...goals, v].slice(0, 5) });
              setGoalDraft("");
            }}
          >
            <input
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              maxLength={80}
              placeholder={t.goalPlaceholder}
              aria-label={t.newGoal}
              className="min-h-11 min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand"
            />
            <button type="submit" disabled={!goalDraft.trim()} className={`${BUTTON.base} ${BUTTON.secondary} shrink-0 px-3 disabled:opacity-40`}>
              {t.add}
            </button>
          </form>
          {goals.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {goals.map((g) => (
                <li key={g} className="flex items-center gap-2 rounded-inner bg-subtle py-1 pr-1 pl-3 text-[14px]">
                  <span className="min-w-0 flex-1">{g}</span>
                  <button
                    type="button"
                    onClick={() => set({ goals: goals.filter((x) => x !== g) })}
                    aria-label={t.removeGoal(g)}
                    className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-control text-muted hover:bg-subtle-strong hover:text-danger-ink"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <Segmented
          label={t.periodization}
          value={blockOn ? "block" : "free"}
          onChange={(v) => {
            if (v === "block" && !pr.blockStart) set({ blockStart: startOfWeekMonday(todayWib()) });
            setBlockOn(v === "block");
          }}
          options={[
            { value: "block", label: t.block },
            { value: "free", label: t.free },
          ]}
        />
        <p className="mt-2 text-[13px] text-muted">
          {blockOn ? t.blockDesc : t.freeDesc}
        </p>
        {blockOn && (
          <label htmlFor={dateId} className="mt-3 block text-[12px] text-muted">
            {t.blockStart}
            <input
              id={dateId}
              type="date"
              value={pr.blockStart ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                set({ blockStart: /^\d{4}-\d{2}-\d{2}$/.test(v) ? startOfWeekMonday(v) : undefined });
              }}
              className={INPUT}
            />
          </label>
        )}
      </div>
    </Card>
  );
}
