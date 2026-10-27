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
  /** 0.14.0: varian satu sisi yang lebih sulit (harus ada di library) untuk double progression saat mentok. */
  harderVariant?: string;
}

export const META: Record<string, MovementMeta> = {
  "Dead Hang": { holdSec: { easy: 20, moderate: 25, high: 30 }, cue: "Bahu aktif (scapula ditarik ke bawah), jangan menggantung pasif." },
  "Negative Pull-Up": { reps: "3–5 (turun 3–5 detik)", cue: "Lompat ke atas, turun perlahan terkontrol." },
  "DB Farmer's Hold": { holdSec: { easy: 30, moderate: 40, high: 45 }, cue: "Berdiri tegak, rib cage turun, core kencang." },
  "Supported Single-Arm Row": { unilateral: true, cue: "Tangan lain bertumpu di kursi, punggung netral." },
  "Reverse Lunge": {
    reps: { easy: "8/kaki", moderate: "8–10/kaki", high: "10/kaki" },
    unilateral: true,
    cue: "Lutut depan searah jari kaki, jangan collapse ke dalam.",
    harderVariant: "Rear-Foot-Elevated Split Squat",
  },
  "Barbell Sumo Deadlift / Hip Thrust": { cue: "Utamakan varian Hip Thrust dengan hip pad; posterior pelvic tilt di puncak." },
  "Barbell Squat": { cue: "Beban ringan, tulang belakang netral, rib cage turun. Jangan hiperlordosis.", harderVariant: "Rear-Foot-Elevated Split Squat" },
  "DB RDL Wall-Tap Method": { cue: "Hip hinge sampai pantat menyentuh dinding, punggung netral." },
  "Glute Bridge": { reps: { easy: "12", moderate: "12–15", high: "15" }, cue: "Tahan 2 detik di atas, tekan pinggul tanpa melengkungkan punggung." },
  "Floor Press": { cue: "Siku ±45°, punggung bawah tetap menempel lantai." },
  "Seated Overhead Press": { cue: "Duduk bersandar, jangan melengkungkan punggung bawah." },
  "High-Incline Push-Up": { reps: { easy: "10", moderate: "12", high: "12–15" }, cue: "Badan lurus seperti papan, glute aktif." },
  // 0.11.2 — gerakan tanpa alat untuk Upper Push/Pull (profil tanpa alat). Progresi: Wall → Knee → Push-Up.
  "Push-Up": { reps: { easy: "6", moderate: "8", high: "10–12" }, cue: "Badan lurus dari kepala ke tumit, siku ±45°; turun sampai dada sekepalan dari lantai." },
  "Knee Push-Up": { reps: { easy: "8", moderate: "10", high: "12–15" }, cue: "Lutut di lantai, panggul segaris dengan badan. Jangan menungging." },
  "Wall Push-Up": { reps: { easy: "12", moderate: "15", high: "15–20" }, cue: "Tangan di dinding setinggi bahu; makin jauh kaki dari dinding, makin berat." },
  "Prone Y-T-W Raise": { reps: { easy: "4/posisi (Y, T, W)", moderate: "5/posisi (Y, T, W)", high: "6/posisi (Y, T, W)" }, cue: "Tengkurap, dahi di handuk; angkat lengan dengan menarik tulang belikat ke bawah-belakang, punggung bawah diam." },
  "Prone Reverse Snow Angel": { reps: { easy: "8", moderate: "10", high: "12" }, cue: "Tengkurap, lengan melayang sedikit di atas lantai, sapukan dari samping paha ke atas kepala; glute aktif." },
  "Lateral Band Walk": { reps: "10 langkah/arah", unilateral: true, cue: "Gluteus medius: lutut tetap keluar, jangan menyilang." },
  Clamshell: { reps: "12–15/sisi", unilateral: true, cue: "Panggul tidak ikut berputar ke belakang." },
  "Dead Bug": { reps: "8/sisi", unilateral: true, cue: "Punggung bawah menempel lantai (anti-hiperlordosis)." },
  "Tibialis Wall Raise": { reps: "15–20", cue: "Prehab shin splints: punggung bersandar dinding, angkat jari kaki." },
  "Eccentric Calf Raise": { reps: "10–12 (turun 3 detik)", unilateral: true, cue: "Naik dua kaki, turun satu kaki perlahan." },
  // 0.9 — gerakan baru (docs/movement-library-proposal.md).
  "Band Reverse Fly": { reps: "12–15", cue: "Lengan setinggi dada, tarik band ke samping. Bahu turun, jangan mengangkat bahu." },
  "Single-Leg Glute Bridge": { reps: { easy: "8/sisi", moderate: "10/sisi", high: "12/sisi" }, unilateral: true, cue: "Panggul tetap rata kiri–kanan, punggung bawah tidak melengkung di atas." },
  "Rear-Foot-Elevated Split Squat": { reps: { easy: "8/kaki", moderate: "8–10/kaki", high: "10/kaki" }, unilateral: true, cue: "Kaki belakang di kursi, turun lurus ke bawah; lutut depan searah jari kaki." },
  "DB Step-Up": { reps: { easy: "8/kaki", moderate: "8–10/kaki", high: "10/kaki" }, unilateral: true, cue: "Dorong lewat tumit kaki di atas pijakan, jangan menolak dengan kaki bawah." },
  "DB Plié Squat": { cue: "Kaki lebar, jari kaki serong keluar; dumbbell menggantung di tengah, dada tegak." },
  "Seated Band Hamstring Curl": { reps: "12–15", cue: "Tarik tumit ke bawah kursi, kembalikan perlahan melawan band." },
  "Side Plank": { holdSec: { easy: 20, moderate: 30, high: 40 }, unilateral: true, cue: "Siku tepat di bawah bahu, badan lurus kepala–kaki; panggul jangan turun." },
  "Standing Band Hip Abduction": { reps: "12–15/sisi", unilateral: true, cue: "Badan tegak, angkat kaki ke samping tanpa memiringkan badan." },
  Plank: { holdSec: { easy: 20, moderate: 30, high: 45 }, cue: "Posterior pelvic tilt ringan, glute aktif. Punggung bawah tidak melengkung." },
  "Seated Single-Leg Calf Raise": { reps: "12–15/kaki", unilateral: true, cue: "Dumbbell di paha dekat lutut, angkat tumit setinggi mungkin, turun perlahan." },
  "DB Scaption": { reps: "12–15", cue: "Ibu jari ke atas, angkat serong ±30° di depan badan sampai setinggi bahu saja." },
  "Band External Rotation": { reps: "12–15/sisi", unilateral: true, cue: "Siku menempel di samping badan 90°, putar lengan bawah keluar." },
};

/** Prehab tungkai (shin, betis, Achilles) — untuk sesi Lower/Full Body. */
export const LOWER_PREHAB = ["Tibialis Wall Raise", "Eccentric Calf Raise", "Seated Single-Leg Calf Raise"];
/** Prehab bahu — diutamakan untuk sesi Upper. */
export const SHOULDER_PREHAB = ["DB Scaption", "Band External Rotation"];

/**
 * Gerakan yang memenuhi syarat "stabilitas panggul" (gluteus medius). Side Plank & Standing
 * Band Hip Abduction: aktivasi gluteus medius tinggi (Ekstrom 2007; Distefano 2009).
 */
export const STABILITY_HIP = ["Lateral Band Walk", "Clamshell", "Side Plank", "Standing Band Hip Abduction"];

export function itemSeconds(item: Pick<StrengthItem, "sets" | "durationSec" | "restSec" | "movement">): number {
  const meta = META[item.movement];
  // Tahan per sisi (mis. Side Plank) = dua kali durasi.
  const work = item.durationSec ? item.durationSec * (meta?.unilateral ? 2 : 1) : meta?.unilateral ? UNILATERAL_SET_SEC : REP_SET_SEC;
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
  "Push-Up",
  "Supported Single-Arm Row",
  "DB Floor Pullover",
  "Barbell Sumo Deadlift / Hip Thrust",
  "Barbell Squat",
  "DB RDL Wall-Tap Method",
  "Reverse Lunge",
  "Glute Bridge",
  "Rear-Foot-Elevated Split Squat",
  "DB Step-Up",
  "DB Plié Squat",
];

/**
 * Tanggal gerakan multi-joint baru ditambahkan. Gerakan ini baru boleh jadi ★ di blok yang
 * dimulai setelah tanggal itu — supaya ★ blok yang sedang berjalan (dan progresinya) tidak berubah.
 */
export const ANCHOR_SINCE: Record<string, string> = {
  "Rear-Foot-Elevated Split Squat": "2026-10-12",
  "DB Step-Up": "2026-10-12",
  "DB Plié Squat": "2026-10-12",
  "Push-Up": "2026-10-22",
};
