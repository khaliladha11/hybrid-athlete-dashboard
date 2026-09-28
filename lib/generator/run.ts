import { profile, type AthleteProfile } from "@/lib/profile";
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

export interface RunInput {
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
}

export function generateRunWorkout(input: RunInput, p: AthleteProfile = profile): RunWorkout {
  const { duration, difficulty, seed } = input;
  const rng = createRng(seed);
  const t = runTargets(p);

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
    const variant = rng.pick(["continuous", "runWalk"] as const);
    const warmup = block("warmup", "Pemanasan", [walk(5, "Jalan cepat + dynamic drill ringan")]);
    const cooldown = block("cooldown", "Pendinginan", [walk(5, "Jalan santai + calf stretch")]);
    if (variant === "continuous") {
      title = `Easy Z2 Continuous ${main}'`;
      blocks = [warmup, block("main", "Continuous Zone 2", [easyRun(main)]), cooldown];
    } else {
      const reps = Math.floor(main / 5);
      title = `Easy Run-Walk ${reps}×(4'/1')`;
      blocks = [
        warmup,
        block("main", "Run-Walk", [easyRun(4, "Lari Z2"), walk(1, "Jalan")], reps),
        cooldown,
      ];
    }
    notes.push("Jaga HR < 140. Kalau HR naik, perlambat atau jalan sampai turun.");
  } else if (difficulty === "moderate") {
    const options: Record<Duration, { wu: number; reps: number; work: number; rest: number }[]> = {
      30: [
        { wu: 10, reps: 1, work: 12, rest: 0 },
        { wu: 8, reps: 2, work: 6, rest: 2 },
      ],
      45: [
        { wu: 10, reps: 2, work: 10, rest: 3 },
        { wu: 10, reps: 3, work: 7, rest: 2 },
      ],
      60: [
        { wu: 12, reps: 3, work: 10, rest: 3 },
        { wu: 12, reps: 2, work: 15, rest: 3 },
      ],
    };
    const o = rng.pick(options[duration]);
    const cd = duration - o.wu - o.reps * (o.work + o.rest);
    const tempoStep: RunStep = { kind: "run", label: "Tempo", durationMin: o.work, ...t.tempo };
    title = o.reps === 1 ? `Tempo Continuous ${o.work}'` : `Tempo ${o.reps}×${o.work}'`;
    blocks = [
      block("warmup", "Pemanasan Z2", [easyRun(o.wu, "Easy jog Z2 (2 menit terakhir naik bertahap)")]),
      block("main", "Blok Tempo", o.rest > 0 ? [tempoStep, jog(o.rest)] : [tempoStep], o.reps),
      block("cooldown", "Pendinginan", [jog(cd, "Jog/jalan santai")]),
    ];
    notes.push("Tempo = 'comfortably hard': masih bisa bicara 3–4 kata.");
  } else if (duration === 30) {
    // Mini interval: repetisi dihitung supaya muat dalam durasi target.
    const wu = 10;
    const minCd = 5;
    const pattern = rng.pick([
      { work: 1, rest: 1 },
      { work: 2, rest: 2 },
      { work: 3, rest: 2 },
    ]);
    const reps = Math.min(8, Math.floor((duration - wu - minCd) / (pattern.work + pattern.rest)));
    const cd = duration - wu - reps * (pattern.work + pattern.rest);
    title = `Mini Interval ${reps}×${pattern.work}'`;
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
  } else {
    // Norwegian 4x4: 4×(4' kerja + 3' recovery jog) = 28 menit.
    const wu = duration === 45 ? 10 : 12;
    const flush = duration === 60 ? 12 : 0;
    const cd = duration - wu - 28 - flush;
    title = "Norwegian 4×4";
    blocks = [
      block("warmup", "Pemanasan Z2", [easyRun(wu, "Easy jog Z2 + 3 strides ringan")]),
      block(
        "main",
        "Norwegian 4×4",
        [{ kind: "run", label: "Interval 4'", durationMin: 4, ...t.norwegian }, jog(3)],
        4,
      ),
      ...(flush > 0 ? [block("main", "Aerobic Flush", [easyRun(flush, "Easy Z2 flush")])] : []),
      block("cooldown", "Pendinginan", [jog(cd, "Jog/jalan santai")]),
    ];
    notes.push("Recovery jog tetap bergerak — jangan berhenti total.");
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
