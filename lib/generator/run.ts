import { DEFAULT_TOPS, hrTargets } from "@/lib/hr-zones";
import { profile, type AthleteProfile, type ResolvedProfile } from "@/lib/profile";
import { DEFAULT_BLOCK, type BlockContext } from "./block";
import { createRng } from "./rng";
import { DIFFICULTY_LABEL, type Difficulty, type Duration, type RunBlock, type RunStep, type RunWorkout } from "./types";
import { assertValidRun } from "./validate";
import type { Locale } from "@/lib/i18n/locale";
import { RUN_GEN } from "@/lib/i18n/messages/run-gen";

/**
 * Preskripsi zona untuk generator. Pace diambil dari profil (dengan fallback). HR dari zona efektif Setting › Zona
 * (0.17, `lib/hr-zones.ts`); bawaannya angka konservatif lama: Easy < 140, Tempo 160–170, pemulihan < 130.
 */
export function runTargets(p: AthleteProfile = profile, locale: Locale = "id") {
  const z = p.runZones ?? {};
  const hr = hrTargets(p.hrTops ?? DEFAULT_TOPS, locale);
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v.replace(/\/km$/, "") + "/km" : fallback;
  return {
    easy: { pace: str(z.easy?.pace, "8:00–8:50/km"), hr: hr.easy, rpe: "3–4" },
    tempo: { pace: str(z.tempo?.pace, "6:15–6:30/km"), hr: hr.tempo, rpe: "6–7" },
    mini: { pace: str(z.miniInterval?.pace, "5:15–5:35/km"), hr: hr.interval, rpe: "7–8" },
    norwegian: { pace: str(z.norwegian4x4?.pace, "5:50/km"), hr: hr.norwegian, rpe: "7–8" },
    recovery: { hr: hr.recovery, rpe: "2–3" },
    /** Jog lambat 15/15 dan batas Easy untuk catatan. */
    jogDownHr: hr.jogDown,
    easyBelow: hr.easyBelow,
  };
}

export const CADENCE_NOTE = RUN_GEN.id.note.cadence;
export const CROSSOVER_NOTE = RUN_GEN.id.note.crossover;
/** Kedua cue gait untuk profil default (overpronation/crossover gait). */
export const CADENCE_NOTES = [CADENCE_NOTE, CROSSOVER_NOTE];

/**
 * Target cadence personal dari data asli (Heiderscheit dkk. 2011: naik 5–10%
 * mengurangi beban lutut/pinggul). Bertahap +5%, maksimal 180 SPM.
 */
export function cadenceTarget(avgSpm?: number, locale: Locale = "id"): { target: number; note?: string } {
  const m = RUN_GEN[locale].note;
  if (!avgSpm || !Number.isFinite(avgSpm)) return { target: 180 };
  const avg = Math.round(avgSpm);
  if (avg >= 175) {
    return { target: avg, note: m.cadenceHold(avg) };
  }
  const target = Math.min(180, Math.round(avg * 1.05));
  return {
    target,
    note: m.cadenceUp(avg, target),
  };
}

export interface RunInput {
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
  /** Konteks blok periodisasi (minggu deload menambah catatan). */
  block?: BlockContext;
  /** Mode bebas (program blok dimatikan): tidak ada penyesuaian minggu deload. */
  free?: boolean;
  /** Cadence rata-rata lari terakhir (SPM total) untuk target personal. */
  cadenceSpm?: number;
  /** 1.2.0: bahasa teks sesi (judul blok, label, catatan). Bawaan Indonesia. */
  locale?: Locale;
  /**
   * Pola yang diminta (mis. dari sesi program, 0.13.1). Hanya dipakai bila cocok dengan level/durasi;
   * tanpa parameter ini keluaran identik dengan sebelumnya (rng dipanggil sama persis).
   */
  pattern?: RunPattern;
}

export const RUN_PATTERNS = ["continuous", "runWalk", "cadenceDrill", "tempo", "cruise", "progression", "4x4", "15/15"] as const;
export type RunPattern = (typeof RUN_PATTERNS)[number];
export const isRunPattern = (x: unknown): x is RunPattern => typeof x === "string" && (RUN_PATTERNS as readonly string[]).includes(x);

const EASY_VARIANTS = ["continuous", "runWalk", "cadenceDrill"] as const;
type EasyVariant = (typeof EASY_VARIANTS)[number];
const isEasyVariant = (x: unknown): x is EasyVariant => typeof x === "string" && (EASY_VARIANTS as readonly string[]).includes(x);

const fmtWork = (min: number) => (min < 1 ? `${Math.round(min * 60)}"` : `${min}'`);

type ModerateOption =
  | { kind: "tempo"; wu: number; reps: number; work: number; rest: number }
  | { kind: "progression"; wu: number; z2: number; tempo: number };

/** Pola tempo per durasi (kategori Threshold ala Daniels). Durasi total selalu tepat. */
const MODERATE_OPTIONS: Record<Duration, ModerateOption[]> = {
  30: [
    { kind: "tempo", wu: 10, reps: 1, work: 12, rest: 0 },
    { kind: "tempo", wu: 8, reps: 2, work: 6, rest: 2 },
    { kind: "tempo", wu: 8, reps: 3, work: 4, rest: 1 },
    { kind: "progression", wu: 8, z2: 8, tempo: 8 },
  ],
  45: [
    { kind: "tempo", wu: 10, reps: 2, work: 10, rest: 3 },
    { kind: "tempo", wu: 10, reps: 3, work: 7, rest: 2 },
    { kind: "tempo", wu: 10, reps: 4, work: 6, rest: 1 },
    { kind: "progression", wu: 10, z2: 15, tempo: 12 },
  ],
  60: [
    { kind: "tempo", wu: 12, reps: 3, work: 10, rest: 3 },
    { kind: "tempo", wu: 12, reps: 2, work: 15, rest: 3 },
    { kind: "tempo", wu: 12, reps: 5, work: 6, rest: 1 },
    { kind: "progression", wu: 10, z2: 22, tempo: 18 },
  ],
};

/** Opsi Moderate yang sesuai pola: tempo (satu blok atau jeda > 1'), cruise (berseri, jeda ≤ 1'), progression. */
function moderateFits(o: ModerateOption, pattern?: RunPattern): boolean {
  if (pattern === "progression") return o.kind === "progression";
  if (o.kind !== "tempo") return false;
  const cruise = o.reps > 1 && o.rest <= 1;
  return pattern === "cruise" ? cruise : pattern === "tempo" ? !cruise : false;
}

/** Pola High 45'/60' yang diminta menggantikan hasil acak; 15/15 tetap dibatalkan bila sprint dilarang. */
const pickHigh = (picked: "4x4" | "15/15", pattern?: RunPattern) => (pattern === "4x4" || pattern === "15/15" ? pattern : picked);

const MINI_PATTERNS = [
  { work: 1, rest: 1, max: 8 },
  { work: 2, rest: 2, max: 8 },
  { work: 3, rest: 2, max: 8 },
  { work: 0.5, rest: 0.5, max: 12 },
];

export function generateRunWorkout(input: RunInput, p: ResolvedProfile = profile): RunWorkout {
  const { duration, difficulty, seed } = input;
  const blockCtx = input.free ? DEFAULT_BLOCK : (input.block ?? DEFAULT_BLOCK);
  const rng = createRng(seed);
  const locale = input.locale ?? "id";
  const { block: B, step: S, note: N } = RUN_GEN[locale];
  const t = runTargets(p, locale);
  const cadence = cadenceTarget(input.cadenceSpm, locale);

  const easyRun = (min: number, label = "Easy run Z2"): RunStep => ({
    kind: "run",
    label,
    durationMin: min,
    ...t.easy,
  });
  const jog = (min: number, label = "Recovery jog"): RunStep => ({
    kind: "jog",
    label,
    durationMin: min,
    pace: "santai",
    ...t.recovery,
  });
  const walk = (min: number, label: string = S.walk): RunStep => ({
    kind: "walk",
    label,
    durationMin: min,
    ...t.recovery,
  });

  const block = (phase: RunBlock["phase"], title: string, steps: RunStep[], repeat = 1): RunBlock => ({
    phase,
    title,
    steps,
    repeat,
  });

  let title = "";
  let blocks: RunBlock[] = [];
  const notes: string[] = [];

  if (difficulty === "easy") {
    const main = duration - 10;
    const picked = rng.pick(EASY_VARIANTS);
    const variant = isEasyVariant(input.pattern) ? input.pattern : picked;
    const warmup = block("warmup", B.warmup, [walk(5, S.briskWalk)]);
    const cooldown = block("cooldown", B.cooldown, [walk(5, S.easyWalk)]);
    if (variant === "continuous") {
      title = `Easy Z2 Continuous ${main}'`;
      blocks = [warmup, block("main", "Continuous Zone 2", [easyRun(main)]), cooldown];
    } else if (variant === "runWalk") {
      const reps = Math.floor(main / 5);
      title = `Easy Run-Walk ${reps}×(4'/1')`;
      blocks = [warmup, block("main", "Run-Walk", [easyRun(4, S.runZ2), walk(1, S.walk)], reps), cooldown];
    } else {
      // Z2 dengan sisipan fokus cadence — tetap HR < 140, melatih pola langkah.
      const reps = Math.min(6, Math.floor(main / 3));
      const lead = main - reps * 3;
      title = `Easy Z2 + Cadence Drill ${reps}×1'`;
      blocks = [
        warmup,
        ...(lead > 0 ? [block("main", "Z2 Steady", [easyRun(lead)])] : []),
        block(
          "main",
          "Cadence Drill",
          [easyRun(1, S.cadenceFocus(cadence.target)), easyRun(2, S.z2Normal)],
          reps,
        ),
        cooldown,
      ];
      notes.push(N.cadenceDrill);
    }
    notes.push(N.easyHr(t.easyBelow));
  } else if (difficulty === "moderate") {
    const fits = MODERATE_OPTIONS[duration].filter((x) => moderateFits(x, input.pattern));
    const o = rng.pick(fits.length ? fits : MODERATE_OPTIONS[duration]);
    const warmup = block("warmup", B.warmupZ2, [easyRun(o.wu, S.wuBuild)]);
    if (o.kind === "progression") {
      const cd = duration - o.wu - o.z2 - o.tempo;
      title = `Progression Run ${o.z2}' Z2 → ${o.tempo}' Tempo`;
      blocks = [
        warmup,
        block("main", "Z2 Steady", [easyRun(o.z2)]),
        block("main", B.toTempo, [{ kind: "run", label: S.tempoNoBreak, durationMin: o.tempo, ...t.tempo }]),
        block("cooldown", B.cooldown, [jog(cd, S.cdJog)]),
      ];
      notes.push(N.progression);
    } else {
      const cd = duration - o.wu - o.reps * (o.work + o.rest);
      const cruise = o.reps > 1 && o.rest <= 1;
      const tempoStep: RunStep = { kind: "run", label: "Tempo", durationMin: o.work, ...t.tempo };
      title = o.reps === 1 ? `Tempo Continuous ${o.work}'` : cruise ? `Cruise Interval ${o.reps}×${o.work}'` : `Tempo ${o.reps}×${o.work}'`;
      blocks = [
        warmup,
        block("main", cruise ? "Cruise Interval" : B.tempoBlock, o.rest > 0 ? [tempoStep, jog(o.rest)] : [tempoStep], o.reps),
        block("cooldown", B.cooldown, [jog(cd, S.cdJog)]),
      ];
      if (cruise) notes.push(N.cruise);
    }
    notes.push(N.tempo);
  } else if (duration === 30) {
    // Mini interval: repetisi dihitung supaya muat dalam durasi target.
    const wu = 10;
    const minCd = 5;
    const pattern = rng.pick(MINI_PATTERNS);
    const reps = Math.min(pattern.max, Math.floor((duration - wu - minCd) / (pattern.work + pattern.rest)));
    const cd = duration - wu - reps * (pattern.work + pattern.rest);
    title = `Mini Interval ${reps}×${fmtWork(pattern.work)}`;
    blocks = [
      block("warmup", B.warmupZ2, [easyRun(wu, S.wuStrides)]),
      block(
        "main",
        "Mini Interval",
        [
          { kind: "run", label: "Interval", durationMin: pattern.work, ...t.mini },
          walk(pattern.rest, S.recoveryWalk),
        ],
        reps,
      ),
      block("cooldown", B.cooldown, [jog(cd, S.cdJog)]),
    ];
    notes.push(N.formBreak);
  } else if (pickHigh(rng.pick(["4x4", "15/15"] as const), input.pattern) === "4x4" || p.rules.avoidSprints) {
    // Kondisi tendon (Achilles) → tanpa sprint 15/15; 4×4 tetap dipakai.
    // Norwegian 4x4 (Helgerud dkk. 2007): 4×(4' kerja + 3' recovery jog) = 28 menit.
    const wu = duration === 45 ? 10 : 12;
    const flush = duration === 60 ? 12 : 0;
    const cd = duration - wu - 28 - flush;
    title = "Norwegian 4×4";
    blocks = [
      block("warmup", B.warmupZ2, [easyRun(wu, S.wuStrides)]),
      block("main", "Norwegian 4×4", [{ kind: "run", label: "Interval 4'", durationMin: 4, ...t.norwegian }, jog(3)], 4),
      ...(flush > 0 ? [block("main", "Aerobic Flush", [easyRun(flush, "Easy Z2 flush")])] : []),
      block("cooldown", B.cooldown, [jog(cd, S.cdJog)]),
    ];
    notes.push(N.recoveryJog);
  } else {
    // 15/15 (Helgerud dkk. 2007): set 20×(15" cepat / 15" jog lambat), 3' jog antar set.
    const sets = duration === 45 ? 2 : 3;
    const wu = 12;
    const main: RunBlock[] = [];
    for (let i = 1; i <= sets; i++) {
      main.push(
        block(
          "main",
          `15/15 Set ${i}`,
          [
            { kind: "run", label: S.fast15, durationMin: 0.25, ...t.mini },
            { kind: "jog", label: S.slow15, durationMin: 0.25, pace: "santai", hr: t.jogDownHr, rpe: "3–4" },
          ],
          20,
        ),
      );
      if (i < sets) main.push(block("main", B.jogBetween, [jog(3)]));
    }
    const cd = duration - wu - sets * 10 - (sets - 1) * 3;
    title = `15/15 Interval ${sets}×20`;
    blocks = [
      block("warmup", B.warmupZ2, [easyRun(wu, S.wuStrides)]),
      ...main,
      block("cooldown", B.cooldown, [jog(cd, S.cdJog)]),
    ];
    notes.push(N.f1515);
  }

  if (cadence.note) notes.push(cadence.note);
  if (blockCtx.deload) {
    notes.push(
      difficulty === "high"
        ? N.deloadHigh
        : N.deload,
    );
  }

  const workout: RunWorkout = {
    kind: "run",
    title: `${title} · ${DIFFICULTY_LABEL[difficulty]} ${duration}'`,
    duration,
    difficulty,
    seed,
    blocks,
    notes: [
      ...(p.rules.cadenceCue ? [N.cadence] : []),
      ...(p.rules.crossoverCue ? [N.crossover] : []),
      ...notes,
      ...p.rules.runNotes,
      ...p.customConditions.map((c) => N.custom(c)),
    ],
  };
  assertValidRun(workout, p.rules);
  return workout;
}
