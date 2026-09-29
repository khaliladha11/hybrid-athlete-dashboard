import { profile, type AthleteProfile } from "@/lib/profile";
import { DEFAULT_BLOCK, type BlockContext } from "./block";
import { createRng } from "./rng";
import { DIFFICULTY_LABEL, type Difficulty, type Duration, type RunBlock, type RunStep, type RunWorkout } from "./types";
import { assertValidRun } from "./validate";

/**
 * Preskripsi zona untuk generator. Pace diambil dari profil (dengan fallback),
 * sedangkan HR memakai acuan yang lebih konservatif dari profil:
 * Easy < 140, Tempo 160–170.
 */
export function runTargets(p: AthleteProfile = profile) {
  const z = p.runZones ?? {};
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v.replace(/\/km$/, "") + "/km" : fallback;
  return {
    easy: { pace: str(z.easy?.pace, "8:00–8:50/km"), hr: "< 140", rpe: "3–4" },
    tempo: { pace: str(z.tempo?.pace, "6:15–6:30/km"), hr: "160–170", rpe: "6–7" },
    mini: { pace: str(z.miniInterval?.pace, "5:15–5:35/km"), hr: "Z4–Z5", rpe: "7–8" },
    norwegian: { pace: str(z.norwegian4x4?.pace, "5:50/km"), hr: "Z4", rpe: "7–8" },
    recovery: { hr: "< 130", rpe: "2–3" },
  };
}

export const CADENCE_NOTES = [
  "Cadence 175–180 SPM — langkah pendek & cepat, jangan overstride.",
  'Cue "rel kereta": kaki mendarat di dua rel sejajar selebar pinggul, jangan menyilang (crossover).',
];

/**
 * Target cadence personal dari data asli (Heiderscheit dkk. 2011: naik 5–10%
 * mengurangi beban lutut/pinggul). Bertahap +5%, maksimal 180 SPM.
 */
export function cadenceTarget(avgSpm?: number): { target: number; note?: string } {
  if (!avgSpm || !Number.isFinite(avgSpm)) return { target: 180 };
  const avg = Math.round(avgSpm);
  if (avg >= 175) {
    return { target: avg, note: `Cadence rata-rata 14 hari: ${avg} SPM — sudah di zona target, pertahankan.` };
  }
  const target = Math.min(180, Math.round(avg * 1.05));
  return {
    target,
    note: `Cadence rata-rata 14 hari: ${avg} SPM → target sesi ini ${target} SPM (naik ±5% bertahap).`,
  };
}

export interface RunInput {
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
  /** Konteks blok periodisasi (minggu deload menambah catatan). */
  block?: BlockContext;
  /** Cadence rata-rata lari terakhir (SPM total) untuk target personal. */
  cadenceSpm?: number;
}

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

const MINI_PATTERNS = [
  { work: 1, rest: 1, max: 8 },
  { work: 2, rest: 2, max: 8 },
  { work: 3, rest: 2, max: 8 },
  { work: 0.5, rest: 0.5, max: 12 },
];

export function generateRunWorkout(input: RunInput, p: AthleteProfile = profile): RunWorkout {
  const { duration, difficulty, seed, block: blockCtx = DEFAULT_BLOCK } = input;
  const rng = createRng(seed);
  const t = runTargets(p);
  const cadence = cadenceTarget(input.cadenceSpm);

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
  const walk = (min: number, label = "Jalan"): RunStep => ({
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
    const variant = rng.pick(["continuous", "runWalk", "cadenceDrill"] as const);
    const warmup = block("warmup", "Pemanasan", [walk(5, "Jalan cepat + dynamic drill ringan")]);
    const cooldown = block("cooldown", "Pendinginan", [walk(5, "Jalan santai + calf stretch")]);
    if (variant === "continuous") {
      title = `Easy Z2 Continuous ${main}'`;
      blocks = [warmup, block("main", "Continuous Zone 2", [easyRun(main)]), cooldown];
    } else if (variant === "runWalk") {
      const reps = Math.floor(main / 5);
      title = `Easy Run-Walk ${reps}×(4'/1')`;
      blocks = [warmup, block("main", "Run-Walk", [easyRun(4, "Lari Z2"), walk(1, "Jalan")], reps), cooldown];
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
          [easyRun(1, `Fokus cadence ${cadence.target} SPM (langkah pendek)`), easyRun(2, "Z2 normal")],
          reps,
        ),
        cooldown,
      ];
      notes.push("Cadence drill: pace tetap Z2 — yang berubah hanya frekuensi langkah, bukan kecepatan.");
    }
    notes.push("Jaga HR < 140. Kalau HR naik, perlambat atau jalan sampai turun.");
  } else if (difficulty === "moderate") {
    const o = rng.pick(MODERATE_OPTIONS[duration]);
    const warmup = block("warmup", "Pemanasan Z2", [easyRun(o.wu, "Easy jog Z2 (2 menit terakhir naik bertahap)")]);
    if (o.kind === "progression") {
      const cd = duration - o.wu - o.z2 - o.tempo;
      title = `Progression Run ${o.z2}' Z2 → ${o.tempo}' Tempo`;
      blocks = [
        warmup,
        block("main", "Z2 Steady", [easyRun(o.z2)]),
        block("main", "Naik ke Tempo", [{ kind: "run", label: "Tempo (tanpa jeda)", durationMin: o.tempo, ...t.tempo }]),
        block("cooldown", "Pendinginan", [jog(cd, "Jog/jalan santai")]),
      ];
      notes.push("Progression run: transisi langsung dari Z2 ke tempo tanpa berhenti.");
    } else {
      const cd = duration - o.wu - o.reps * (o.work + o.rest);
      const cruise = o.reps > 1 && o.rest <= 1;
      const tempoStep: RunStep = { kind: "run", label: "Tempo", durationMin: o.work, ...t.tempo };
      title = o.reps === 1 ? `Tempo Continuous ${o.work}'` : cruise ? `Cruise Interval ${o.reps}×${o.work}'` : `Tempo ${o.reps}×${o.work}'`;
      blocks = [
        warmup,
        block("main", cruise ? "Cruise Interval" : "Blok Tempo", o.rest > 0 ? [tempoStep, jog(o.rest)] : [tempoStep], o.reps),
        block("cooldown", "Pendinginan", [jog(cd, "Jog/jalan santai")]),
      ];
      if (cruise) notes.push("Cruise interval: jeda pendek 1' supaya tetap di ambang — jangan dipercepat.");
    }
    notes.push("Tempo = 'comfortably hard': masih bisa bicara 3–4 kata.");
  } else if (duration === 30) {
    // Mini interval: repetisi dihitung supaya muat dalam durasi target.
    const wu = 10;
    const minCd = 5;
    const pattern = rng.pick(MINI_PATTERNS);
    const reps = Math.min(pattern.max, Math.floor((duration - wu - minCd) / (pattern.work + pattern.rest)));
    const cd = duration - wu - reps * (pattern.work + pattern.rest);
    title = `Mini Interval ${reps}×${fmtWork(pattern.work)}`;
    blocks = [
      block("warmup", "Pemanasan Z2", [easyRun(wu, "Easy jog Z2 + 3 strides ringan")]),
      block(
        "main",
        "Mini Interval",
        [
          { kind: "run", label: "Interval", durationMin: pattern.work, ...t.mini },
          walk(pattern.rest, "Jalan/jog pemulihan"),
        ],
        reps,
      ),
      block("cooldown", "Pendinginan", [jog(cd, "Jog/jalan santai")]),
    ];
    notes.push("Kalau form mulai rusak (cadence turun, kaki menyilang), hentikan repetisi.");
  } else if (rng.pick(["4x4", "15/15"] as const) === "4x4") {
    // Norwegian 4x4 (Helgerud dkk. 2007): 4×(4' kerja + 3' recovery jog) = 28 menit.
    const wu = duration === 45 ? 10 : 12;
    const flush = duration === 60 ? 12 : 0;
    const cd = duration - wu - 28 - flush;
    title = "Norwegian 4×4";
    blocks = [
      block("warmup", "Pemanasan Z2", [easyRun(wu, "Easy jog Z2 + 3 strides ringan")]),
      block("main", "Norwegian 4×4", [{ kind: "run", label: "Interval 4'", durationMin: 4, ...t.norwegian }, jog(3)], 4),
      ...(flush > 0 ? [block("main", "Aerobic Flush", [easyRun(flush, "Easy Z2 flush")])] : []),
      block("cooldown", "Pendinginan", [jog(cd, "Jog/jalan santai")]),
    ];
    notes.push("Recovery jog tetap bergerak — jangan berhenti total.");
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
            { kind: "run", label: 'Cepat 15"', durationMin: 0.25, ...t.mini },
            { kind: "jog", label: 'Jog lambat 15"', durationMin: 0.25, pace: "santai", hr: "turun ke Z2", rpe: "3–4" },
          ],
          20,
        ),
      );
      if (i < sets) main.push(block("main", "Jog antar set", [jog(3)]));
    }
    const cd = duration - wu - sets * 10 - (sets - 1) * 3;
    title = `15/15 Interval ${sets}×20`;
    blocks = [
      block("warmup", "Pemanasan Z2", [easyRun(wu, "Easy jog Z2 + 3 strides ringan")]),
      ...main,
      block("cooldown", "Pendinginan", [jog(cd, "Jog/jalan santai")]),
    ];
    notes.push('15/15: 15" cepat terkontrol, 15" jog lambat — jangan berhenti. Akhiri set kalau form mulai rusak.');
  }

  if (cadence.note) notes.push(cadence.note);
  if (blockCtx.deload) {
    notes.push(
      difficulty === "high"
        ? "Minggu deload: sesi berat sebaiknya diganti Moderate/Easy kecuali badan benar-benar segar."
        : "Minggu deload: jaga sesi tetap ringan, fokus pemulihan.",
    );
  }

  const workout: RunWorkout = {
    kind: "run",
    title: `${title} · ${DIFFICULTY_LABEL[difficulty]} ${duration}'`,
    duration,
    difficulty,
    seed,
    blocks,
    notes: [...CADENCE_NOTES, ...notes],
  };
  assertValidRun(workout);
  return workout;
}
