"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MovementSheet } from "@/components/movements/MovementSheet";
import { MuscleSummary } from "@/components/strength/MuscleSummary";
import { BUTTON } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Switch } from "@/components/ui/Switch";
import { sameDayAdvice, type TodayDone } from "@/lib/coach";
import { todayWib } from "@/lib/date";
import { formatLoad, formatVolume } from "@/lib/generator/format";
import { PHASE_LABEL, type StrengthItem } from "@/lib/generator/types";
import { PREF_KEYS } from "@/lib/preference-keys";
import { useStoredString } from "@/lib/preferences";
import { useResolvedProfile } from "@/lib/settings-store";
import { useStSessions } from "@/lib/st-session-store";
import {
  allDone,
  completeSet,
  defaultSet,
  extendRest,
  goTo,
  itemDone,
  parseActiveWorkout,
  REST_EXTEND_SEC,
  setsDone,
  setsPlanned,
  skipTimer,
  startHold,
  timerLeft,
  undoSet,
  type ActiveWorkout,
  type SetRecord,
} from "@/lib/workout-state";
import { canVibrate, useNow, useWakeLock, vibrate } from "./device";
import { FinishSession } from "./FinishSession";

const RPE_OPTIONS = [4, 5, 6, 7, 8, 9];
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/**
 * Mode latihan layar penuh (0.14.1): satu gerakan per layar, centang per set, timer istirahat & hitung mundur tahan,
 * layar tetap menyala bila didukung, getar opsional. Keadaan disimpan di perangkat setiap langkah, jadi sesi bisa
 * ditinggal lalu dilanjutkan; timer dihitung dari jam.
 */
export function WorkoutMode({ todayDone }: { todayDone?: TodayDone }) {
  const router = useRouter();
  const [raw, setRaw] = useStoredString(PREF_KEYS.activeWorkout, "");
  const s = useMemo(() => parseActiveWorkout(raw), [raw]);
  const [finishing, setFinishing] = useState(false);
  const [saved, setSaved] = useState<{
    movements: string[];
    summary: string;
  } | null>(null);

  if (saved)
    return (
      <Shell>
        <SavedView {...saved} />
      </Shell>
    );
  if (!s)
    return (
      <Shell>
        <div className="space-y-3 rounded-card border border-line bg-surface p-5">
          <p className="text-body font-semibold">Tidak ada sesi yang berjalan.</p>
          <p className="text-[14px] text-muted">Mulai sesi dari Generator Strength.</p>
          <Link href="/strength" className={`${BUTTON.base} ${BUTTON.primary} w-full`}>
            Buka Generator Strength
          </Link>
        </div>
      </Shell>
    );

  const save = (next: ActiveWorkout) => setRaw(JSON.stringify(next));
  return (
    <Shell>
      {finishing ? (
        <FinishSession
          state={s}
          onBack={() => setFinishing(false)}
          onSaved={(summary) => {
            setSaved({
              movements: s.workout.items.filter((i) => i.phase === "main").map((i) => i.movement),
              summary,
            });
            setRaw(null);
          }}
        />
      ) : (
        <Running
          s={s}
          save={save}
          todayDone={todayDone}
          onFinish={() => setFinishing(true)}
          onCancel={() => {
            setRaw(null);
            router.push("/strength");
          }}
        />
      )}
    </Shell>
  );
}

/** Lapisan layar penuh di atas AppBar & navigasi bawah, di bawah strip status bar. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] bottom-0 z-40 overflow-y-auto overscroll-contain bg-bg">
      <div className="safe-x mx-auto w-full max-w-xl pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}

function Running({
  s,
  save,
  todayDone,
  onFinish,
  onCancel,
}: {
  s: ActiveWorkout;
  save: (n: ActiveWorkout) => void;
  todayDone?: TodayDone;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const p = useResolvedProfile();
  const sessions = useStSessions();
  const now = useNow(s.timer ? 250 : 1000);
  const wake = useWakeLock(true);
  const [vibRaw, setVib] = useStoredString(PREF_KEYS.workoutVibrate, "1");
  const vib = vibRaw === "1";
  const [detail, setDetail] = useState<StrengthItem | null>(null);
  const items = s.workout.items;
  const i = s.current;
  const it = items[i];
  const left = timerLeft(s, now);
  const today = todayWib(new Date(now));
  const sameDay = sameDayAdvice({
    done: todayDone,
    sessions,
    current: "strength",
    today,
  });

  // Timer habis: getar sekali, lalu timer ditutup (pesan singkat tetap tampil sampai set berikutnya).
  const fired = useRef<number | null>(null);
  const [ended, setEnded] = useState<"rest" | "hold" | null>(null);
  useEffect(() => {
    if (!s.timer || left !== 0 || fired.current === s.timer.endsAt) return;
    fired.current = s.timer.endsAt;
    if (vib) vibrate(s.timer.kind === "rest" ? [200, 100, 200] : [400]);
    const kind = s.timer.kind;
    queueMicrotask(() => setEnded(kind));
    save(skipTimer(s));
  }, [left, s, save, vib]);

  const done = setsDone(s);
  const total = setsPlanned(s);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(s.startedAt)) / 1000));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <Link href="/strength" className={`${BUTTON.base} ${BUTTON.ghost} -ml-3 px-3`} aria-label="Kembali ke Generator Strength. Sesi tetap tersimpan.">
          ‹ Strength
        </Link>
        <p className="tabular text-[14px] font-semibold text-muted" aria-label={`Waktu sesi ${clock(elapsed)}`}>
          {clock(elapsed)}
        </p>
      </header>

      <div>
        <p className="text-[13px] text-muted">{s.workout.title}</p>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label="Set selesai"
          >
            <div className="h-full bg-brand" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <span className="tabular shrink-0 text-[13px] font-semibold">
            {done}/{total} set
          </span>
        </div>
      </div>

      {sameDay && (
        <p role="note" className="rounded-inner border border-line bg-surface p-3 text-[13px]">
          <span className="t-label mr-1 text-brand-ink">Saran Gita</span>
          {sameDay.message}
        </p>
      )}

      {s.timer && left !== undefined && left > 0 ? (
        <TimerPanel kind={s.timer.kind} left={left} onExtend={() => save(extendRest(s, Date.now()))} onSkip={() => save(skipTimer(s))} />
      ) : (
        ended && (
          <p role="status" className="rounded-inner bg-subtle p-3 text-[14px] font-semibold">
            {ended === "rest" ? "Istirahat selesai. Lanjut set berikutnya." : "Tahan selesai. Centang setnya."}
          </p>
        )
      )}

      <MovementPanel
        key={`${i}-${s.sets[i].length}`}
        s={s}
        index={i}
        onSet={(rec) => {
          setEnded(null);
          save(completeSet(s, i, rec, Date.now()));
        }}
        onHold={() => {
          setEnded(null);
          save(startHold(s, i, Date.now()));
        }}
        onUndo={() => save(undoSet(s, i))}
        onDetail={() => setDetail(it)}
      />

      <nav aria-label="Pindah gerakan" className="grid grid-cols-2 gap-2">
        <button type="button" disabled={i === 0} onClick={() => save(goTo(s, i - 1))} className={`${BUTTON.base} ${BUTTON.secondary}`}>
          ‹ Sebelumnya
        </button>
        <button type="button" disabled={i === items.length - 1} onClick={() => save(goTo(s, i + 1))} className={`${BUTTON.base} ${BUTTON.secondary}`}>
          Berikutnya ›
        </button>
      </nav>

      <details className="rounded-card border border-line bg-surface p-4">
        <summary className="min-h-11 cursor-pointer content-center text-body font-semibold">Semua gerakan ({items.length})</summary>
        <ol className="mt-2 space-y-1">
          {items.map((x, j) => (
            <li key={`${x.movement}-${j}`}>
              <button
                type="button"
                onClick={() => save(goTo(s, j))}
                aria-current={j === i ? "step" : undefined}
                className={`pressable flex min-h-11 w-full items-center justify-between gap-2 rounded-inner px-3 text-left text-[14px] hover:bg-subtle ${j === i ? "bg-subtle font-semibold" : ""}`}
              >
                <span>
                  {x.anchor && <span className="mr-1 text-brand-ink">★</span>}
                  {x.movement}
                </span>
                <span className={`tabular shrink-0 text-[13px] ${itemDone(s, j) ? "font-semibold text-brand-ink" : "text-muted"}`}>
                  {itemDone(s, j) ? "✓ " : ""}
                  {Math.min(s.sets[j].length, x.sets)}/{x.sets}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </details>

      <details className="rounded-card border border-line bg-surface p-4">
        <summary className="min-h-11 cursor-pointer content-center text-body font-semibold">Otot yang dilatih</summary>
        <div className="mt-3">
          <MuscleSummary movements={items.filter((x) => x.phase === "main").map((x) => x.movement)} />
        </div>
      </details>

      <div className="space-y-3 rounded-card border border-line bg-surface p-4">
        <p className="text-[13px] text-muted">
          {wake === "on"
            ? "Layar tetap menyala selama sesi."
            : wake === "unsupported"
              ? "Layar bisa mati di perangkat ini. Sesi tetap tersimpan."
              : "Layar tetap menyala tidak aktif. Sesi tetap tersimpan."}
        </p>
        {canVibrate() && <Switch checked={vib} onChange={(v) => setVib(v ? "1" : "0")} label="Getar saat timer habis" />}
      </div>

      <button type="button" onClick={onFinish} className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg} w-full`}>
        {allDone(s) ? "Selesai sesi" : "Akhiri sesi"}
      </button>
      <div className="flex justify-center">
        <ConfirmButton size="md" label="Batalkan sesi" confirmLabel="Ya, buang sesi ini" onConfirm={onCancel} />
      </div>

      {detail && (
        <MovementSheet
          name={detail.movement}
          item={detail}
          activeConditions={p.activeConditions}
          suggestion={detail.progression}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function TimerPanel({ kind, left, onExtend, onSkip }: { kind: "rest" | "hold"; left: number; onExtend: () => void; onSkip: () => void }) {
  return (
    <section
      aria-label={kind === "rest" ? "Timer istirahat" : "Hitung mundur tahan"}
      className="rounded-card border border-line-strong bg-surface p-5 text-center shadow-card"
    >
      <p className="t-label">{kind === "rest" ? "Istirahat" : "Tahan"}</p>
      <p className="t-display tabular mt-1" role="timer" aria-live="off">
        {clock(left)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {kind === "rest" ? (
          <button type="button" onClick={onExtend} className={`${BUTTON.base} ${BUTTON.secondary}`}>
            +{REST_EXTEND_SEC} detik
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onSkip} className={`${BUTTON.base} ${BUTTON.secondary} ${kind === "hold" ? "col-span-2" : ""}`}>
          {kind === "rest" ? "Lewati" : "Hentikan"}
        </button>
      </div>
    </section>
  );
}

function MovementPanel({
  s,
  index,
  onSet,
  onHold,
  onUndo,
  onDetail,
}: {
  s: ActiveWorkout;
  index: number;
  onSet: (r: SetRecord) => void;
  onHold: () => void;
  onUndo: () => void;
  onDetail: () => void;
}) {
  const it = s.workout.items[index];
  const init = defaultSet(s, index);
  const [load, setLoad] = useState(init.load !== undefined ? String(init.load) : "");
  const [value, setValue] = useState(String(init.value));
  const [rpe, setRpe] = useState(init.rpe);
  const [tempo, setTempo] = useState(!!init.tempo);
  const [error, setError] = useState<string | null>(null);
  const n = s.sets[index].length;
  const complete = itemDone(s, index);
  const sec = !!it.durationSec;

  const submit = () => {
    const v = Number(value.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return setError(sec ? "Isi detik." : "Isi repetisi.");
    const kg = it.load.kind === "load" ? Number(load.replace(",", ".")) : undefined;
    if (kg !== undefined && (!Number.isFinite(kg) || kg <= 0)) return setError("Isi beban (kg).");
    setError(null);
    onSet({
      ...(kg !== undefined ? { load: kg } : {}),
      ...(init.band ? { band: init.band } : {}),
      value: v,
      unit: sec ? "sec" : "reps",
      rpe,
      ...(tempo ? { tempo: true } : {}),
    });
  };

  return (
    <section aria-labelledby="gerakan-sekarang" className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <div>
        <p className="t-label">
          {PHASE_LABEL[it.phase]} · gerakan {index + 1} dari {s.workout.items.length}
        </p>
        <h1 id="gerakan-sekarang" className="mt-1 text-[22px] leading-tight font-semibold">
          {it.anchor && (
            <span className="mr-1 text-brand-ink" aria-label="Gerakan utama">
              ★
            </span>
          )}
          {it.movement}
        </h1>
        <p className="tabular mt-1 text-[14px] text-muted">
          {formatVolume(it)} · {formatLoad(it.load)}
          {it.rpe ? ` · RPE ${it.rpe}` : ""}
        </p>
        {it.variantOf && <p className="mt-1 text-[13px]">Varian lebih sulit dari {it.variantOf}</p>}
        {it.tempo && <p className="mt-1 text-[13px] font-semibold">Tempo: turun 3 detik, jeda 2 detik di bawah</p>}
        {it.progression && (
          <p className="mt-1 text-[13px] font-semibold text-brand-ink">
            <span className="t-label mr-1 text-brand-ink">Saran Gita</span>
            {it.progression}
          </p>
        )}
        {it.cue && <p className="mt-1 text-[13px] text-faint">{it.cue}</p>}
        <button type="button" onClick={onDetail} aria-haspopup="dialog" className="t-label mt-1 inline-flex min-h-11 items-center">
          Lihat teknik ›
        </button>
      </div>

      <ol aria-label="Set" className="flex flex-wrap gap-2">
        {Array.from({ length: it.sets }, (_, k) => (
          <li
            key={k}
            className={`tabular grid h-9 min-w-9 place-items-center rounded-full px-2 text-[13px] font-semibold ${k < n ? "bg-brand text-on-brand" : k === n ? "border-2 border-brand text-ink" : "bg-subtle text-muted"}`}
          >
            <span className="sr-only">{k < n ? "Selesai: " : ""}Set </span>
            {k < n ? `✓${s.sets[index][k].value}` : k + 1}
          </li>
        ))}
      </ol>

      {complete ? (
        <p className="text-[14px] font-semibold text-brand-ink">✓ Semua set gerakan ini selesai.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            {it.load.kind === "load" && (
              <label className="block">
                <span className="t-label">Beban (kg)</span>
                <input
                  inputMode="decimal"
                  value={load}
                  onChange={(e) => setLoad(e.target.value)}
                  className="tabular mt-1 min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base"
                />
              </label>
            )}
            <label className={`block ${it.load.kind === "load" ? "" : "col-span-2"}`}>
              <span className="t-label">{sec ? "Detik" : "Repetisi"}</span>
              <input
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="tabular mt-1 min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base"
              />
            </label>
          </div>
          {it.load.kind === "band" && <p className="text-[13px] text-muted">Band: {it.load.band}</p>}
          {it.phase === "main" && (
            <fieldset>
              <legend className="t-label mb-2">RPE set ini</legend>
              <div role="radiogroup" className="grid grid-cols-6 gap-1.5">
                {RPE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={rpe === r}
                    onClick={() => setRpe(r)}
                    className={`pressable tabular min-h-11 rounded-control border text-base font-semibold ${rpe === r ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {it.tempo && (
            <label className="flex min-h-11 items-center gap-3 text-[14px]">
              <input type="checkbox" checked={tempo} onChange={(e) => setTempo(e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" />
              Dikerjakan dengan tempo dan jeda
            </label>
          )}
          {error && (
            <p role="alert" className="text-[13px] font-semibold text-danger-ink">
              ✕ {error}
            </p>
          )}
          <div className={`grid gap-2 ${sec ? "grid-cols-2" : ""}`}>
            {sec && (
              <button type="button" onClick={onHold} className={`${BUTTON.base} ${BUTTON.secondary} ${BUTTON.lg}`}>
                Mulai tahan {it.durationSec} dtk
              </button>
            )}
            <button type="submit" className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg}`}>
              Selesai set {n + 1}
            </button>
          </div>
        </form>
      )}
      {n > 0 && (
        <button type="button" onClick={onUndo} className={`${BUTTON.base} ${BUTTON.ghost} w-full text-[14px]`}>
          Batalkan set terakhir
        </button>
      )}
    </section>
  );
}

function SavedView({ movements, summary }: { movements: string[]; summary: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-[22px] leading-tight font-semibold">✓ Sesi tersimpan</p>
        <p className="tabular text-[14px] text-muted">{summary}</p>
      </div>
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <MuscleSummary movements={movements} />
      </div>
      <Link href="/strength" className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg} w-full`}>
        Kembali ke Strength
      </Link>
    </div>
  );
}
