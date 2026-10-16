/**
 * Data dummy untuk Demo Mode (tanpa INTERVALS_API_KEY).
 * Bentuknya meniru respons mentah intervals.icu — termasuk field null dari
 * Huawei Watch Fit 4 dan cadence per-kaki — lalu dilewatkan ke normalizer
 * yang sama dengan data asli. Tanggal relatif terhadap hari ini (WIB).
 */
import { addDays } from "@/lib/date";
import { normalizeActivity, normalizeActivityDetail, normalizeList, normalizeWellness } from "@/lib/intervals/normalize";
import type { Activity, ActivityDetail, Wellness } from "@/lib/intervals/types";

interface Template {
  daysAgo: number;
  time: string;
  name: string;
  type: string;
  distance?: number | null;
  moving_time: number;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_cadence?: number | null;
  icu_training_load?: number | null;
}

const TEMPLATES: Template[] = [
  { daysAgo: 1, time: "05:30", name: "Long Run Minggu Pagi", type: "Run", distance: 14200, moving_time: 6900, average_heartrate: 148, max_heartrate: 166, average_cadence: 86, icu_training_load: 118 },
  { daysAgo: 3, time: "19:10", name: "Lower Body ST", type: "WeightTraining", distance: null, moving_time: 2700, average_heartrate: 108, average_cadence: null, icu_training_load: 28 },
  { daysAgo: 4, time: "05:45", name: "Tempo 2×10'", type: "Run", distance: 7600, moving_time: 2880, average_heartrate: 158, max_heartrate: 171, average_cadence: 88, icu_training_load: 68 },
  { daysAgo: 5, time: "19:00", name: "Upper Push ST", type: "WeightTraining", distance: null, moving_time: 2400, average_heartrate: null, icu_training_load: null },
  { daysAgo: 6, time: "05:40", name: "Easy Run Z2", type: "Run", distance: 6100, moving_time: 3060, average_heartrate: 137, max_heartrate: 145, average_cadence: 176, icu_training_load: 42 },
  { daysAgo: 8, time: "05:35", name: "Mini Interval 7×1'", type: "Run", distance: 5200, moving_time: 1800, average_heartrate: 156, max_heartrate: 176, average_cadence: null, icu_training_load: 52 },
  { daysAgo: 9, time: "17:30", name: "Jalan Sore", type: "Walk", distance: 4100, moving_time: 2700, average_heartrate: 102, average_cadence: 56, icu_training_load: 8 },
  { daysAgo: 10, time: "05:50", name: "Easy Run-Walk", type: "Run", distance: 5000, moving_time: 2640, average_heartrate: null, average_cadence: 84, icu_training_load: 30 },
  { daysAgo: 11, time: "19:15", name: "Full Body ST", type: "WeightTraining", distance: null, moving_time: 3300, average_heartrate: 112, icu_training_load: 34 },
  { daysAgo: 13, time: "05:30", name: "Norwegian 4×4", type: "Run", distance: 8000, moving_time: 2700, average_heartrate: 160, max_heartrate: 181, average_cadence: 89, icu_training_load: 82 },
  { daysAgo: 15, time: "05:20", name: "Long Run", type: "Run", distance: 12000, moving_time: 5820, average_heartrate: 145, average_cadence: 87, icu_training_load: 96 },
  { daysAgo: 17, time: "19:00", name: "Upper Pull ST", type: "WeightTraining", distance: null, moving_time: 2700, average_heartrate: 104, icu_training_load: 25 },
];

function rawActivities(today: string) {
  return TEMPLATES.map((t, i) => ({
    id: `demo-${i + 1}`,
    start_date_local: `${addDays(today, -t.daysAgo)}T${t.time}:00`,
    name: t.name,
    type: t.type,
    distance: t.distance,
    moving_time: t.moving_time,
    average_speed: t.distance ? t.distance / t.moving_time : null,
    average_heartrate: t.average_heartrate,
    max_heartrate: t.max_heartrate ?? null,
    average_cadence: t.average_cadence,
    icu_training_load: t.icu_training_load,
  }));
}

export function mockActivities(today: string): Activity[] {
  return normalizeList(rawActivities(today), normalizeActivity);
}

/** Struktur sesi interval demo: [pemanasan, repetisi, kerja, istirahat] dalam detik. Sesi lain = steady. */
const STRUCTURE: Record<string, [number, number, number, number]> = {
  "Tempo 2×10'": [600, 2, 600, 180],
  "Mini Interval 7×1'": [600, 7, 60, 60],
  "Norwegian 4×4": [600, 4, 240, 180],
};

interface Phase {
  label?: string;
  type: "WORK" | "RECOVERY";
  sec: number;
  /** Pengali pace rata-rata (< 1 = lebih cepat). */
  factor: number;
}

function phases(name: string, total: number): Phase[] {
  const s = STRUCTURE[name];
  if (!s) return [{ type: "RECOVERY", sec: total, factor: 1 }];
  const [warm, reps, work, rest] = s;
  const out: Phase[] = [{ label: "Pemanasan", type: "RECOVERY", sec: warm, factor: 1.12 }];
  for (let i = 0; i < reps; i++) {
    out.push({ type: "WORK", sec: work, factor: 0.85 });
    if (i < reps - 1) out.push({ type: "RECOVERY", sec: rest, factor: 1.25 });
  }
  const used = out.reduce((a, p) => a + p.sec, 0);
  out.push({ label: "Pendinginan", type: "RECOVERY", sec: Math.max(60, total - used), factor: 1.15 });
  return out;
}

const STEP_SEC = 5;

/**
 * Detail demo: stream time/distance/HR/cadence sintetis (sampel tiap 5 detik) dibentuk dari fase sesi,
 * lalu lewat normalizer yang sama dengan data asli, jadi split per km dihitung oleh `kmSplits`.
 * Sesi steady punya satu interval (seperti data Huawei di intervals.icu); sesi interval punya strukturnya.
 */
export function mockActivityDetail(id: string, today: string): ActivityDetail | null {
  const raw = rawActivities(today).find((a) => a.id === id);
  if (!raw) return null;
  if (!raw.distance) return normalizeActivityDetail(raw);

  const plan = phases(raw.name, raw.moving_time);
  const basePace = raw.moving_time / (raw.distance / 1000);
  const time: number[] = [0];
  const distance: number[] = [0];
  const heartrate: (number | null)[] = [raw.average_heartrate ?? null];
  const cadence: (number | null)[] = [raw.average_cadence ?? null];
  const phaseAt: number[] = [0];
  let t = 0;
  plan.forEach((p, pi) => {
    for (let k = 0; k < p.sec; k += STEP_SEC) {
      t += STEP_SEC;
      // Variasi halus antar km supaya split tidak identik.
      const pace = basePace * p.factor * (1 + 0.03 * Math.sin(t / 420));
      time.push(t);
      distance.push(distance.at(-1)! + (1000 / pace) * STEP_SEC);
      heartrate.push(raw.average_heartrate ? Math.round(raw.average_heartrate + (p.factor < 1 ? 10 : -4) + Math.min(t / 600, 6)) : null);
      cadence.push(raw.average_cadence ? raw.average_cadence + (p.factor < 1 ? 2 : 0) : null);
      phaseAt.push(pi);
    }
  });
  // Skala jarak supaya total sama dengan ringkasan aktivitas.
  const scale = raw.distance / distance.at(-1)!;
  for (let i = 0; i < distance.length; i++) distance[i] = Math.round(distance[i] * scale * 10) / 10;

  const icu_intervals = plan.map((p, pi) => {
    const idx = phaseAt.flatMap((v, i) => (v === pi && i > 0 ? [i] : []));
    const dist = idx.reduce((a, i) => a + distance[i] - distance[i - 1], 0);
    const hrs = idx.map((i) => heartrate[i]).filter((v): v is number => v !== null);
    return {
      label: p.label ?? null,
      type: p.type,
      distance: dist,
      moving_time: p.sec,
      average_speed: dist / p.sec,
      average_heartrate: hrs.length ? hrs.reduce((a, v) => a + v, 0) / hrs.length : null,
      average_cadence: raw.average_cadence,
    };
  });
  const streams = [
    { type: "time", data: time },
    { type: "distance", data: distance },
    { type: "heartrate", data: heartrate },
    { type: "cadence", data: cadence },
  ];
  return normalizeActivityDetail({ ...raw, icu_intervals }, streams);
}

export function mockWellness(today: string): Wellness[] {
  // Hari ini: HRV turun & resting HR naik setelah long run kemarin → memicu Readiness Advisory.
  const hrv = [62, 65, 60, 64, 63, 61, 66, 49];
  const rhr = [52, 51, 53, 52, 52, 51, 52, 58];
  const ctl = [38.1, 38.6, 38.2, 39.0, 39.4, 39.1, 40.8, 40.5];
  const atl = [41.2, 44.0, 40.3, 45.5, 44.1, 40.0, 54.7, 49.9];
  const raw = hrv.map((h, i) => ({
    id: addDays(today, i - 7),
    hrv: h,
    restingHR: rhr[i],
    // Data tidur hari ini kosong (sering terjadi jika jam belum sinkron).
    sleepSecs: i === 7 ? null : 23400 + (i % 3) * 1800,
    ctl: ctl[i],
    atl: atl[i],
  }));
  return normalizeList(raw, normalizeWellness);
}
