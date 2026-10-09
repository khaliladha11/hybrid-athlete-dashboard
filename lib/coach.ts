/**
 * Saran latihan berbasis konteks mingguan (murni, tanpa I/O).
 *
 * - Distribusi intensitas 80/20 (Seiler): mayoritas sesi lari ringan.
 * - Progresi jarak (Nielsen dkk. 2014): kenaikan > 30% dikaitkan dengan
 *   shin splints (MTSS) dan cedera gluteus medius — relevan untuk profil ini.
 * - Concurrent training (Wilson dkk. 2012): lari mengganggu adaptasi kekuatan,
 *   jadi sesi kaki berat dan lari berat diberi jarak.
 *
 * Semua saran bersifat non-blokir: hanya menyarankan, tidak memaksa.
 */
import { addDays } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import type { Readiness } from "@/lib/readiness";
import { DIFFICULTIES, type Difficulty, type Duration, type StrengthType } from "@/lib/generator/types";

/** Lari dianggap berat di atas HR ini (batas bawah zona tempo generator = 160). */
export const HARD_RUN_HR = 155;
/** Tanpa HR: pace lebih cepat dari batas lambat tempo (6:30/km) dianggap berat. */
export const HARD_RUN_PACE_SEC = 390;
export const LONG_RUN_KM = 12;
export const MAX_HARD_RUNS_7D = 2;
export const KM_INCREASE_LIMIT = 0.3;
/** Di bawah ini, persentase kenaikan terlalu sensitif (mis. 2 km → 4 km = +100%). */
export const MIN_BASE_KM = 5;

const HARD_NAME = /interval|tempo|threshold|fartlek|4\s*[x×]\s*4|15\/15|vo2|repeats?/i;
const LOWER_ST_NAME = /lower|leg|kaki|full|squat|deadlift|hip thrust|glute|lunge/i;

export type AdviceTarget = "run" | "strength";

export interface Advice {
  id: "readiness" | "polarized" | "volume" | "after-leg-st" | "after-hard-run";
  targets: AdviceTarget[];
  /** Ringkasan pendek untuk tampilan ringkas (judul baris). */
  title: string;
  message: string;
  /** Turunkan kesulitan relatif terhadap pilihan saat ini. */
  lowerBy?: 1;
  /** Batas atas kesulitan yang disarankan. */
  maxDifficulty?: Difficulty;
  maxDuration?: Duration;
  /** Untuk ST: tipe yang disarankan bila tipe saat ini tidak termasuk. */
  preferTypes?: StrengthType[];
}

export function isHardRun(a: Activity): boolean {
  if (a.category !== "run") return false;
  if (HARD_NAME.test(a.name)) return true;
  if (a.avgHr) return a.avgHr >= HARD_RUN_HR;
  return !!a.avgPaceSecPerKm && a.avgPaceSecPerKm <= HARD_RUN_PACE_SEC;
}

export function isLongRun(a: Activity): boolean {
  return a.category === "run" && (a.distanceKm ?? 0) >= LONG_RUN_KM;
}

export function isLegStrength(a: Activity): boolean {
  return a.category === "strength" && LOWER_ST_NAME.test(a.name);
}

export interface WeekStats {
  runs7: number;
  hardRuns7: number;
  runKm7: number;
  runKmPrev7: number;
  /** Perubahan km vs 7 hari sebelumnya (0.53 = +53%); undefined bila basis terlalu kecil. */
  kmChange?: number;
  /** Batas km 7 hari yang masih ≤ +30% dari 7 hari sebelumnya. */
  safeKmCap?: number;
}

const inRange = (a: Activity, from: string, to: string) => !!a.date && a.date >= from && a.date <= to;

export function weekStats(activities: Activity[], today: string): WeekStats {
  const runs = activities.filter((a) => a.category === "run");
  const cur = runs.filter((a) => inRange(a, addDays(today, -6), today));
  const prev = runs.filter((a) => inRange(a, addDays(today, -13), addDays(today, -7)));
  const km = (xs: Activity[]) => xs.reduce((s, a) => s + (a.distanceKm ?? 0), 0);
  const runKm7 = km(cur);
  const runKmPrev7 = km(prev);
  const enoughBase = runKmPrev7 >= MIN_BASE_KM;
  return {
    runs7: cur.length,
    hardRuns7: cur.filter(isHardRun).length,
    runKm7,
    runKmPrev7,
    kmChange: enoughBase ? runKm7 / runKmPrev7 - 1 : undefined,
    safeKmCap: enoughBase ? runKmPrev7 * (1 + KM_INCREASE_LIMIT) : undefined,
  };
}

export function weeklyAdvice(activities: Activity[], today: string): Advice[] {
  const out: Advice[] = [];
  const s = weekStats(activities, today);

  if (s.hardRuns7 >= MAX_HARD_RUNS_7D) {
    const pct = Math.round((s.hardRuns7 / s.runs7) * 100);
    out.push({
      id: "polarized",
      targets: ["run"],
      title: `${s.hardRuns7} lari berat dalam 7 hari`,
      message: `Sudah ${s.hardRuns7} sesi lari berat dalam 7 hari (${pct}% dari ${s.runs7} sesi). Prinsip 80/20: sesi berikutnya sebaiknya Easy.`,
      maxDifficulty: "easy",
    });
  }

  if (s.kmChange !== undefined && s.safeKmCap !== undefined && s.kmChange > KM_INCREASE_LIMIT) {
    const left = s.safeKmCap - s.runKm7;
    out.push({
      id: "volume",
      targets: ["run"],
      title: `Jarak lari naik ${Math.round(s.kmChange * 100)}%`,
      message:
        `Jarak lari 7 hari ${s.runKm7.toFixed(1)} km, naik ${Math.round(s.kmChange * 100)}% dari minggu sebelumnya (${s.runKmPrev7.toFixed(1)} km). ` +
        `Kenaikan > 30% dikaitkan dengan shin splints — ` +
        (left > 0 ? `sisa ruang aman ±${left.toFixed(1)} km.` : "pertimbangkan hari istirahat atau sesi pendek."),
      maxDuration: 30,
    });
  }

  const yesterday = addDays(today, -1);
  const recent = activities.filter((a) => a.date === today || a.date === yesterday);
  const when = (a: Activity) => (a.date === today ? "Hari ini" : "Kemarin");

  const legSt = recent.find(isLegStrength);
  if (legSt) {
    out.push({
      id: "after-leg-st",
      targets: ["run"],
      title: `${when(legSt)} ST kaki`,
      message: `${when(legSt)} ada ST kaki (${legSt.name}) — hindari interval berat dulu supaya adaptasi kekuatan & pemulihan kaki tidak terganggu.`,
      maxDifficulty: "moderate",
    });
  }

  const hardOrLong = recent.find((a) => isHardRun(a) || isLongRun(a));
  if (hardOrLong) {
    out.push({
      id: "after-hard-run",
      targets: ["strength"],
      title: `${when(hardOrLong)} ${isLongRun(hardOrLong) ? "long run" : "lari berat"}`,
      message: `${when(hardOrLong)} ${isLongRun(hardOrLong) ? "long run" : "lari berat"} (${hardOrLong.name}) — kalau ST hari ini, prioritaskan Upper Push/Pull agar kaki pulih.`,
      preferTypes: ["upperPull", "upperPush"],
    });
  }

  return out;
}

export function readinessAdvice(r: Readiness | null): Advice[] {
  if (!r?.caution) return [];
  return r.reasons.map(
    (message) => ({ id: "readiness", targets: ["run", "strength"], title: readinessTitle(message), message, lowerBy: 1 }) satisfies Advice,
  );
}

function readinessTitle(reason: string): string {
  if (/^HRV/i.test(reason)) return "HRV di bawah rata-rata";
  if (/^Resting HR/i.test(reason)) return "Resting HR naik";
  if (/^Kemarin long run/i.test(reason)) return "Kemarin long run";
  if (/^Kemarin sesi berat/i.test(reason)) return "Kemarin sesi berat";
  return "Readiness rendah";
}

export interface Suggestion {
  difficulty?: Difficulty;
  duration?: Duration;
  type?: StrengthType;
}

/**
 * Hitung tindakan yang disarankan dari pilihan user saat ini (hanya jika lebih ringan).
 * `ignoreLowerBy`: saran "turun satu level" sudah diterapkan — jangan turunkan lagi.
 */
export function suggestFor(
  advice: Advice[],
  target: AdviceTarget,
  current: { difficulty: Difficulty; duration: Duration; type?: StrengthType },
  opts: { ignoreLowerBy?: boolean } = {},
): Suggestion {
  const relevant = advice.filter((a) => a.targets.includes(target));
  const cur = DIFFICULTIES.indexOf(current.difficulty);
  let idx = cur;
  let duration: Duration | undefined;
  let type: StrengthType | undefined;
  for (const a of relevant) {
    if (a.lowerBy && !opts.ignoreLowerBy) idx = Math.min(idx, Math.max(0, cur - a.lowerBy));
    if (a.maxDifficulty) idx = Math.min(idx, DIFFICULTIES.indexOf(a.maxDifficulty));
    if (a.maxDuration && a.maxDuration < current.duration) duration = Math.min(duration ?? a.maxDuration, a.maxDuration) as Duration;
    if (a.preferTypes && current.type && !a.preferTypes.includes(current.type)) type ??= a.preferTypes[0];
  }
  return {
    ...(idx < cur ? { difficulty: DIFFICULTIES[idx] } : {}),
    ...(duration ? { duration } : {}),
    ...(type ? { type } : {}),
  };
}
