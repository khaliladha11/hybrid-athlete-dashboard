import { parseWeight, profile, type Movement, type MovementCategory, type ResolvedProfile } from "@/lib/profile";
import type { ActiveRules } from "@/lib/conditions";
import { blockLabel, DEFAULT_BLOCK, type BlockContext } from "./block";
import { createRng, type Rng } from "./rng";
import {
  DIFFICULTY_LABEL,
  STRENGTH_TYPES,
  STRENGTH_TYPE_LABEL,
  type Difficulty,
  type Duration,
  type LoadPrescription,
  type StrengthItem,
  type StrengthType,
  type StrengthWorkout,
} from "./types";
import { ANCHOR_SINCE, COMPOUND_MOVEMENTS, estimateStrengthMinutes, itemSeconds, LOWER_PREHAB, META, SHOULDER_PREHAB, STABILITY_HIP } from "./meta";
import { assertValidStrength, DURATION_TOLERANCE_MIN, sanitizeStrength } from "./validate";

export const STRENGTH_RPE: Record<Difficulty, number> = { easy: 5, moderate: 6, high: 7 };
/** Minggu deload: RPE turun satu (tidak di bawah 5). */
export function strengthRpe(difficulty: Difficulty, deload: boolean): number {
  return deload ? Math.max(5, STRENGTH_RPE[difficulty] - 1) : STRENGTH_RPE[difficulty];
}

const REST_SEC: Record<Difficulty, number> = { easy: 60, moderate: 75, high: 90 };
const ACCESSORY_REST_SEC = 45;
const SETS: Record<Difficulty, { base: number; max: number }> = {
  easy: { base: 2, max: 3 },
  moderate: { base: 2, max: 4 },
  high: { base: 3, max: 4 },
};
const MIN_SETS = 2;
const WARMUP_MIN = 5;
const COOLDOWN_MIN = 5;

/**
 * Skema repetisi yang berputar antar sesi (undulating periodization,
 * Moesgaard dkk. 2022) — RPE tetap mengikuti level, maksimal 7.
 */
export const REP_SCHEMES = {
  volume: { label: "Volume", reps: "12–15", restDelta: -15 },
  standard: { label: "Standar", reps: "10–12", restDelta: 0 },
  tension: { label: "Tegangan", reps: "8–10", restDelta: 15 },
} as const;
type SchemeKey = keyof typeof REP_SCHEMES;
const SCHEMES_BY_DIFFICULTY: Record<Difficulty, SchemeKey[]> = {
  easy: ["volume", "standard"],
  moderate: ["volume", "standard", "tension"],
  high: ["standard", "tension"],
};

const LOWER_LEVEL: Record<Difficulty, Difficulty> = { easy: "easy", moderate: "easy", high: "moderate" };

type ItemRole = "main" | "accessory";

type Slot =
  | { kind: "fixed"; name: string; role: ItemRole; anchor?: boolean }
  | { kind: "pool"; category: MovementCategory; role: ItemRole; include?: string[]; anchor?: boolean };

/**
 * Rencana slot per tipe × durasi. Urutan = urutan di sesi.
 * Slot `anchor` = gerakan utama yang dikunci selama satu blok (variasi sistematis,
 * bukan acak — Kassiano dkk. 2022). Slot lain berputar tiap generate.
 */
function planSlots(
  type: StrengthType,
  duration: Duration,
  rng: Rng,
  rules: Pick<ActiveRules, "hipStability" | "requiredLower">,
  prehabNames: Set<string>,
  anchorPool: string[],
): Slot[] {
  const extra = duration === 30 ? 0 : duration === 45 ? 1 : 2;
  // Stabilitas panggul (gluteus medius) bila kondisi aktif mewajibkan; selain itu aktivasi core/stabilitas umum.
  const stability: Slot = rules.hipStability
    ? { kind: "pool", category: "stabilityAndCore", role: "accessory", include: STABILITY_HIP }
    : { kind: "pool", category: "stabilityAndCore", role: "accessory" };
  // Gerakan wajib dari kondisi aktif: core di tengah, prehab di akhir sesi.
  const fixed = (name: string): Slot => ({ kind: "fixed", name, role: "accessory" });
  const requiredCore = rules.requiredLower.filter((n) => !prehabNames.has(n)).map(fixed);
  const requiredPrehab = rules.requiredLower.filter((n) => prehabNames.has(n)).map(fixed);
  const deadBug = fixed("Dead Bug");
  const lowerCore = requiredCore.length ? requiredCore : duration === 60 ? [deadBug] : [];
  // 45'/60': satu prehab tambahan yang berputar (mis. Seated Single-Leg Calf Raise untuk soleus).
  const extraPrehab: Slot[] = duration === 30 ? [] : [{ kind: "pool", category: "prehab", role: "accessory", include: LOWER_PREHAB }];
  // Upper 45'/60': satu prehab bahu yang berputar (Scaption / External Rotation).
  const shoulderPrehab: Slot[] = duration === 30 ? [] : [{ kind: "pool", category: "prehab", role: "accessory", include: SHOULDER_PREHAB }];
  const pool = (category: MovementCategory, n: number, anchors = 0): Slot[] =>
    Array.from(
      { length: n },
      (_, i) => ({ kind: "pool", category, role: "main", ...(i < anchors ? { anchor: true, include: anchorPool } : {}) }) as Slot,
    );

  switch (type) {
    case "lower":
      return [stability, ...pool("lower", 2 + extra, 2), ...lowerCore, ...requiredPrehab, ...extraPrehab];
    case "fullBody": {
      const upperExtra =
        extra === 0
          ? []
          : extra === 1
            ? pool(rng.pick(["upperPush", "upperPull"] as const), 1)
            : [...pool("upperPush", 1), ...pool("upperPull", 1)];
      return [
        stability,
        ...pool("lower", 1, 1),
        ...(extra > 0 ? pool("lower", 1) : []),
        ...pool("upperPush", 1, 1),
        ...pool("upperPull", 1, 1),
        ...upperExtra,
        ...lowerCore,
        ...requiredPrehab,
        ...extraPrehab,
      ];
    }
    case "upperPush":
      return [...pool("upperPush", 3 + extra, 2), ...(duration !== 30 ? [deadBug] : []), ...shoulderPrehab];
    case "upperPull":
      // Progresi pull-up SELALU di awal selagi grip masih segar.
      return [
        { kind: "fixed", name: "Dead Hang", role: "main", anchor: true },
        { kind: "fixed", name: "Negative Pull-Up", role: "main", anchor: true },
        ...pool("upperPull", 2 + extra, 1),
        ...(duration === 60 ? [deadBug] : []),
        ...shoulderPrehab,
      ];
  }
}

/**
 * Rentang beban sesuai level dari rentang library (titik awal). Bila `loads` (beban yang bisa
 * dirakit dari alat) ada, hasil dipilih dari daftar itu. `maxKg` (0.14.0) = batas atas efektif
 * (min(alat, keamanan)); rentang level tidak pernah melewatinya.
 */
export function prescribeLoad(weight: string, difficulty: Difficulty, loads?: number[], maxKg?: number): LoadPrescription {
  const spec = parseWeight(weight);
  if (spec.kind === "bodyweight") return spec;
  if (spec.kind === "band") {
    const band = difficulty === "high" ? spec.options[spec.options.length - 1] : spec.options[0];
    return { kind: "band", band };
  }
  const span = spec.max - spec.min;
  if (span === 0) return snapToLoads({ ...spec }, loads);
  const step = span >= 2 ? 0.5 : 0.25;
  const [lo, hi] = difficulty === "easy" ? [0, 1 / 3] : difficulty === "moderate" ? [1 / 3, 2 / 3] : [2 / 3, 1];
  const hiCap = Math.min(spec.max, maxKg ?? spec.max);
  const clamp = (v: number) => Math.min(hiCap, Math.max(spec.min, v));
  const min = clamp(Math.floor((spec.min + span * lo) / step) * step);
  const max = clamp(Math.ceil((spec.min + span * hi) / step) * step);
  return snapToLoads({ ...spec, min, max: Math.max(min, max) }, loads);
}

function snapToLoads<T extends { min: number; max: number }>(range: T, loads?: number[]): T {
  if (!loads?.length) return range;
  const inRange = loads.filter((v) => v >= range.min - 1e-9 && v <= range.max + 1e-9);
  if (inRange.length) return { ...range, min: inRange[0], max: inRange[inRange.length - 1] };
  const mid = (range.min + range.max) / 2;
  const v = loads.reduce((best, x) => (Math.abs(x - mid) < Math.abs(best - mid) ? x : best), loads[0]);
  return { ...range, min: v, max: v };
}

export interface StrengthInput {
  type: StrengthType;
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
  /** Konteks blok periodisasi: menentukan gerakan utama & minggu deload. */
  block?: BlockContext;
  /**
   * Mode bebas (program blok dimatikan): tanpa deload, dan gerakan utama ★ dipilih
   * per sesi — bukan dikunci per blok. ★ tetap dicatat untuk progresi beban.
   */
  free?: boolean;
}

/** Seed deterministik per blok × tipe → gerakan utama sama selama satu blok. */
function anchorSeed(block: BlockContext, type: StrengthType): number {
  return (block.index + 1) * 100_003 + STRENGTH_TYPES.indexOf(type) * 7_919 + 17;
}

interface FitConfig {
  mainRest: number;
  maxSets: number;
}

export function generateStrengthWorkout(input: StrengthInput, p: ResolvedProfile = profile): StrengthWorkout {
  const { type, duration, difficulty, seed, free = false } = input;
  const block = free ? DEFAULT_BLOCK : (input.block ?? DEFAULT_BLOCK);
  const rng = createRng(seed);
  const anchorRng = free ? rng : createRng(anchorSeed(block, type));
  const lib = p.movementLibrary;
  const rules = p.rules;
  const deload = block.deload;
  const rpe = strengthRpe(difficulty, deload);
  const loadLevel = deload ? LOWER_LEVEL[difficulty] : difficulty;

  const schemeKey = rng.pick(SCHEMES_BY_DIFFICULTY[difficulty]);
  const scheme = REP_SCHEMES[schemeKey];
  const cfg: FitConfig = {
    mainRest: REST_SEC[difficulty] + scheme.restDelta,
    // Deload: satu set lebih sedikit per gerakan utama (Easy sudah ringan, tidak dipotong).
    maxSets: deload && difficulty !== "easy" ? Math.max(MIN_SETS, SETS[difficulty].max - 1) : SETS[difficulty].max,
  };
  const baseSets = Math.min(SETS[difficulty].base, cfg.maxSets);

  const usable = (m: Movement | undefined): m is Movement => !!m && m.available !== false;
  const byName = (name: string) =>
    (["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const)
      .flatMap((c) => lib[c] ?? [])
      .find((m) => m.name === name);

  // Ambil gerakan acak (sesuai rng yang diberikan) yang belum dipakai di sesi ini.
  const used = new Set<string>();
  const takeFrom = (r: Rng, category: MovementCategory, include?: string[]): Movement | undefined => {
    const candidates = (lib[category] ?? []).filter(
      (m) => usable(m) && !used.has(m.name) && (!include || include.includes(m.name)),
    );
    return candidates.length ? r.shuffle(candidates)[0] : undefined;
  };

  const main: StrengthItem[] = [];
  const accessories = new Set<StrengthItem>();
  const makeItem = (m: Movement, role: ItemRole, anchor = false): StrengthItem => {
    used.add(m.name);
    const meta = META[m.name] ?? {};
    const reps = meta.holdSec
      ? undefined
      : typeof meta.reps === "string"
        ? meta.reps
        : (meta.reps?.[difficulty] ?? scheme.reps);
    const item: StrengthItem = {
      phase: "main",
      movement: m.name,
      sets: role === "accessory" ? 2 : baseSets,
      reps,
      durationSec: meta.holdSec?.[difficulty],
      load: prescribeLoad(m.weight, loadLevel, m.loads, m.cap?.kg),
      restSec: role === "accessory" ? ACCESSORY_REST_SEC : cfg.mainRest,
      rpe,
      cue: meta.cue,
      ...(anchor ? { anchor: true } : {}),
      ...(role === "accessory" ? { accessory: true } : {}),
    };
    if (role === "accessory") accessories.add(item);
    return item;
  };

  const prehabNames = new Set((lib.prehab ?? []).map((m) => m.name));
  // Gerakan ★ baru baru berlaku di blok yang dimulai setelah gerakan itu ditambahkan (mode bebas: langsung).
  const anchorPool = COMPOUND_MOVEMENTS.filter((n) => free || !block.start || !ANCHOR_SINCE[n] || ANCHOR_SINCE[n] <= block.start);
  for (const slot of planSlots(type, duration, rng, rules, prehabNames, anchorPool)) {
    const m =
      slot.kind === "fixed"
        ? byName(slot.name)
        : takeFrom(slot.anchor ? anchorRng : rng, slot.category, slot.include);
    if (usable(m) && !used.has(m.name)) main.push(makeItem(m, slot.role, !!slot.anchor));
  }

  const budgetSec = (duration - WARMUP_MIN - COOLDOWN_MIN) * 60;
  fitSetsToBudget(main, accessories, budgetSec, cfg);

  // Masih kurang waktu (volume dibatasi) → tambah gerakan pengisi yang relevan.
  // Saat deload, pengisi diutamakan dari stabilitas/prehab (beban sendi rendah).
  const fillers = deload
    ? [...FILLER_CATEGORIES[type].filter((f) => f.role === "accessory"), ...FILLER_CATEGORIES[type].filter((f) => f.role === "main")]
    : FILLER_CATEGORIES[type];
  while (budgetSec - totalSeconds(main) > 90) {
    let next: { m: Movement; role: ItemRole } | undefined;
    for (const f of fillers) {
      const m = takeFrom(rng, f.category, f.include);
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
    resetRest(main, accessories, cfg);
    fitSetsToBudget(main, accessories, budgetSec, cfg);
  }

  // Gerakan aktif habis tapi waktu masih sisa (library dipersempit di Setting):
  // perpanjang istirahat gerakan utama sampai +60 detik sebelum menyerah.
  if (budgetSec - totalSeconds(main) > 90) extendRest(main, accessories, budgetSec, cfg.mainRest + 60);

  const wc = lib.warmupAndCooldown ?? [];
  const has = (n: string) => wc.includes(n);
  const isUpper = type === "upperPush" || type === "upperPull";
  const warmupNames = (isUpper ? ["Cat-Cow", "Band Pull-Apart"] : ["Cat-Cow", "Quadruped Hip Circles", "Kneeling Hip Flexor Stretch"]).filter(has);
  const cooldownNames = (isUpper ? ["Kneeling Hip Flexor Stretch", "Cat-Cow"] : ["Kneeling Hip Flexor Stretch", "Calf Stretch"]).filter(has);
  const flex = (name: string, phase: "warmup" | "cooldown", totalMin: number, n: number): StrengthItem => ({
    phase,
    movement: name,
    sets: 1,
    durationSec: Math.round((totalMin * 60) / n),
    load: name === "Band Pull-Apart" ? { kind: "band", band: "Light" } : { kind: "bodyweight" },
    restSec: 0,
  });

  const notes = [
    `Intensitas RPE ${rpe}: sisakan ${10 - rpe} repetisi di "tangki". Jangan sampai gagal (failure).`,
    `Skema ${scheme.label} (${scheme.reps} rep). Skema berputar antar sesi supaya stimulus bervariasi.`,
    free
      ? "Mode bebas: tanpa blok mingguan & deload. Gerakan ★ = gerakan utama sesi ini (tetap dicatat untuk progresi)."
      : `${blockLabel(block)}: gerakan bertanda ★ tetap sama sampai blok berganti; sisanya berganti tiap generate.`,
    ...rules.strengthNotes,
    ...p.customConditions.map((c) => `Catatan kondisimu: ${c}`),
  ];
  if (deload) notes.splice(1, 0, "Minggu deload: set dan beban diturunkan satu tingkat. Pulihkan, jangan kejar angka.");
  if (type === "upperPull") notes.unshift("Progresi pull-up dikerjakan paling awal selagi grip masih segar.");
  if (type === "upperPull" && !main.some((i) => i.movement === "Negative Pull-Up")) {
    notes.push("Negative Pull-Up belum aktif. Fokus Dead Hang dulu. Aktifkan di Setting › Movement library saat siap.");
  }

  const workout: StrengthWorkout = {
    kind: "strength",
    title: `${STRENGTH_TYPE_LABEL[type]} · ${DIFFICULTY_LABEL[difficulty]} ${duration}'`,
    type,
    duration,
    difficulty,
    seed,
    scheme: scheme.label,
    deload,
    items: [
      ...warmupNames.map((n) => flex(n, "warmup", WARMUP_MIN, warmupNames.length)),
      ...main,
      ...cooldownNames.map((n) => flex(n, "cooldown", COOLDOWN_MIN, cooldownNames.length)),
    ],
    notes,
  };

  // Masih jauh di bawah target → jujur: tandai sesi lebih pendek, jangan isi dengan volume berlebih.
  const est = estimateStrengthMinutes(workout);
  if (est < duration - DURATION_TOLERANCE_MIN) {
    workout.limited = true;
    workout.notes.unshift(
      `Gerakan aktif terbatas: sesi ini ±${Math.round(est)} menit. Aktifkan lebih banyak gerakan/alat di Setting untuk sesi ${duration}' penuh.`,
    );
  }

  const clean = sanitizeStrength(workout, lib, rules);
  assertValidStrength(clean, lib, rules);
  return clean;
}

/** Urutan pengisi sisa waktu. Prehab dipilih sesuai bagian tubuh sesi (bahu untuk Upper, tungkai untuk Lower/Full). */
const FILLER_CATEGORIES: Record<StrengthType, { category: MovementCategory; role: ItemRole; include?: string[] }[]> = {
  upperPush: [
    { category: "upperPush", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
    { category: "prehab", role: "accessory", include: SHOULDER_PREHAB },
    { category: "prehab", role: "accessory" },
  ],
  upperPull: [
    { category: "upperPull", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
    { category: "prehab", role: "accessory", include: SHOULDER_PREHAB },
    { category: "prehab", role: "accessory" },
  ],
  lower: [
    { category: "lower", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
    { category: "prehab", role: "accessory", include: LOWER_PREHAB },
  ],
  fullBody: [
    { category: "lower", role: "main" },
    { category: "upperPull", role: "main" },
    { category: "upperPush", role: "main" },
    { category: "stabilityAndCore", role: "accessory" },
    { category: "prehab", role: "accessory" },
  ],
};

/** Tambah istirahat gerakan utama per 15 detik sampai batas `maxRest` atau budget terisi. */
function extendRest(items: StrengthItem[], accessories: Set<StrengthItem>, budgetSec: number, maxRest: number) {
  const mains = items.filter((i) => !accessories.has(i) && i.sets > 1);
  let changed = true;
  while (changed && budgetSec - totalSeconds(items) >= 60) {
    changed = false;
    for (const it of mains) {
      if (budgetSec - totalSeconds(items) < (it.sets - 1) * 15) break;
      if (it.restSec < maxRest) {
        it.restSec += 15;
        changed = true;
      }
    }
  }
}

function totalSeconds(items: StrengthItem[]): number {
  return items.reduce((s, it) => s + itemSeconds(it), 0);
}

function resetRest(items: StrengthItem[], accessories: Set<StrengthItem>, cfg: FitConfig) {
  for (const it of items) it.restSec = accessories.has(it) ? ACCESSORY_REST_SEC : cfg.mainRest;
}

/**
 * Tambah/kurangi set sampai estimasi waktu inti mendekati budget.
 * Set tambahan diprioritaskan ke gerakan utama, baru kemudian aksesori.
 */
function fitSetsToBudget(items: StrengthItem[], accessories: Set<StrengthItem>, budgetSec: number, cfg: FitConfig) {
  const total = () => totalSeconds(items);
  const order = [...items.filter((i) => !accessories.has(i)), ...items.filter((i) => accessories.has(i))];
  const cap = (it: StrengthItem) => (accessories.has(it) ? 3 : cfg.maxSets);

  // Kurangi dulu kalau kelebihan. Bila semua sudah minimal, aksesori boleh tinggal 1 set
  // (gerakan wajib dari kondisi aktif tetap ada, volumenya yang dipangkas).
  let guard = 0;
  while (total() > budgetSec + 60 && guard++ < 50) {
    const candidate =
      [...order].reverse().find((it) => it.sets > MIN_SETS) ?? [...order].reverse().find((it) => accessories.has(it) && it.sets > 1);
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
      if (it.restSec < cfg.mainRest + 30) {
        it.restSec += 15;
        changed = true;
      }
    }
    if (!changed) break;
  }
}
