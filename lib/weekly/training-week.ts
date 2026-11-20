/**
 * Minggu latihan multi-aktivitas (1.3.0): data untuk kartu "Minggu ini · latihan" di Profil, ekspor PNG, dan grafik
 * waktu per olahraga di Tren. Murni, tanpa teks (teks di `lib/weekly/training-card.ts`).
 *
 * Aturan:
 * - Minggu kalender Senin sampai Minggu (tanggal aktivitas sudah tanggal lokal WIB), sama dengan program dan kartu 1.1.0.
 * - Olahraga kartu, urutan tetap: run, ride, strength, other. `walk` dan `other` intervals.icu (jalan, hike, renang,
 *   yoga, …) masuk `other`.
 * - Dedupe memakai aturan yang sudah ada: rekaman ganda Huawei/Strava dibuang di `getActivities`
 *   (`dedupeActivities`), aktivitas tanpa id dibuang di `normalizeActivity`, dan strength = `dedupeStSessions`
 *   (sesi mode latihan + WeightTraining tanpa pasangan, pasangan dihitung sekali dengan durasi sesi lokal).
 *   Salinan kosong (tanpa waktu, jarak, HR, dan load) tidak dihitung.
 * - Indoor = `Activity.indoor` (trainer, Virtual*, treadmill). Strength selalu indoor.
 * - Tumpukan per hari dari bawah: run, ride, other, strength; di dalam satu olahraga outdoor di bawah indoor.
 * - Kolom ringkasan maksimal 3: olahraga tanpa sesi dibuang; bila keempatnya ada, kolom ketiga = gabungan
 *   strength + other ("OTHER").
 */
import { addDays, startOfWeekMonday } from "../date";
import { isEmptyActivity } from "../intervals/dedupe";
import type { Activity } from "../intervals/types";
import { dedupeStSessions, type StSession } from "../st-session";

export type Sport = "run" | "ride" | "strength" | "other";
export const SPORTS: readonly Sport[] = ["run", "ride", "strength", "other"];
/** Urutan tumpukan bar dari bawah. */
export const STACK_ORDER: readonly Sport[] = ["run", "ride", "other", "strength"];

export interface TrainingSession {
  sport: Sport;
  date: string;
  minutes: number;
  /** km; hanya olahraga berjarak yang tercatat jaraknya. */
  km?: number;
  indoor: boolean;
}

export interface SportTotals {
  sessions: number;
  minutes: number;
  km: number;
  indoorMinutes: number;
  /** Menit indoor tanpa jarak (mis. trainer tanpa sensor kecepatan): ditulis "+ 45' INDOOR". */
  indoorNoDistanceMinutes: number;
  /** Setiap sesi punya jarak (untuk kolom OTHER yang isinya jalan/hike saja). */
  allWithDistance: boolean;
}

export interface DaySegment {
  sport: Sport;
  minutes: number;
  indoor: boolean;
}

export interface TrainingDay {
  date: string;
  /** Urutan tumpukan dari bawah; kosong = tidak ada latihan. */
  segments: DaySegment[];
  minutes: number;
}

export interface TrainingWeek {
  from: string;
  to: string;
  days: TrainingDay[];
  sports: Record<Sport, SportTotals>;
  minutes: number;
  sessions: number;
}

const sportOf = (a: Activity): Sport | null =>
  a.category === "run" ? "run" : a.category === "ride" ? "ride" : a.category === "strength" ? null : "other";

const minutesOf = (a: Activity) => (a.movingTimeSec ?? 0) / 60;

/** Semua sesi (setelah dedupe) di rentang [from, to]. */
export function trainingSessions(activities: Activity[], stSessions: StSession[], from: string, to: string): TrainingSession[] {
  const inRange = (d: string | undefined): d is string => !!d && d >= from && d <= to;
  const out: TrainingSession[] = [];
  for (const a of activities) {
    const sport = sportOf(a);
    if (!sport || !inRange(a.date) || isEmptyActivity(a)) continue;
    const km = sport === "run" || sport === "ride" || a.category === "walk" ? a.distanceKm : undefined;
    out.push({ sport, date: a.date, minutes: minutesOf(a), ...(km ? { km } : {}), indoor: a.indoor === true });
  }
  for (const i of dedupeStSessions(stSessions, activities)) {
    if (!inRange(i.date)) continue;
    if (i.source === "intervals" && isEmptyActivity(i.activity)) continue;
    out.push({ sport: "strength", date: i.date, minutes: i.minutes ?? 0, indoor: true });
  }
  return out;
}

const emptyTotals = (): SportTotals => ({ sessions: 0, minutes: 0, km: 0, indoorMinutes: 0, indoorNoDistanceMinutes: 0, allWithDistance: true });

export function sportTotals(sessions: TrainingSession[]): Record<Sport, SportTotals> {
  const t = Object.fromEntries(SPORTS.map((s) => [s, emptyTotals()])) as Record<Sport, SportTotals>;
  for (const s of sessions) {
    const x = t[s.sport];
    x.sessions++;
    x.minutes += s.minutes;
    x.km += s.km ?? 0;
    if (s.indoor) x.indoorMinutes += s.minutes;
    if (s.indoor && !s.km) x.indoorNoDistanceMinutes += s.minutes;
    if (!s.km) x.allWithDistance = false;
  }
  return t;
}

/** Segmen satu hari dalam urutan tumpukan; outdoor di bawah indoor untuk olahraga yang sama. */
export function daySegments(sessions: TrainingSession[]): DaySegment[] {
  const out: DaySegment[] = [];
  for (const sport of STACK_ORDER)
    for (const indoor of [false, true]) {
      const minutes = sessions.filter((s) => s.sport === sport && s.indoor === indoor).reduce((n, s) => n + s.minutes, 0);
      const count = sessions.some((s) => s.sport === sport && s.indoor === indoor);
      if (count) out.push({ sport, minutes, indoor });
    }
  return out;
}

export function trainingWeek(activities: Activity[], stSessions: StSession[], today: string): TrainingWeek {
  const from = startOfWeekMonday(today);
  const to = addDays(from, 6);
  const sessions = trainingSessions(activities, stSessions, from, to);
  const days = Array.from({ length: 7 }, (_, i): TrainingDay => {
    const date = addDays(from, i);
    const segments = daySegments(sessions.filter((s) => s.date === date));
    return { date, segments, minutes: segments.reduce((n, s) => n + s.minutes, 0) };
  });
  return { from, to, days, sports: sportTotals(sessions), minutes: days.reduce((n, d) => n + d.minutes, 0), sessions: sessions.length };
}

/** Minggu-minggu berurutan (Senin) yang berakhir di minggu `today`, untuk grafik di Tren. */
export function trainingWeeks(activities: Activity[], stSessions: StSession[], today: string, count: number): TrainingWeek[] {
  const last = startOfWeekMonday(today);
  return Array.from({ length: count }, (_, i) => trainingWeek(activities, stSessions, addDays(last, -7 * (count - 1 - i))));
}

// ---- Kolom ringkasan ----

export type ColumnKey = Sport;

export interface SummaryColumn {
  /** `other` juga dipakai untuk gabungan strength + other. */
  key: ColumnKey;
  merged: boolean;
  totals: SportTotals;
}

function mergeTotals(a: SportTotals, b: SportTotals): SportTotals {
  return {
    sessions: a.sessions + b.sessions,
    minutes: a.minutes + b.minutes,
    km: a.km + b.km,
    indoorMinutes: a.indoorMinutes + b.indoorMinutes,
    indoorNoDistanceMinutes: a.indoorNoDistanceMinutes + b.indoorNoDistanceMinutes,
    allWithDistance: a.allWithDistance && b.allWithDistance,
  };
}

export function summaryColumns(week: Pick<TrainingWeek, "sports">): SummaryColumn[] {
  const present = SPORTS.filter((s) => week.sports[s].sessions > 0);
  if (present.length <= 3) return present.map((key) => ({ key, merged: false, totals: week.sports[key] }));
  return [
    { key: "run", merged: false, totals: week.sports.run },
    { key: "ride", merged: false, totals: week.sports.ride },
    { key: "other", merged: true, totals: mergeTotals(week.sports.strength, week.sports.other) },
  ];
}

/** Cara menulis nilai kolom: km atau waktu. Olahraga berjarak tanpa km sama sekali (mis. hanya trainer) memakai waktu. */
export function columnShowsKm(c: SummaryColumn): boolean {
  if (c.key === "run" || c.key === "ride") return c.totals.km > 0;
  if (c.key === "other") return !c.merged && c.totals.allWithDistance && c.totals.km > 0;
  return false;
}

// ---- Angka ----

/** Menit → "h:mm" (dibulatkan ke menit terdekat): 352 → "5:52", 45 → "0:45". */
export function hmm(minutes: number): string {
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** Menit pendek bertanda prime: 45 → "45'", 150 → "150'". */
export const prime = (minutes: number) => `${Math.round(minutes)}'`;

/** Tambahan indoor: < 60 menit "45'", selebihnya "1:10". */
export const shortDuration = (minutes: number) => (Math.round(minutes) < 60 ? prime(minutes) : hmm(minutes));
