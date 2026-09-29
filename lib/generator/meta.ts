import type { Difficulty, StrengthItem, StrengthWorkout } from "./types";

/** Waktu transisi/persiapan alat per gerakan. */
const TRANSITION_SEC = 30;
/** Estimasi durasi satu set berbasis repetisi. */
const REP_SET_SEC = 40;
const UNILATERAL_SET_SEC = 70;

/**
 * Metadata preskripsi per gerakan (bukan gerakan baru — hanya cara meresepkan
 * gerakan yang sudah ada di library).
 */
export interface MovementMeta {
  reps?: string | Record<Difficulty, string>;
  holdSec?: Record<Difficulty, number>;
  unilateral?: boolean;
  cue?: string;
}

export const META: Record<string, MovementMeta> = {
  "Dead Hang": { holdSec: { easy: 20, moderate: 25, high: 30 }, cue: "Bahu aktif (scapula ditarik ke bawah), jangan menggantung pasif." },
  "Negative Pull-Up": { reps: "3–5 (turun 3–5 detik)", cue: "Lompat ke atas, turun perlahan terkontrol." },
  "DB Farmer's Hold": { holdSec: { easy: 30, moderate: 40, high: 45 }, cue: "Berdiri tegak, rib cage turun, core kencang." },
  "Supported Single-Arm Row": { unilateral: true, cue: "Tangan lain bertumpu di kursi — punggung netral." },
  "Reverse Lunge": { reps: { easy: "8/kaki", moderate: "8–10/kaki", high: "10/kaki" }, unilateral: true, cue: "Lutut depan searah jari kaki, jangan collapse ke dalam." },
  "Barbell Sumo Deadlift / Hip Thrust": { cue: "Utamakan varian Hip Thrust dengan hip pad; posterior pelvic tilt di puncak." },
  "Barbell Squat": { cue: "Beban ringan, tulang belakang netral, rib cage turun — jangan hiperlordosis." },
  "DB RDL Wall-Tap Method": { cue: "Hip hinge sampai pantat menyentuh dinding, punggung netral." },
  "Glute Bridge": { reps: { easy: "12", moderate: "12–15", high: "15" }, cue: "Tahan 2 detik di atas, tekan pinggul tanpa melengkungkan punggung." },
  "Floor Press": { cue: "Siku ±45°, punggung bawah tetap menempel lantai." },
  "Seated Overhead Press": { cue: "Duduk bersandar, jangan melengkungkan punggung bawah." },
  "High-Incline Push-Up": { reps: { easy: "10", moderate: "12", high: "12–15" }, cue: "Badan lurus seperti papan, glute aktif." },
  "Lateral Band Walk": { reps: "10 langkah/arah", unilateral: true, cue: "Gluteus medius — lutut tetap keluar, jangan menyilang." },
  Clamshell: { reps: "12–15/sisi", unilateral: true, cue: "Panggul tidak ikut berputar ke belakang." },
  "Dead Bug": { reps: "8/sisi", unilateral: true, cue: "Punggung bawah menempel lantai (anti-hiperlordosis)." },
  "Tibialis Wall Raise": { reps: "15–20", cue: "Prehab shin splints — punggung bersandar dinding, angkat jari kaki." },
  "Eccentric Calf Raise": { reps: "10–12 (turun 3 detik)", unilateral: true, cue: "Naik dua kaki, turun satu kaki perlahan." },
};

export const STABILITY_HIP = ["Lateral Band Walk", "Clamshell"];

export function itemSeconds(item: Pick<StrengthItem, "sets" | "durationSec" | "restSec" | "movement">): number {
  const meta = META[item.movement];
  const work = item.durationSec ?? (meta?.unilateral ? UNILATERAL_SET_SEC : REP_SET_SEC);
  // Istirahat tidak dihitung setelah set terakhir; diganti waktu transisi.
  return item.sets * work + Math.max(0, item.sets - 1) * item.restSec + TRANSITION_SEC;
}

export function estimateStrengthMinutes(w: Pick<StrengthWorkout, "items">): number {
  let sec = 0;
  for (const it of w.items) {
    sec += it.phase === "main" ? itemSeconds(it) : (it.durationSec ?? 60) * it.sets;
  }
  return sec / 60;
}


/**
 * Gerakan multi-joint yang layak jadi gerakan utama blok (NSCA: multi-joint
 * didahulukan dan jadi fondasi program). Isolasi tetap dipakai sebagai aksesori.
 */
export const COMPOUND_MOVEMENTS = [
  "Floor Press",
  "Seated Overhead Press",
  "High-Incline Push-Up",
  "Supported Single-Arm Row",
  "DB Floor Pullover",
  "Barbell Sumo Deadlift / Hip Thrust",
  "Barbell Squat",
  "DB RDL Wall-Tap Method",
  "Reverse Lunge",
  "Glute Bridge",
];
