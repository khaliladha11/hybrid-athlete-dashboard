import { dict } from "../dict";

/** Teks ambang pribadi (`lib/thresholds.ts`) dan zona HR/RPE (`lib/hr-zones.ts`). */
export const ZONES = dict(
  {
    threshold: {
      activeWindow: (label: string) => `${label}: ambang pribadi aktif (rata-rata 30 hari terakhir).`,
      activeSince: (label: string, day: string) => `${label}: ambang pribadi aktif sejak ${day} (rata-rata 30 hari).`,
      general: (label: string, days: number, of: number) => `${label}: masih memakai ambang umum (${days} dari ${of} hari data).`,
      hardPersonal: (bpm: number, lthr: number) => `Lari berat: ≥ ${bpm} bpm (90% LTHR ${lthr} di intervals.icu).`,
      hardGeneral: (bpm: number) => `Lari berat: ≥ ${bpm} bpm (ambang umum; isi LTHR lari di intervals.icu untuk ambang pribadi).`,
      noHrv: "HRV: tidak dikirim jam, aturan HRV tidak dipakai.",
      noRhr: "Resting HR: tidak dikirim jam, aturan resting HR tidak dipakai.",
    },
    hr: {
      mode: { default: "Bawaan", lthr: "LTHR", maxHr: "HR maks", manual: "Manual" },
      source: {
        default: "Angka konservatif aplikasi: Easy di bawah 140, Tempo 160–170.",
        lthr: "Zona lari Friel dari LTHR: Z2 85–89%, Z4 95–99%, Z5 dari 100%.",
        maxHr: "Lima zona dari HR maks (Edwards): Z2 60–69%, Z4 80–89%, Z5 dari 90%.",
        manual: "Batas atas Z1 sampai Z4 diisi sendiri.",
      },
      fillBpm: "Isi angka bpm.",
      between: (lo: number, hi: number) => `Antara ${lo} dan ${hi} bpm.`,
      minTop: (min: number, zone: number, prev: number) => `Minimal ${min} bpm, supaya Z${zone} tidak tumpang tindih dengan Z${prev}.`,
      refRange: (lthr: boolean, lo: number, hi: number) => `${lthr ? "LTHR" : "HR maks"} antara ${lo} dan ${hi} bpm.`,
      jogDown: (below: number) => `turun ke < ${below}`,
      runRpe: ["Pemulihan, jalan, jog", "Easy", "Tempo", "Interval, Norwegian 4×4"],
      fill: "Isi angka.",
      rpeRange: (lo: number, hi: number) => `RPE ${lo} sampai ${hi}.`,
      notLighter: "Tidak boleh lebih ringan dari level sebelumnya.",
    },
  },
  {
    threshold: {
      activeWindow: (label) => `${label}: personal threshold active (average of the last 30 days).`,
      activeSince: (label, day) => `${label}: personal threshold active since ${day} (30-day average).`,
      general: (label, days, of) => `${label}: still using the general threshold (${days} of ${of} days of data).`,
      hardPersonal: (bpm, lthr) => `Hard run: ≥ ${bpm} bpm (90% of LTHR ${lthr} in intervals.icu).`,
      hardGeneral: (bpm) => `Hard run: ≥ ${bpm} bpm (general threshold; set your running LTHR in intervals.icu for a personal threshold).`,
      noHrv: "HRV: not sent by the watch, HRV rules are not used.",
      noRhr: "Resting HR: not sent by the watch, resting HR rules are not used.",
    },
    hr: {
      mode: { default: "Default", lthr: "LTHR", maxHr: "Max HR", manual: "Manual" },
      source: {
        default: "Conservative app values: Easy below 140, Tempo 160–170.",
        lthr: "Friel run zones from LTHR: Z2 85–89%, Z4 95–99%, Z5 from 100%.",
        maxHr: "Five zones from max HR (Edwards): Z2 60–69%, Z4 80–89%, Z5 from 90%.",
        manual: "You set the upper limits of Z1 to Z4 yourself.",
      },
      fillBpm: "Enter a bpm value.",
      between: (lo, hi) => `Between ${lo} and ${hi} bpm.`,
      minTop: (min, zone, prev) => `At least ${min} bpm, so Z${zone} does not overlap Z${prev}.`,
      refRange: (lthr, lo, hi) => `${lthr ? "LTHR" : "Max HR"} between ${lo} and ${hi} bpm.`,
      jogDown: (below) => `down to < ${below}`,
      runRpe: ["Recovery, walk, jog", "Easy", "Tempo", "Interval, Norwegian 4×4"],
      fill: "Enter a number.",
      rpeRange: (lo, hi) => `RPE ${lo} to ${hi}.`,
      notLighter: "Cannot be lighter than the previous level.",
    },
  },
);
