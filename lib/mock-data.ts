/**
 * Data dummy untuk Demo Mode (tanpa INTERVALS_API_KEY).
 * Bentuknya meniru respons mentah intervals.icu — termasuk field null dari
 * Huawei Watch Fit 4 dan cadence per-kaki — lalu dilewatkan ke normalizer
 * yang sama dengan data asli. Tanggal relatif terhadap hari ini (WIB).
 */
import { addDays, startOfWeekMonday } from "@/lib/date";
import { normalizeActivity, normalizeActivityDetail, normalizeList, normalizeWellness } from "@/lib/intervals/normalize";
import type { Activity, ActivityDetail, Wellness } from "@/lib/intervals/types";
import type { LogEntry } from "@/lib/progression";
import type { PrEntry } from "@/lib/prs";
import type { StSession } from "@/lib/st-session";

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

/** Panjang riwayat demo Insight (minggu), cukup untuk 12 minggu tampilan + jendela VDOT 90 hari. */
export const INSIGHT_HISTORY_WEEKS = 26;
/** Minggu demo tanpa lari (minggu ke-k sebelum minggu ini), supaya kondisi minggu kosong terlihat. */
export const DEMO_REST_WEEK = 7;

/**
 * Riwayat demo untuk Insight (0.15.0): minggu ke-3 sampai ke-25 sebelum minggu ini dibuat deterministik, lalu
 * ditambah aktivitas demo 17 hari terakhir (`mockActivities`) supaya sama dengan Profil. Bentuk mentah intervals.icu
 * (cadence per kaki, HR/cadence kadang null) lewat normalizer yang sama. Km naik pelan, cutback tiap minggu ke-4,
 * satu minggu tanpa lari, satu lonjakan > 30%, pace easy membaik.
 */
function rawHistory(today: string) {
  const thisMonday = startOfWeekMonday(today);
  // Hari ke-17 hanya berisi ST demo, jadi lari riwayat di hari itu tidak bertabrakan.
  const cutoff = addDays(today, -16);
  const out: ReturnType<typeof rawActivities> = [];
  for (let k = INSIGHT_HISTORY_WEEKS - 1; k >= 3; k--) {
    if (k === DEMO_REST_WEEK) continue;
    const monday = addDays(thisMonday, -7 * k);
    const progress = (INSIGHT_HISTORY_WEEKS - 1 - k) / (INSIGHT_HISTORY_WEEKS - 4); // 0 → 1
    let km = 14 + 12 * progress;
    if (k % 4 === 0) km *= 0.8; // cutback
    if (k === 10) km *= 1.45; // lonjakan > 30%
    const easyPace = Math.round(560 - 55 * progress);
    const easyHr = Math.round(147 - 8 * progress);
    const footCad = Math.round(81 + 5 * progress);
    const runs = [
      { day: 1, time: "05:40", name: k % 2 ? "Tempo 20'" : "Interval 5×3'", km: km * 0.25, pace: Math.round(405 - 55 * progress), hr: 158, cad: footCad + 4, load: 60 },
      { day: 3, time: "05:45", name: "Easy Run Z2", km: km * 0.3, pace: easyPace, hr: k % 3 === 0 ? null : easyHr, cad: k % 5 === 0 ? null : footCad, load: 38 },
      { day: 6, time: "05:30", name: "Long Run", km: km * 0.45, pace: easyPace - 25, hr: easyHr + 4, cad: footCad - 1, load: 80 },
    ];
    const st = [
      { day: 0, time: "19:00", name: "Lower Body ST", sec: 2700, load: 28 },
      { day: 4, time: "19:00", name: k % 2 ? "Upper Push ST" : "Upper Pull ST", sec: 2400, load: 24 },
    ];
    for (const [n, r] of runs.entries()) {
      const date = addDays(monday, r.day);
      if (date >= cutoff) continue;
      const distance = Math.round(r.km * 10) * 100;
      const moving = Math.round((distance / 1000) * r.pace);
      out.push({
        id: `demo-h${k}-${n}`,
        start_date_local: `${date}T${r.time}:00`,
        name: r.name,
        type: "Run",
        distance,
        moving_time: moving,
        average_speed: distance / moving,
        average_heartrate: r.hr,
        max_heartrate: r.hr ? r.hr + 14 : null,
        average_cadence: r.cad,
        icu_training_load: Math.round(r.load * (km / 20)),
      });
    }
    for (const [n, s] of st.entries()) {
      const date = addDays(monday, s.day);
      if (date >= cutoff) continue;
      out.push({
        id: `demo-h${k}-st${n}`,
        start_date_local: `${date}T${s.time}:00`,
        name: s.name,
        type: "WeightTraining",
        distance: null,
        moving_time: s.sec,
        average_speed: null,
        average_heartrate: null,
        max_heartrate: null,
        average_cadence: null,
        icu_training_load: s.load,
      });
    }
  }
  return out;
}

/** Aktivitas demo Insight: riwayat + 17 hari terakhir, terbaru dulu (seperti `getActivities`). */
export function mockInsightActivities(today: string): Activity[] {
  return normalizeList([...rawHistory(today), ...rawActivities(today)], normalizeActivity).sort((a, b) => (b.startLocal ?? "").localeCompare(a.startLocal ?? ""));
}

/**
 * Wellness demo Insight: CTL/ATL dihitung dari load harian (rata-rata eksponensial 42 & 7 hari, seperti
 * intervals.icu), digeser supaya 8 hari terakhir menyambung dengan `mockWellness` (yang dipakai Profil). Hari lama
 * berisi HRV & resting HR fiktif (0.15.2): Profil demo (8 hari) memakai ambang umum, Insight demo ambang pribadi.
 */
export function mockInsightWellness(today: string, days = 84): Wellness[] {
  const start = addDays(startOfWeekMonday(today), -7 * (INSIGHT_HISTORY_WEEKS - 1));
  const load = new Map<string, number>();
  for (const a of mockInsightActivities(today)) if (a.date) load.set(a.date, (load.get(a.date) ?? 0) + (a.trainingLoad ?? 0));
  const recent = mockWellness(today);
  const series: { date: string; ctl: number; atl: number }[] = [];
  let ctl = 25;
  let atl = 25;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const l = load.get(d) ?? 0;
    ctl += (l - ctl) / 42;
    atl += (l - atl) / 7;
    series.push({ date: d, ctl, atl });
  }
  const join = series.findIndex((s) => s.date === recent[0].date);
  const dCtl = recent[0].ctl! - series[join - 1].ctl;
  const dAtl = recent[0].atl! - series[join - 1].atl;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  // HRV & resting HR fiktif yang stabil (0.15.2) supaya baseline pribadi 30 hari terlihat aktif di Insight demo.
  const older = series.slice(0, join).map((s, i) => ({ id: s.date, ctl: r1(s.ctl + dCtl), atl: r1(s.atl + dAtl), hrv: 58 + ((i * 7) % 9), restingHR: 51 + ((i * 5) % 3) }));
  const all = [...normalizeList(older, normalizeWellness), ...recent];
  return all.slice(-days);
}

/** Gerakan per jenis sesi demo: [gerakan, set, beban/band/detik]. ★ = gerakan pertama (berbeban, progresi). */
type DemoSet = { movement: string; sets: number; value: number; unit: "reps" | "sec"; load?: number; band?: string };
const DEMO_ST: Record<"lower" | "upperPush" | "upperPull" | "fullBody", (k: number) => DemoSet[]> = {
  lower: (k) => [
    demoSquat(k),
    { movement: "Glute Bridge", sets: 3, value: 12, unit: "reps" },
    { movement: "Seated Band Hamstring Curl", sets: 2, value: 12, unit: "reps", band: "Medium" },
    { movement: "Side Plank", sets: 2, value: 30, unit: "sec" },
    { movement: "Tibialis Wall Raise", sets: 2, value: 15, unit: "reps" },
  ],
  upperPush: (k) => [
    { movement: "Floor Press", sets: 3, value: 10, unit: "reps", load: Math.min(14, 10 + Math.floor(k / 3)) },
    { movement: "Push-Up", sets: 2, value: 10, unit: "reps" },
    { movement: "DB Scaption", sets: 2, value: 12, unit: "reps", load: 2 },
    { movement: "Dead Bug", sets: 2, value: 10, unit: "reps" },
  ],
  upperPull: (k) => [
    { movement: "Supported Single-Arm Row", sets: 3, value: 10, unit: "reps", load: Math.min(7.5, 5 + 0.5 * Math.floor(k / 3)) },
    { movement: "Dead Hang", sets: 3, value: 20 + k, unit: "sec" },
    { movement: "Band Reverse Fly", sets: 2, value: 15, unit: "reps", band: "Light" },
    { movement: "Plank", sets: 2, value: 30, unit: "sec" },
  ],
  fullBody: (k) => [demoSquat(k), { movement: "Floor Press", sets: 2, value: 10, unit: "reps", load: 12 }, { movement: "Supported Single-Arm Row", sets: 2, value: 10, unit: "reps", load: 6 }],
};

/** Barbell Squat demo: naik ke batas alat 17 kg, lalu rep naik (8 → 12) dan tempo/jeda. */
function demoSquat(k: number): DemoSet {
  const load = Math.min(17, 12 + k);
  const reps = load < 17 ? 8 : Math.min(12, 8 + (k - 5));
  return { movement: "Barbell Squat", sets: 3, value: reps, unit: "reps", load };
}

const DEMO_TYPE: [RegExp, "lower" | "upperPush" | "upperPull" | "fullBody"][] = [
  [/lower/i, "lower"],
  [/push/i, "upperPush"],
  [/pull/i, "upperPull"],
  [/full/i, "fullBody"],
];

/** Batas alat Barbell Squat di data demo (bar 5 kg + plat), untuk penanda "mentok". */
export const DEMO_BARBELL_CAP_KG = 17;
/** Minggu demo terakhir tanpa rincian set (data sebelum 0.15.1 → volume perkiraan). */
const DEMO_DETAIL_WEEKS = 8;

/**
 * Data ST demo untuk Insight (0.15.1), tidak pernah ditulis ke perangkat: satu sesi mode latihan untuk setiap
 * aktivitas strength demo (tanggal & jam sama, jadi digabung oleh dedupe), log ★ set terakhir, dan PR. Sesi lebih
 * dari 8 minggu lalu tanpa rincian set (seperti data sebelum 0.15.1). Barbell Squat mentok di 17 kg lalu naik rep,
 * tempo/jeda, dan pindah ke varian Rear-Foot-Elevated Split Squat.
 */
export function mockInsightStrength(today: string): { sessions: StSession[]; log: LogEntry[]; prs: PrEntry[] } {
  const strength = mockInsightActivities(today)
    .filter((a) => a.category === "strength" && a.date && a.startLocal)
    .sort((a, b) => a.startLocal!.localeCompare(b.startLocal!));
  const detailFrom = addDays(startOfWeekMonday(today), -7 * (DEMO_DETAIL_WEEKS - 1));
  const sessions: StSession[] = [];
  const log: LogEntry[] = [];
  const typeOf = (name: string) => DEMO_TYPE.find(([re]) => re.test(name))?.[1] ?? "fullBody";
  const legs = (t: string) => t === "lower" || t === "fullBody";
  // Progresi Barbell Squat dipusatkan di 12 sesi kaki terakhir (rentang 12 minggu Insight).
  let squatK = 12 - strength.filter((a) => legs(typeOf(a.name))).length;
  strength.forEach((a, i) => {
    const type = typeOf(a.name);
    const k = legs(type) ? Math.max(0, squatK++) : i;
    const plan = DEMO_ST[type](Math.min(k, 30));
    const startedAt = new Date(Date.parse(`${a.startLocal!.slice(0, 16)}:00Z`) - 7 * 3_600_000).toISOString();
    const setsTotal = plan.reduce((t, p) => t + p.sets, 0);
    const detailed = a.date! >= detailFrom;
    const lastPhase = type === "lower" && k >= 9;
    sessions.push({
      id: `demo-st-${i}`,
      date: a.date!,
      startedAt,
      type,
      title: a.name,
      difficulty: "moderate",
      durationMin: Math.round((a.movingTimeSec ?? 2400) / 60),
      rpe: 5 + (i % 3),
      setsDone: setsTotal,
      setsPlanned: setsTotal,
      movements: plan.map((p) => p.movement),
      ...(detailed
        ? {
            sets: plan.flatMap((p) =>
              Array.from({ length: p.sets }, () => ({
                movement: p.movement,
                ...(p.load !== undefined ? { load: p.load } : {}),
                ...(p.band ? { band: p.band } : {}),
                value: p.value,
                unit: p.unit,
                ...(lastPhase && p.movement === "Barbell Squat" ? { tempo: true } : {}),
              })),
            ),
          }
        : {}),
      updatedAt: startedAt,
    });
    const star = plan[0];
    const variant = type === "lower" && k >= 11;
    log.push({
      id: `demo-log-${i}`,
      date: a.date!,
      movement: variant ? "Rear-Foot-Elevated Split Squat" : star.movement,
      ...(variant ? { load: 8, variantOf: "Barbell Squat" } : star.load !== undefined ? { load: star.load } : {}),
      ...(lastPhase && !variant ? { tempo: true } : {}),
      value: star.value,
      valueUnit: star.unit,
      target: { lo: 8, hi: 12 },
      rpe: 6,
      targetRpe: 6,
      deload: false,
      blockIndex: 0,
      updatedAt: startedAt,
    });
  });
  const first = sessions[0]?.date ?? today;
  const prs: PrEntry[] = [
    { id: "demo-pr-1", movement: "Barbell Squat", loadKg: 10, sets: 3, reps: 8, date: addDays(first, -10), source: "manual", updatedAt: `${first}T00:00:00.000Z` },
    { id: "demo-pr-2", movement: "Floor Press", loadKg: 8, sets: 3, reps: 10, date: addDays(first, -10), source: "manual", updatedAt: `${first}T00:00:00.000Z` },
  ];
  return { sessions, log, prs };
}

/** Check-in demo untuk Insight (0.15.2, fiktif, tidak ditulis ke perangkat): ±5 dari 7 hari, nyeri shin turun pelan. */
export function mockInsightCheckins(today: string): import("@/lib/checkin").Checkin[] {
  const out: import("@/lib/checkin").Checkin[] = [];
  for (let i = 83; i >= 1; i--) {
    if (i % 7 === 2 || i % 7 === 5) continue;
    const date = addDays(today, -i);
    out.push({ date, shin: Math.max(0, Math.round(1 + (i / 83) * 4 + ((i * 7) % 3) - 1)), soreness: (i * 5) % 7, sleep: 2 + ((i * 3) % 4), mood: 3 + (i % 3), updatedAt: `${date}T00:30:00.000Z` });
  }
  return out;
}
