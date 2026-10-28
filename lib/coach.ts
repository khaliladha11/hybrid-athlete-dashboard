/**
 * Saran latihan berbasis konteks mingguan (murni, tanpa I/O).
 *
 * - Distribusi intensitas 80/20 (Seiler): mayoritas sesi lari ringan.
 * - Progresi jarak (Nielsen dkk. 2014): kenaikan > 30% dikaitkan dengan
 *   shin splints (MTSS) dan cedera gluteus medius — relevan untuk profil ini.
 * - Concurrent training (Wilson dkk. 2012): lari mengganggu adaptasi kekuatan,
 *   jadi sesi kaki berat dan lari berat diberi jarak.
 * - Hari yang sama (0.14.1, Schumann dkk. 2022): lari dan ST di hari yang sama diberi jeda ≥ 3 jam.
 * - ST dihitung dari sesi mode latihan (session-RPE, 0.14.1) dan aktivitas strength intervals.icu tanpa hitung dobel
 *   (`dedupeStSessions`). Beban ST dalam AU (RPE × menit), tidak dijumlah dengan beban lari.
 *
 * Semua saran bersifat non-blokir: hanya menyarankan, tidak memaksa.
 */
import { addDays } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import type { Readiness } from "@/lib/readiness";
import { dedupeStSessions, type StItem, type StSession } from "@/lib/st-session";
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
  id: "readiness" | "polarized" | "volume" | "after-leg-st" | "after-hard-run" | "same-day" | "checkin-shin" | "checkin-soreness" | "checkin-sleep";
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
  /** Sesi ST 7 hari (sesi lokal + aktivitas strength tanpa pasangan). */
  st7: number;
  /** Menit ST 7 hari yang diketahui. */
  stMin7: number;
  /** Beban session-RPE 7 hari (AU), hanya dari sesi mode latihan. */
  stLoad7: number;
  /** Sesi ST 7 hari tanpa RPE (aktivitas intervals.icu saja), tidak masuk `stLoad7`. */
  stNoRpe7: number;
}

const inRange = (a: Activity, from: string, to: string) => !!a.date && a.date >= from && a.date <= to;

const stInRange = (i: StItem, from: string, to: string) => i.date >= from && i.date <= to;

/** `sessions` = sesi ST mode latihan di perangkat (0.14.1); kosong = hanya aktivitas intervals.icu. */
export function weekStats(activities: Activity[], today: string, sessions: StSession[] = []): WeekStats {
  const st = dedupeStSessions(sessions, activities).filter((i) => stInRange(i, addDays(today, -6), today));
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
    st7: st.length,
    stMin7: st.reduce((t, i) => t + (i.minutes ?? 0), 0),
    stLoad7: st.reduce((t, i) => t + (i.load ?? 0), 0),
    stNoRpe7: st.filter((i) => i.source === "intervals").length,
  };
}

export function weeklyAdvice(activities: Activity[], today: string, sessions: StSession[] = []): Advice[] {
  const out: Advice[] = [];
  const s = weekStats(activities, today, sessions);

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
        `Kenaikan > 30% dikaitkan dengan shin splints. ` +
        (left > 0 ? `Sisa ruang aman ±${left.toFixed(1)} km.` : "Pertimbangkan hari istirahat atau sesi pendek."),
      maxDuration: 30,
    });
  }

  const yesterday = addDays(today, -1);
  const recent = activities.filter((a) => a.date === today || a.date === yesterday);
  const when = (a: Pick<Activity, "date">) => (a.date === today ? "Hari ini" : "Kemarin");

  // ST kaki dari aktivitas intervals.icu (nama) atau sesi mode latihan (tipe Lower/Full Body).
  const legSession = sessions.find((x) => !x.deletedAt && (x.date === today || x.date === yesterday) && (x.type === "lower" || x.type === "fullBody"));
  const legSt: Pick<Activity, "date" | "name"> | undefined = recent.find(isLegStrength) ?? (legSession ? { date: legSession.date, name: legSession.title } : undefined);
  if (legSt) {
    out.push({
      id: "after-leg-st",
      targets: ["run"],
      title: `${when(legSt)} ST kaki`,
      message: `${when(legSt)} ada ST kaki (${legSt.name}). Hindari interval berat dulu supaya adaptasi kekuatan & pemulihan kaki tidak terganggu.`,
      maxDifficulty: "moderate",
    });
  }

  const hardOrLong = recent.find((a) => isHardRun(a) || isLongRun(a));
  if (hardOrLong) {
    out.push({
      id: "after-hard-run",
      targets: ["strength"],
      title: `${when(hardOrLong)} ${isLongRun(hardOrLong) ? "long run" : "lari berat"}`,
      message: `${when(hardOrLong)} ${isLongRun(hardOrLong) ? "long run" : "lari berat"} (${hardOrLong.name}). Kalau ST hari ini, prioritaskan Upper Push/Pull agar kaki pulih.`,
      preferTypes: ["upperPull", "upperPush"],
    });
  }

  return out;
}

/** Ada lari / ST tercatat hari ini (aktivitas intervals.icu). */
export interface TodayDone {
  run: boolean;
  strength: boolean;
}

export function todayDone(activities: Activity[], today: string): TodayDone {
  const acts = activities.filter((a) => a.date === today);
  return { run: acts.some((a) => a.category === "run"), strength: acts.some((a) => a.category === "strength") };
}

/** Jeda minimal antara lari dan ST di hari yang sama (Schumann dkk. 2022). */
export const SAME_DAY_GAP_H = 3;

/**
 * Lari dan ST di hari yang sama → sarankan jeda ≥ 3 jam (D5, non-blokir). Sumber "ada lari/ST hari ini": aktivitas
 * yang sudah tercatat, sesi mode latihan, sesi program hari ini, atau generator yang sedang dibuka (`current`).
 * Tidak muncul bila keduanya sudah tercatat selesai (tidak ada lagi yang bisa dijadwalkan).
 */
export function sameDayAdvice(o: {
  activities?: Activity[];
  /** Ringkasan aktivitas hari ini dari server (bila daftar aktivitas tidak tersedia di klien). */
  done?: TodayDone;
  sessions?: StSession[];
  /** Jenis sesi program yang jatuh hari ini. */
  plannedToday?: { run: boolean; strength: boolean };
  current?: AdviceTarget;
  today: string;
}): Advice | null {
  const fromActs = todayDone(o.activities ?? [], o.today);
  const runDone = fromActs.run || !!o.done?.run;
  const stDone = fromActs.strength || !!o.done?.strength || (o.sessions ?? []).some((s) => !s.deletedAt && s.date === o.today);
  const run = runDone || !!o.plannedToday?.run || o.current === "run";
  const st = stDone || !!o.plannedToday?.strength || o.current === "strength";
  if (!run || !st || (runDone && stDone)) return null;
  return {
    id: "same-day",
    targets: ["run", "strength"],
    title: `Lari dan ST hari ini: jeda ≥ ${SAME_DAY_GAP_H} jam`,
    message: `Hari ini ada lari dan ST. Beri jeda minimal ${SAME_DAY_GAP_H} jam di antaranya supaya adaptasi kekuatan tidak terganggu.`,
  };
}

/**
 * Saran server (dihitung tanpa data perangkat) + sesi mode latihan di perangkat (0.14.1): ST kaki lokal kemarin/hari
 * ini memicu `after-leg-st` bila belum ada, dan aturan hari yang sama. Murni.
 */
export function withStSessions(
  advice: Advice[],
  o: { sessions: StSession[]; today: string; done?: TodayDone; plannedToday?: { run: boolean; strength: boolean }; current?: AdviceTarget },
): Advice[] {
  const out = [...advice];
  if (!out.some((a) => a.id === "after-leg-st")) {
    const leg = weeklyAdvice([], o.today, o.sessions).find((a) => a.id === "after-leg-st");
    if (leg) out.push(leg);
  }
  const same = out.some((a) => a.id === "same-day") ? null : sameDayAdvice(o);
  return same ? [...out, same] : out;
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
  /** Long run dari program yang disarankan lebih pendek (km). */
  longRunKm?: number;
  /** Long run disarankan seluruhnya di pace easy (tanpa bagian race pace). */
  longRunEasy?: boolean;
}

/** Long run dipendekkan ke ±75% saat readiness rendah (dibulatkan ke 0,5 km). */
export const LONG_RUN_REDUCTION = 0.75;

/** Sesi lari rencana hari ini dari program (0.13.1), untuk saran terhadap rencana. */
export interface PlanToday {
  kind: "quality" | "easy" | "recovery" | "long" | "race";
  /** Level & durasi isian generator untuk sesi ini (long run & lomba: tanpa durasi). */
  difficulty: Difficulty;
  duration?: Duration;
  /** Jarak rencana (km). */
  km?: number;
  /** Long run minggu sebelumnya (km), untuk menahan jarak saat kenaikan km terlalu besar. */
  prevLongKm?: number;
}

/**
 * Hitung tindakan yang disarankan dari pilihan user saat ini (hanya jika lebih ringan).
 * `ignoreLowerBy`: saran "turun satu level" sudah diterapkan — jangan turunkan lagi.
 */
export function suggestFor(
  advice: Advice[],
  target: AdviceTarget,
  current: { difficulty: Difficulty; duration: Duration; type?: StrengthType },
  opts: { ignoreLowerBy?: boolean; plan?: PlanToday } = {},
): Suggestion {
  if (opts.plan && target === "run") return suggestForPlan(advice, opts.plan);
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

/**
 * Saran terhadap sesi rencana hari ini (PROGRAM-HIDUP §4.5). Basisnya rencana, bukan pilihan saat ini,
 * sehingga menerapkan saran tidak membuatnya turun lagi (tidak berantai). Hanya menurunkan, tidak memblokir:
 * - readiness rendah + quality → turun satu level, durasi sama;
 * - 80/20 terlampaui + quality → Easy (batas `maxDifficulty` lain, mis. setelah ST kaki, tetap berlaku);
 * - kenaikan km > 30% → durasi maks dari saran (sesi generator) atau long run ditahan ke jarak minggu lalu;
 * - readiness rendah + long run → ±75% jarak, seluruhnya pace easy.
 * Lomba tidak pernah diturunkan otomatis.
 */
function suggestForPlan(advice: Advice[], plan: PlanToday): Suggestion {
  const relevant = advice.filter((a) => a.targets.includes("run"));
  if (plan.kind === "race") return {};
  if (plan.kind === "long") {
    if (!plan.km) return {};
    const readiness = relevant.some((a) => a.lowerBy);
    let km = plan.km;
    if (readiness) km = Math.min(km, Math.round(plan.km * LONG_RUN_REDUCTION * 2) / 2);
    if (relevant.some((a) => a.maxDuration) && plan.prevLongKm !== undefined && plan.prevLongKm < km) km = plan.prevLongKm;
    return km < plan.km ? { longRunKm: km, ...(readiness ? { longRunEasy: true } : {}) } : {};
  }
  const cur = DIFFICULTIES.indexOf(plan.difficulty);
  let idx = cur;
  let duration: Duration | undefined;
  for (const a of relevant) {
    if (a.lowerBy && plan.kind === "quality") idx = Math.min(idx, Math.max(0, cur - a.lowerBy));
    if (a.maxDifficulty) idx = Math.min(idx, DIFFICULTIES.indexOf(a.maxDifficulty));
    if (a.maxDuration && plan.duration && a.maxDuration < plan.duration) duration = Math.min(duration ?? a.maxDuration, a.maxDuration) as Duration;
  }
  return {
    ...(idx < cur ? { difficulty: DIFFICULTIES[idx] } : {}),
    ...(duration ? { duration } : {}),
  };
}
