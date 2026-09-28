import { parseWeight, profile, type AthleteProfile, type Movement, type MovementCategory } from "@/lib/profile";
import { createRng, type Rng } from "./rng";
import {
  DIFFICULTY_LABEL,
  STRENGTH_TYPE_LABEL,
  type Difficulty,
  type Duration,
  type LoadPrescription,
  type StrengthItem,
  type StrengthType,
  type StrengthWorkout,
} from "./types";
import { itemSeconds, META, STABILITY_HIP } from "./meta";
import { assertValidStrength, sanitizeStrength } from "./validate";

export const STRENGTH_RPE: Record<Difficulty, number> = { easy: 5, moderate: 6, high: 7 };
const REST_SEC: Record<Difficulty, number> = { easy: 60, moderate: 75, high: 90 };
const ACCESSORY_REST_SEC = 45;
const DEFAULT_REPS: Record<Difficulty, string> = { easy: "12", moderate: "10–12", high: "8–10" };
const SETS: Record<Difficulty, { base: number; max: number }> = {
  easy: { base: 2, max: 3 },
  moderate: { base: 2, max: 4 },
  high: { base: 3, max: 4 },
};
const MIN_SETS = 2;
const WARMUP_MIN = 5;
const COOLDOWN_MIN = 5;
type Slot =
  | { kind: "fixed"; name: string; role: ItemRole }
  | { kind: "pool"; category: MovementCategory; role: ItemRole; include?: string[] };

type ItemRole = "main" | "accessory";

/** Rencana slot per tipe × durasi. Urutan = urutan di sesi. */
function planSlots(type: StrengthType, duration: Duration, rng: Rng): Slot[] {
  const extra = duration === 30 ? 0 : duration === 45 ? 1 : 2;
  const hipStability: Slot = { kind: "pool", category: "stabilityAndCore", role: "accessory", include: STABILITY_HIP };
  const prehab: Slot[] = [
    { kind: "fixed", name: "Tibialis Wall Raise", role: "accessory" },
    { kind: "fixed", name: "Eccentric Calf Raise", role: "accessory" },
  ];
  const deadBug: Slot = { kind: "fixed", name: "Dead Bug", role: "accessory" };
  const pool = (category: MovementCategory, n: number): Slot[] =>
    Array.from({ length: n }, () => ({ kind: "pool", category, role: "main" }) as Slot);

  switch (type) {
    case "lower":
      return [hipStability, ...pool("lower", 2 + extra), ...(duration === 60 ? [deadBug] : []), ...prehab];
    case "fullBody": {
      const upperExtra = extra === 0 ? [] : extra === 1 ? pool(rng.pick(["upperPush", "upperPull"] as const), 1) : [...pool("upperPush", 1), ...pool("upperPull", 1)];
      return [
        hipStability,
        ...pool("lower", 1 + (extra > 0 ? 1 : 0)),
        ...pool("upperPush", 1),
        ...pool("upperPull", 1),
        ...upperExtra,
        ...(duration === 60 ? [deadBug] : []),
        ...prehab,
      ];
    }
    case "upperPush":
      return [...pool("upperPush", 3 + extra), ...(duration !== 30 ? [deadBug] : [])];
    case "upperPull":
      // Progresi pull-up SELALU di awal selagi grip masih segar.
      return [
        { kind: "fixed", name: "Dead Hang", role: "main" },
        { kind: "fixed", name: "Negative Pull-Up", role: "main" },
        ...pool("upperPull", 2 + extra),
        ...(duration === 60 ? [deadBug] : []),
      ];
  }
}

export function prescribeLoad(weight: string, difficulty: Difficulty): LoadPrescription {
  const spec = parseWeight(weight);
  if (spec.kind === "bodyweight") return spec;
  if (spec.kind === "band") {
    const band = difficulty === "high" ? spec.options[spec.options.length - 1] : spec.options[0];
    return { kind: "band", band };
  }
  const span = spec.max - spec.min;
  if (span === 0) return { ...spec };
  const step = span >= 2 ? 0.5 : 0.25;
  const [lo, hi] = difficulty === "easy" ? [0, 1 / 3] : difficulty === "moderate" ? [1 / 3, 2 / 3] : [2 / 3, 1];
  const clamp = (v: number) => Math.min(spec.max, Math.max(spec.min, v));
  const min = clamp(Math.floor((spec.min + span * lo) / step) * step);
  const max = clamp(Math.ceil((spec.min + span * hi) / step) * step);
  return { ...spec, min, max: Math.max(min, max) };
}

export interface StrengthInput {
  type: StrengthType;
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
}

export function generateStrengthWorkout(input: StrengthInput, p: AthleteProfile = profile): StrengthWorkout {
  const { type, duration, difficulty, seed } = input;
  const rng = createRng(seed);
  const lib = p.movementLibrary;
  const rpe = STRENGTH_RPE[difficulty];

  const usable = (m: Movement | undefined): m is Movement => !!m && m.available !== false;
  const byName = (name: string) =>
    (["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const)
      .flatMap((c) => lib[c] ?? [])
      .find((m) => m.name === name);

  // Pool acak per kategori (tanpa duplikasi di satu sesi).
  const used = new Set<string>();
  const shuffled = new Map<MovementCategory, Movement[]>();
  const takeFrom = (category: MovementCategory, include?: string[]): Movement | undefined => {
    if (!shuffled.has(category)) shuffled.set(category, rng.shuffle((lib[category] ?? []).filter(usable)));
    const list = shuffled.get(category)!;
    const idx = list.findIndex((m) => !used.has(m.name) && (!include || include.includes(m.name)));
    return idx >= 0 ? list[idx] : undefined;
  };

  const main: StrengthItem[] = [];
  const accessories = new Set<StrengthItem>();
  const makeItem = (m: Movement, role: ItemRole): StrengthItem => {
    used.add(m.name);
    const meta = META[m.name] ?? {};
    const reps = meta.holdSec ? undefined : typeof meta.reps === "string" ? meta.reps : (meta.reps?.[difficulty] ?? DEFAULT_REPS[difficulty]);
    const item: StrengthItem = {
      phase: "main",
      movement: m.name,
      sets: role === "accessory" ? 2 : SETS[difficulty].base,
      reps,
      durationSec: meta.holdSec?.[difficulty],
      load: prescribeLoad(m.weight, difficulty),
      restSec: role === "accessory" ? ACCESSORY_REST_SEC : REST_SEC[difficulty],
      rpe,
      cue: meta.cue,
    };
    if (role === "accessory") accessories.add(item);
    return item;
  };

  for (const slot of planSlots(type, duration, rng)) {
    const m = slot.kind === "fixed" ? byName(slot.name) : takeFrom(slot.category, slot.include);
    if (usable(m) && !used.has(m.name)) main.push(makeItem(m, slot.role));
  }

  const budgetSec = (duration - WARMUP_MIN - COOLDOWN_MIN) * 60;
  fitSetsToBudget(main, accessories, budgetSec, difficulty);

  // Masih kurang waktu (volume Easy dibatasi) → tambah gerakan pengisi yang relevan.
  const fillers = FILLER_CATEGORIES[type];
  const prehabNames = new Set((lib.prehab ?? []).map((m) => m.name));
  while (budgetSec - totalSeconds(main) > 90) {
    let next: { m: Movement; role: ItemRole } | undefined;
    for (const f of fillers) {
      const m = takeFrom(f.category);
      if (m) {
        next = { m, role: f.role };
        break;
      }
    }
    if (!next) break;
    const item = makeItem(next.m, next.role);
    // Prehab tetap di akhir sesi.
    const at = main.findIndex((i) => prehabNames.has(i.movement));
    main.splice(at >= 0 ? at : main.length, 0, item);
    resetRest(main, accessories, difficulty);
    fitSetsToBudget(main, accessories, budgetSec, difficulty);
  }

  const wc = lib.warmupAndCooldown ?? [];
  const has = (n: string) => wc.includes(n);
  const isUpper = type === "upperPush" || type === "upperPull";
  const warmupNames = (isUpper ? ["Cat-Cow", "Band Pull-Apart"] : ["Cat-Cow", "Kneeling Hip Flexor Stretch"]).filter(has);
  const cooldownNames = (isUpper ? ["Kneeling Hip Flexor Stretch", "Cat-Cow"] : ["Kneeling Hip Flexor Stretch", "Calf Stretch"]).filter(has);
  const flex = (name: string, phase: "warmup" | "cooldown", totalMin: number, n: number): StrengthItem => ({
    phase,
    movement: name,
    sets: 1,
    durationSec: Math.round((totalMin * 60) / n),
    load: name === "Band Pull-Apart" ? { kind: "band", band: "Light" } : { kind: "bodyweight" },
    restSec: 0,
  });

  const workout: StrengthWorkout = {
    kind: "strength",
    title: `${STRENGTH_TYPE_LABEL[type]} · ${DIFFICULTY_LABEL[difficulty]} ${duration}'`,
    type,
    duration,
    difficulty,
    seed,
    items: [
      ...warmupNames.map((n) => flex(n, "warmup", WARMUP_MIN, warmupNames.length)),
      ...main,
      ...cooldownNames.map((n) => flex(n, "cooldown", COOLDOWN_MIN, cooldownNames.length)),
    ],
    notes: [
      `Intensitas RPE ${rpe} — sisakan ${10 - rpe} repetisi di "tangki". Jangan sampai gagal (failure).`,
      "Spine-Friendly: tanpa beban axial berat tanpa tumpuan. Rib cage turun, core aktif di setiap gerakan.",
      "Jeda latihan beban berat 24–48 jam sebelum MCU/tes darah.",
    ],
  };

  if (type === "upperPull") {
    workout.notes.unshift("Progresi pull-up dikerjakan paling awal selagi grip masih segar.");
  }
  if (type === "upperPull" && !main.some((i) => i.movement === "Negative Pull-Up")) {
    workout.notes.push("Negative Pull-Up belum aktif — fokus Dead Hang dulu. Ubah \"available\" jadi true di profil saat siap.");
  }

  const clean = sanitizeStrength(workout, lib);
  assertValidStrength(clean, lib);
  return clean;
}

/**
 * Tambah/kurangi set sampai estimasi waktu inti mendekati budget.
 * Set tambahan diprioritaskan ke gerakan utama, baru kemudian aksesori.
 */
const FILLER_CATEGORIES: Record<StrengthType, { category: MovementCategory; role: ItemRole }[]> = {
  upperPush: [
    { category: "upperPush", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
    { category: "prehab", role: "accessory" },
  ],
  upperPull: [
    { category: "upperPull", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
    { category: "prehab", role: "accessory" },
  ],
  lower: [
    { category: "lower", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
  ],
  fullBody: [
    { category: "lower", role: "main" },
    { category: "upperPull", role: "main" },
    { category: "upperPush", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
  ],
};

function totalSeconds(items: StrengthItem[]): number {
  return items.reduce((s, it) => s + itemSeconds(it), 0);
}

function resetRest(items: StrengthItem[], accessories: Set<StrengthItem>, difficulty: Difficulty) {
  for (const it of items) it.restSec = accessories.has(it) ? ACCESSORY_REST_SEC : REST_SEC[difficulty];
}

function fitSetsToBudget(
  items: StrengthItem[],
  accessories: Set<StrengthItem>,
  budgetSec: number,
  difficulty: Difficulty,
) {
  const total = () => totalSeconds(items);
  const { max } = SETS[difficulty];
  const order = [...items.filter((i) => !accessories.has(i)), ...items.filter((i) => accessories.has(i))];
  const cap = (it: StrengthItem) => (accessories.has(it) ? 3 : max);

  // Kurangi dulu kalau kelebihan.
  let guard = 0;
  while (total() > budgetSec + 60 && guard++ < 50) {
    const candidate = [...order].reverse().find((it) => it.sets > MIN_SETS);
    if (!candidate) break;
    candidate.sets--;
  }

  // Tambah set selama tidak melewati budget.
  let added = true;
  while (added) {
    added = false;
    for (const it of order) {
      if (it.sets >= cap(it)) continue;
      const delta = itemSeconds({ ...it, sets: it.sets + 1 }) - itemSeconds(it);
      if (total() + delta <= budgetSec + 60) {
        it.sets++;
        added = true;
      }
    }
  }

  // Sisa waktu kecil → tambahkan ke istirahat gerakan utama (maks +30 detik).
  const mains = order.filter((i) => !accessories.has(i) && i.sets > 1);
  guard = 0;
  while (budgetSec - total() >= 60 && mains.length && guard++ < 20) {
    let changed = false;
    for (const it of mains) {
      if (budgetSec - total() < (it.sets - 1) * 15) break;
      if (it.restSec < REST_SEC[difficulty] + 30) {
        it.restSec += 15;
        changed = true;
      }
    }
    if (!changed) break;
  }
}
