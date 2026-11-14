/**
 * Program latihan berbasis target lomba (5K / 10K / Half / Full Marathon). Modul murni.
 *
 * Struktur:
 *  - Fase Base → Build → Peak → Taper (Bompa: periodisasi; Daniels: jenis sesi per fase).
 *  - Long run naik maksimal 10%/minggu dan ≤ 2 km/minggu; setiap minggu ke-4 cutback
 *    (±75%) — selaras dengan blok 4 minggu & peringatan kenaikan volume (Nielsen 2014).
 *  - 3–4 lari/minggu (sisanya untuk ST), hari quality & long run dijauhkan dari ST kaki (Wilson 2012).
 */
import { DEFAULT_TOPS, hrTargets } from "./hr-zones";
import { addDays } from "@/lib/date";
import type { Difficulty } from "@/lib/generator/types";
import { profile, type AthleteProfile } from "@/lib/profile";
import type { Locale } from "@/lib/i18n/locale";
import { PROGRAM_LIB, programDay } from "@/lib/i18n/messages/program-lib";

type ProgramText = (typeof PROGRAM_LIB)[Locale];

export type RaceTarget = "5k" | "10k" | "hm" | "fm";
/** `prebase` (0.13.3): minggu easy sebelum program inti bila Hari H lebih jauh dari panjang maksimal. */
export type Phase = "prebase" | "base" | "build" | "peak" | "taper";

export interface RaceSpec {
  label: string;
  short: string;
  km: number;
  weeks: number;
  taperWeeks: number;
  /** Long run puncak (km) & long run awal default. */
  peakLongKm: number;
  startLongKm: number;
  /** Batas bawah long run saat taper (km). */
  defaultGoalSec: number;
}

export const RACES: Record<RaceTarget, RaceSpec> = {
  "5k": { label: "PB 5K", short: "5K", km: 5, weeks: 8, taperWeeks: 1, peakLongKm: 10, startLongKm: 6, defaultGoalSec: 30 * 60 },
  "10k": { label: "PB 10K", short: "10K", km: 10, weeks: 10, taperWeeks: 1, peakLongKm: 14, startLongKm: 7, defaultGoalSec: 60 * 60 },
  hm: { label: "Half Marathon", short: "HM 21K", km: 21.0975, weeks: 12, taperWeeks: 2, peakLongKm: 18, startLongKm: 10, defaultGoalSec: 3 * 3600 },
  fm: { label: "Full Marathon", short: "FM 42K", km: 42.195, weeks: 16, taperWeeks: 3, peakLongKm: 30, startLongKm: 12, defaultGoalSec: 6 * 3600 + 15 * 60 },
};

export const PHASE_LABEL: Record<Phase, string> = { prebase: "Pre-Base", base: "Base", build: "Build", peak: "Peak", taper: "Taper" };

export type SessionKind = "quality" | "easy" | "recovery" | "long" | "race";

export interface ProgramSession {
  day: string;
  /** Jenis sesi untuk kepatuhan & kalender (0.13): slot Selasa = quality walau isinya ringan (cutback/taper). */
  kind: SessionKind;
  title: string;
  detail: string;
  intensity: Difficulty;
  /** Perkiraan jarak (km) untuk total mingguan. */
  km: number;
  /** Durasi rencana (menit) bila sesi ditentukan oleh waktu; selain itu jarak `km` yang dipakai. */
  minutes?: number;
  isRace?: boolean;
}

export interface ProgramWeek {
  index: number; // 1-based
  start: string; // Senin, YYYY-MM-DD
  phase: Phase;
  cutback: boolean;
  raceWeek: boolean;
  longRunKm: number;
  sessions: ProgramSession[];
  totalKm: number;
  focus: string;
}

export interface ProgramInput {
  race: RaceTarget;
  goalSec: number;
  /** Senin minggu pertama (YYYY-MM-DD). */
  startDate: string;
  runsPerWeek: 3 | 4;
  /** Long run terjauh 30 hari terakhir (dari intervals.icu), bila ada. */
  currentLongRunKm?: number;
  /** Panjang program inti termasuk taper (0.13.3); kosong = panjang standar jarak itu. */
  weeks?: number;
  /** Minggu pre-Base sebelum program inti (0.13.3), bila Hari H lebih jauh dari panjang maksimal. */
  preBaseWeeks?: number;
  /** Long run terjauh asli (tanpa batas bawah default), titik awal pre-Base. */
  rawLongestKm?: number;
  /** Hari H (YYYY-MM-DD, 0.13.3); kosong = Minggu minggu terakhir. */
  raceDate?: string;
}

export interface Program {
  input: ProgramInput;
  spec: RaceSpec;
  raceDate: string;
  racePaceSec: number;
  weeks: ProgramWeek[];
  warnings: string[];
  strengthNote: string;
  /** 1.2.0: peringatan "program lebih pendek dari standar" (juga ada di `warnings`), untuk pratinjau target. */
  cappedWarning?: string;
}

// ---------- utilitas waktu & pace ----------

export function formatPaceSec(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}/km`;
}

export function formatGoal(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "30:00", "1:00:00", "2:59:30" → detik. Tidak valid → undefined. */
export function parseGoal(text: string): number | undefined {
  const parts = text.trim().split(":").map((p) => Number(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return undefined;
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  if (m >= 60 || s >= 60) return undefined;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : undefined;
}

/** Target dari profil: "Sub-30m 5K", "Sub-1h 10K", "Sub-3h Half Marathon". */
export function goalFromProfile(race: RaceTarget, p: AthleteProfile = profile): number {
  const targets = p.targets?.raceTargets ?? [];
  const pattern: Record<RaceTarget, RegExp> = { "5k": /\b5K\b/i, "10k": /\b10K\b/i, hm: /half/i, fm: /\bfull\b|\bFM\b|\b42K\b/i };
  const t = targets.find((x) => pattern[race].test(x));
  const m = t?.match(/sub[-\s]?(\d+(?:[.,]\d+)?)\s*(h|m)/i);
  if (m) {
    const v = Number(m[1].replace(",", "."));
    return Math.round(m[2].toLowerCase() === "h" ? v * 3600 : v * 60);
  }
  return RACES[race].defaultGoalSec;
}

function zone(p: AthleteProfile, key: string, fallback: string): string {
  const v = p.runZones?.[key]?.pace;
  return typeof v === "string" && v.trim() ? v.replace(/\/km$/, "") + "/km" : fallback;
}

/** Bulatkan ke bawah ke kelipatan 0,5 km (supaya batas kenaikan tidak terlewati). */
const floorHalf = (km: number) => Math.floor(km * 2) / 2;

// ---------- fase & long run ----------

export interface PhaseCounts {
  base: number;
  build: number;
  peak: number;
  taper: number;
}

/**
 * Minggu per fase untuk program inti sepanjang `weeks` (termasuk taper).
 * - ≥ panjang standar: rumus proporsional yang sama (Base 40%, Build 35%, sisanya Peak).
 * - Lebih pendek (0.13.3): mulai dari alokasi standar, Base dipangkas dulu lalu Build. Peak tetap sepanjang
 *   standar (2 minggu, FM 3) kecuali pra-taper lebih pendek; taper tidak pernah dipangkas.
 */
export function phaseCounts(spec: RaceSpec, weeks: number = spec.weeks): PhaseCounts {
  const taper = spec.taperWeeks;
  const prop = (pre: number) => {
    const base = Math.max(2, Math.round(pre * 0.4));
    const build = Math.max(2, Math.round(pre * 0.35));
    return { base, build, peak: pre - base - build };
  };
  if (weeks >= spec.weeks) return { ...prop(weeks - taper), taper };
  const std = prop(spec.weeks - taper);
  const pre = Math.max(0, weeks - taper);
  const peak = Math.min(std.peak, pre);
  const rest = pre - peak;
  const base = Math.max(0, rest - std.build);
  return { base, build: rest - base, peak, taper };
}

export function phaseOf(week: number, spec: RaceSpec, weeks: number = spec.weeks): Phase {
  const c = phaseCounts(spec, weeks);
  if (week > weeks - c.taper) return "taper";
  if (week <= c.base) return "base";
  if (week <= c.base + c.build) return "build";
  return "peak";
}

/** Minggu cutback: setiap minggu ke-4 sebelum taper (bukan minggu terakhir pra-taper). */
export function isCutback(week: number, spec: RaceSpec, weeks: number = spec.weeks): boolean {
  const pre = weeks - spec.taperWeeks;
  return week % 4 === 0 && week < pre;
}

/** Satu langkah kenaikan long run: ≤ 10% dan ≤ 2 km dari level sebelumnya, maksimal `peak`. */
export const nextLongRun = (level: number, peak: number) => Math.min(peak, floorHalf(Math.min(level * 1.1, level + 2)));

/** Long run awal program: max(awal default, terjauh 30 hari), maksimal 75% puncak. */
export const startLongRun = (spec: RaceSpec, currentLongRunKm?: number) =>
  floorHalf(Math.min(spec.peakLongKm * 0.75, Math.max(spec.startLongKm, currentLongRunKm ?? 0)));

export function longRunPlan(spec: RaceSpec, currentLongRunKm?: number, weeks: number = spec.weeks): number[] {
  const pre = weeks - spec.taperWeeks;
  const start = startLongRun(spec, currentLongRunKm);
  const plan: number[] = [];
  let level = start; // level progresi (tanpa cutback)
  for (let w = 1; w <= weeks; w++) {
    if (w > pre) {
      // Taper: turun bertahap dari puncak; minggu lomba = lomba itu sendiri.
      const t = w - pre;
      plan.push(w === weeks ? 0 : floorHalf(level * (t === 1 ? 0.65 : t === 2 ? 0.5 : 0.4)));
      continue;
    }
    // Naik ≤ 10% dan ≤ 2 km dari level sebelumnya, maksimal puncak.
    if (w > 1 && !isCutback(w, spec, weeks)) level = nextLongRun(level, spec.peakLongKm);
    plan.push(isCutback(w, spec, weeks) ? floorHalf(level * 0.75) : level);
  }
  return plan;
}

/** Di bawah 5 km kenaikan 10% belum sampai 0,5 km (pembulatan), jadi pre-Base & simulasi mulai paling rendah dari sini. */
export const MIN_RAMP_KM = 5;

/**
 * Long run pre-Base (0.13.3): mulai dari long run terjauh asli (paling rendah 5 km), naik dengan aturan yang sama,
 * cutback tiap minggu ke-4, dan berhenti di titik awal program inti.
 */
export function preBaseLongRuns(weeks: number, rawLongestKm: number | undefined, capKm: number): number[] {
  let level = Math.min(capKm, floorHalf(Math.max(MIN_RAMP_KM, rawLongestKm ?? 0)));
  const out: number[] = [];
  for (let w = 1; w <= weeks; w++) {
    if (w > 1 && w % 4 !== 0) level = nextLongRun(level, capKm);
    out.push(w % 4 === 0 ? floorHalf(level * 0.75) : level);
  }
  return out;
}

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
/** Nama hari (Senin..Minggu) dari tanggal YYYY-MM-DD. */
export const dayNameOf = (date: string) => DAY_NAMES[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];

// ---------- sesi ----------

export function buildProgram(input: ProgramInput, p: AthleteProfile = profile, locale: Locale = "id"): Program {
  const L = PROGRAM_LIB[locale];
  const spec = RACES[input.race];
  const racePaceSec = input.goalSec / spec.km;
  const easy = zone(p, "easy", "8:00–8:50/km");
  // Batas Easy dari zona HR efektif (0.17); bawaan 140.
  const easyBelow = hrTargets(p.hrTops ?? DEFAULT_TOPS).easyBelow;
  const tempo = zone(p, "tempo", "6:15–6:30/km");
  const interval = zone(p, "miniInterval", "5:15–5:35/km");
  const norwegian = zone(p, "norwegian4x4", "5:50/km");
  const rp = formatPaceSec(racePaceSec);
  // 0.13.3: panjang program inti dari Hari H, ditambah minggu pre-Base bila Hari H jauh. Tanpa itu = panjang standar.
  const main = input.weeks ?? spec.weeks;
  const preBase = Math.max(0, input.preBaseWeeks ?? 0);
  const total = preBase + main;
  const longs = longRunPlan(spec, input.currentLongRunKm, main);
  const preLongs = preBaseLongRuns(preBase, input.rawLongestKm, longs[0]);
  const raceDay = input.raceDate ? dayNameOf(input.raceDate) : "Minggu";
  const easyKmPerMin = 1 / 8.5; // ±8:30/km untuk estimasi jarak sesi easy

  const weeks: ProgramWeek[] = [];
  for (let w = 1; w <= total; w++) {
    // Indeks minggu di program inti (≤ 0 = pre-Base), supaya program inti sama dengan program tanpa pre-Base.
    const m = w - preBase;
    const phase: Phase = m <= 0 ? "prebase" : phaseOf(m, spec, main);
    const cutback = m <= 0 ? w % 4 === 0 : isCutback(m, spec, main);
    const raceWeek = w === total;
    const longKm = m <= 0 ? preLongs[w - 1] : longs[m - 1];
    const sessions: ProgramSession[] = [];

    // Sesi easy (Kamis): durasi mengikuti fase, dipangkas saat cutback/taper.
    const easyMin = raceWeek ? 20 : phase === "taper" || cutback ? 30 : phase === "base" ? 35 : 40;
    const easySession: ProgramSession = {
      day: raceWeek ? "Rabu" : "Kamis",
      title: `Easy run ${easyMin}'`,
      detail: L.easyDetail(easy, easyBelow),
      kind: "easy",
      minutes: easyMin,
      intensity: "easy",
      km: Math.round(easyMin * easyKmPerMin * 10) / 10,
    };

    // Sesi quality (Selasa) sesuai fase & jarak lomba.
    const quality = qualitySession({ race: input.race, phase, cutback, raceWeek, w: m <= 0 ? w : m, tempo, interval, norwegian, rp, easy, L });

    // Minggu lomba: hanya sesi yang jatuh sebelum Hari H.
    const beforeRace = (s: ProgramSession) => !raceWeek || DAY_NAMES.indexOf(s.day) < DAY_NAMES.indexOf(raceDay);
    sessions.push(...[quality, easySession].filter(beforeRace));

    if (input.runsPerWeek === 4 && !raceWeek) {
      sessions.push({
        day: "Jumat",
        title: "Recovery run 25'",
        detail: L.recoveryDetail(easy),
        kind: "recovery",
        minutes: 25,
        intensity: "easy",
        km: Math.round(25 * easyKmPerMin * 10) / 10,
      });
    }

    if (raceWeek) {
      sessions.push({
        day: raceDay,
        title: L.raceTitle(spec.short, formatGoal(input.goalSec)),
        detail: L.raceDetail(rp),
        kind: "race",
        intensity: "high",
        km: spec.km,
        isRace: true,
      });
    } else {
      const progressive = (input.race === "hm" || input.race === "fm") && phase === "peak" && !cutback;
      sessions.push({
        day: "Minggu",
        title: `Long run ${longKm} km`,
        detail: progressive
          ? L.longProgressive(easy, rp)
          : L.longEasy(easy, easyBelow),
        kind: "long",
        intensity: progressive ? "moderate" : "easy",
        km: longKm,
      });
    }

    const totalKm = Math.round(sessions.reduce((s, x) => s + x.km, 0) * 10) / 10;
    weeks.push({
      index: w,
      start: addDays(input.startDate, (w - 1) * 7),
      phase,
      cutback,
      raceWeek,
      longRunKm: longKm,
      sessions,
      totalKm,
      focus: focusText(phase, cutback, raceWeek, L),
    });
  }

  const warnings: string[] = [];
  const current = input.currentLongRunKm ?? 0;
  if (input.race === "fm" && current < 12) {
    warnings.push(L.warn.fm);
  }
  if (input.race === "hm" && current > 0 && current < 6) {
    warnings.push(L.warn.hm);
  }
  const peakWeek = weeks.reduce((a, b) => (b.longRunKm > a.longRunKm ? b : a), weeks[0]);
  if (input.runsPerWeek === 3 && peakWeek.longRunKm / peakWeek.totalKm > 0.55) {
    warnings.push(L.warn.peak3(peakWeek.longRunKm));
  }
  let cappedWarning: string | undefined;
  if (main < spec.weeks) {
    const reached = Math.max(...longs);
    const standard = Math.max(...longRunPlan(spec, input.currentLongRunKm));
    if (reached < standard) {
      cappedWarning = L.warn.capped(reached, standard);
      warnings.push(cappedWarning);
    }
  }
  const tempoFast = paceRangeFastSec(tempo);
  if (tempoFast && racePaceSec < tempoFast - 30 && input.race !== "5k") {
    warnings.push(L.warn.ambitious(rp, tempo));
  }

  return {
    input,
    spec,
    raceDate: input.raceDate ?? addDays(input.startDate, total * 7 - 1),
    racePaceSec,
    weeks,
    warnings,
    strengthNote: L.strengthNote,
    ...(cappedWarning ? { cappedWarning } : {}),
  };
}

function paceRangeFastSec(range: string): number | undefined {
  const m = range.match(/(\d+):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

function focusText(phase: Phase, cutback: boolean, raceWeek: boolean, L: ProgramText): string {
  if (raceWeek) return L.focus.raceWeek;
  if (phase === "prebase") return L.focus.prebase;
  if (cutback) return L.focus.cutback;
  return L.focus[phase];
}

function qualitySession(o: {
  race: RaceTarget;
  phase: Phase;
  cutback: boolean;
  raceWeek: boolean;
  w: number;
  tempo: string;
  interval: string;
  norwegian: string;
  rp: string;
  easy: string;
  L: ProgramText;
}): ProgramSession {
  const { race, phase, cutback, raceWeek, w, tempo, interval, norwegian, rp, easy, L } = o;
  const day = "Selasa";
  if (raceWeek) {
    return { day, kind: "quality", minutes: 25, title: "Sharpener 25'", detail: L.sharpener(rp), intensity: "moderate", km: 4 };
  }
  if (cutback || phase === "taper" || phase === "prebase") {
    return { day, kind: "quality", minutes: 30, title: "Easy + strides 30'", detail: L.strides(easy), intensity: "easy", km: 3.5 };
  }
  if (phase === "base") {
    return {
      day,
      kind: "quality",
      minutes: 35,
      title: L.fartlekTitle,
      detail: L.fartlek(w % 2 ? 6 : 8),
      intensity: "moderate",
      km: 5,
    };
  }
  if (phase === "build") {
    const reps = w % 2 ? 2 : 3;
    return {
      day,
      kind: "quality",
      title: `Tempo ${reps}×${reps === 2 ? 10 : 8}'`,
      detail: L.tempo(reps, reps === 2 ? 10 : 8, tempo),
      intensity: "moderate",
      km: 6.5,
    };
  }
  // Peak — spesifik jarak lomba.
  if (race === "5k") return { day, kind: "quality", title: "Interval 5×800 m", detail: L.interval5k(interval), intensity: "high", km: 6.5 };
  if (race === "10k") return { day, kind: "quality", title: "Interval 4×1 km", detail: L.interval10k(interval), intensity: "high", km: 7.5 };
  if (race === "hm") return { day, kind: "quality", title: "Race pace 3×2 km", detail: L.racePaceHm(rp), intensity: "moderate", km: 9 };
  return { day, kind: "quality", title: "Norwegian 4×4", detail: L.norwegian(norwegian), intensity: "high", km: 7 };
}

/** Minggu program yang berjalan pada tanggal tertentu (1-based), atau 0 bila belum mulai / sudah selesai. */
export function currentWeekIndex(program: Program, today: string): number {
  for (const w of program.weeks) {
    if (today >= w.start && today <= addDays(w.start, 6)) return w.index;
  }
  return 0;
}

export function weekToText(program: Program, week: ProgramWeek, locale: Locale = "id"): string {
  const L = PROGRAM_LIB[locale];
  const lines = [
    L.weekHead(program.spec.label, week.index, program.weeks.length, PHASE_LABEL[week.phase], week.cutback),
    week.focus,
    "",
    ...week.sessions.map((s) => `- ${programDay(s.day, locale)}: ${s.title} · ${s.detail}`),
    "",
    L.weekTotal(week.totalKm, program.strengthNote),
  ];
  return lines.join("\n");
}

// ---------- hitung mundur & minggu lomba (0.13.2, PROGRAM-HIDUP §4.9) ----------

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/** Sisa hari ke lomba (0 = hari ini); null setelah hari lomba. */
export function raceCountdown(program: Pick<Program, "raceDate">, today: string): { days: number } | null {
  const days = dayDiff(program.raceDate, today);
  return days >= 0 ? { days } : null;
}

/** Checklist umum H-1 (bukan saran medis). Rencana pace dari perkiraan bila ada, selain itu race pace target. */
export function raceWeekChecklist(
  { racePaceSec, predictedPaceSec }: { racePaceSec: number; predictedPaceSec?: number },
  locale: Locale = "id",
): string[] {
  const c = PROGRAM_LIB[locale].checklist;
  const plan =
    predictedPaceSec !== undefined && Math.round(predictedPaceSec) !== Math.round(racePaceSec)
      ? c.predicted(formatPaceSec(predictedPaceSec), formatPaceSec(racePaceSec))
      : c.plan(formatPaceSec(racePaceSec));
  return [c.sleep, c.shoes, c.food, plan];
}

/** Hari ke-1 sampai ke-14 setelah lomba yang hasilnya belum dicatat untuk jarak ini. */
export const POST_RACE_DAYS = 14;
export function postRaceOffer(program: Pick<Program, "raceDate" | "input">, raceResults: { distance: string; date: string }[], today: string): boolean {
  const after = dayDiff(today, program.raceDate);
  if (after < 1 || after > POST_RACE_DAYS) return false;
  return !raceResults.some((r) => r.distance === program.input.race && r.date >= program.raceDate);
}
