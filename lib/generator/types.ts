export const DURATIONS = [30, 45, 60] as const;
export const DIFFICULTIES = ["easy", "moderate", "high"] as const;
export const STRENGTH_TYPES = ["fullBody", "upperPush", "upperPull", "lower"] as const;

export type Duration = (typeof DURATIONS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type StrengthType = (typeof STRENGTH_TYPES)[number];
export type Phase = "warmup" | "main" | "cooldown";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  high: "High",
};

export const STRENGTH_TYPE_LABEL: Record<StrengthType, string> = {
  fullBody: "Full Body",
  upperPush: "Upper Push",
  upperPull: "Upper Pull",
  lower: "Lower",
};

export const PHASE_LABEL: Record<Phase, string> = {
  warmup: "Pemanasan",
  main: "Inti",
  cooldown: "Pendinginan",
};

// ---------- Lari ----------

export type RunStepKind = "run" | "walk" | "jog";

export interface RunStep {
  kind: RunStepKind;
  label: string;
  durationMin: number;
  pace?: string;
  hr?: string;
  rpe?: string;
}

/** Satu blok = daftar langkah yang diulang `repeat` kali. */
export interface RunBlock {
  phase: Phase;
  title: string;
  repeat: number;
  steps: RunStep[];
}

export interface RunWorkout {
  kind: "run";
  title: string;
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
  blocks: RunBlock[];
  notes: string[];
}

// ---------- Strength ----------

export type LoadPrescription =
  | { kind: "load"; min: number; max: number; unit: "kg"; perHand: boolean }
  | { kind: "bodyweight" }
  | { kind: "band"; band: string };

export interface StrengthItem {
  phase: Phase;
  movement: string;
  sets: number;
  /** Salah satu dari reps atau durationSec. */
  reps?: string;
  durationSec?: number;
  load: LoadPrescription;
  restSec: number;
  rpe?: number;
  cue?: string;
  /** Gerakan utama blok: tetap sama selama satu blok periodisasi. */
  anchor?: boolean;
}

export interface StrengthWorkout {
  kind: "strength";
  title: string;
  type: StrengthType;
  duration: Duration;
  difficulty: Difficulty;
  seed: number;
  /** Skema repetisi sesi ini (undulating per sesi). */
  scheme: string;
  deload: boolean;
  items: StrengthItem[];
  notes: string[];
}

export type Workout = RunWorkout | StrengthWorkout;
