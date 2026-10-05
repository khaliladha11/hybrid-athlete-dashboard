/**
 * Program latihan berbasis target lomba (5K / 10K / Half / Full Marathon). Modul murni.
 *
 * Struktur:
 *  - Fase Base → Build → Peak → Taper (Bompa: periodisasi; Daniels: jenis sesi per fase).
 *  - Long run naik maksimal 10%/minggu dan ≤ 2 km/minggu; setiap minggu ke-4 cutback
 *    (±75%) — selaras dengan blok 4 minggu & peringatan kenaikan volume (Nielsen 2014).
 *  - 3–4 lari/minggu (sisanya untuk ST), hari quality & long run dijauhkan dari ST kaki (Wilson 2012).
 */
import { addDays } from "@/lib/date";
import type { Difficulty } from "@/lib/generator/types";
import { profile, type AthleteProfile } from "@/lib/profile";

export type RaceTarget = "5k" | "10k" | "hm" | "fm";
export type Phase = "base" | "build" | "peak" | "taper";

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

export const PHASE_LABEL: Record<Phase, string> = { base: "Base", build: "Build", peak: "Peak", taper: "Taper" };

export interface ProgramSession {
  day: string;
  title: string;
  detail: string;
  intensity: Difficulty;
  /** Perkiraan jarak (km) untuk total mingguan. */
  km: number;
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
}

export interface Program {
  input: ProgramInput;
  spec: RaceSpec;
  raceDate: string;
  racePaceSec: number;
  weeks: ProgramWeek[];
  warnings: string[];
  strengthNote: string;
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

export function phaseOf(week: number, spec: RaceSpec): Phase {
  const pre = spec.weeks - spec.taperWeeks;
  if (week > pre) return "taper";
  const base = Math.max(2, Math.round(pre * 0.4));
  const build = Math.max(2, Math.round(pre * 0.35));
  if (week <= base) return "base";
  if (week <= base + build) return "build";
  return "peak";
}

/** Minggu cutback: setiap minggu ke-4 sebelum taper (bukan minggu terakhir pra-taper). */
export function isCutback(week: number, spec: RaceSpec): boolean {
  const pre = spec.weeks - spec.taperWeeks;
  return week % 4 === 0 && week < pre;
}

export function longRunPlan(spec: RaceSpec, currentLongRunKm?: number): number[] {
  const pre = spec.weeks - spec.taperWeeks;
  const start = floorHalf(Math.min(spec.peakLongKm * 0.75, Math.max(spec.startLongKm, currentLongRunKm ?? 0)));
  const plan: number[] = [];
  let level = start; // level progresi (tanpa cutback)
  for (let w = 1; w <= spec.weeks; w++) {
    if (w > pre) {
      // Taper: turun bertahap dari puncak; minggu lomba = lomba itu sendiri.
      const t = w - pre;
      plan.push(w === spec.weeks ? 0 : floorHalf(level * (t === 1 ? 0.65 : t === 2 ? 0.5 : 0.4)));
      continue;
    }
    if (w > 1 && !isCutback(w, spec)) {
      // Naik ≤ 10% dan ≤ 2 km dari level sebelumnya, maksimal puncak.
      level = Math.min(spec.peakLongKm, floorHalf(Math.min(level * 1.1, level + 2)));
    }
    plan.push(isCutback(w, spec) ? floorHalf(level * 0.75) : level);
  }
  return plan;
}

// ---------- sesi ----------

export function buildProgram(input: ProgramInput, p: AthleteProfile = profile): Program {
  const spec = RACES[input.race];
  const racePaceSec = input.goalSec / spec.km;
  const easy = zone(p, "easy", "8:00–8:50/km");
  const tempo = zone(p, "tempo", "6:15–6:30/km");
  const interval = zone(p, "miniInterval", "5:15–5:35/km");
  const norwegian = zone(p, "norwegian4x4", "5:50/km");
  const rp = formatPaceSec(racePaceSec);
  const longs = longRunPlan(spec, input.currentLongRunKm);
  const easyKmPerMin = 1 / 8.5; // ±8:30/km untuk estimasi jarak sesi easy

  const weeks: ProgramWeek[] = [];
  for (let w = 1; w <= spec.weeks; w++) {
    const phase = phaseOf(w, spec);
    const cutback = isCutback(w, spec);
    const raceWeek = w === spec.weeks;
    const longKm = longs[w - 1];
    const sessions: ProgramSession[] = [];

    // Sesi easy (Kamis): durasi mengikuti fase, dipangkas saat cutback/taper.
    const easyMin = raceWeek ? 20 : phase === "taper" || cutback ? 30 : phase === "base" ? 35 : 40;
    const easySession: ProgramSession = {
      day: raceWeek ? "Rabu" : "Kamis",
      title: `Easy run ${easyMin}'`,
      detail: `Z2 @ ${easy}, HR < 140. Fokus cadence 175–180.`,
      intensity: "easy",
      km: Math.round(easyMin * easyKmPerMin * 10) / 10,
    };

    // Sesi quality (Selasa) sesuai fase & jarak lomba.
    const quality = qualitySession({ race: input.race, phase, cutback, raceWeek, w, tempo, interval, norwegian, rp, easy });

    sessions.push(quality, easySession);

    if (input.runsPerWeek === 4 && !raceWeek) {
      sessions.push({
        day: "Jumat",
        title: "Recovery run 25'",
        detail: `Sangat ringan @ ${easy}, HR < 135. Boleh diganti jalan cepat bila kaki berat.`,
        intensity: "easy",
        km: Math.round(25 * easyKmPerMin * 10) / 10,
      });
    }

    if (raceWeek) {
      sessions.push({
        day: "Minggu",
        title: `LOMBA ${spec.short} — target ${formatGoal(input.goalSec)}`,
        detail: `Race pace ${rp}. Mulai sedikit lebih lambat 1–2 km pertama, cadence 175–180.`,
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
          ? `Z2 @ ${easy}; 3 km terakhir @ race pace ${rp}. Latih minum/gel tiap 30–40 menit.`
          : `Z2 @ ${easy}, HR < 140. Boleh run-walk 4'/1' bila HR naik.`,
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
      focus: focusText(phase, cutback, raceWeek),
    });
  }

  const warnings: string[] = [];
  const current = input.currentLongRunKm ?? 0;
  if (input.race === "fm" && current < 12) {
    warnings.push("Full marathon butuh basis kuat. Long run terjauhmu < 12 km — pertimbangkan program Half Marathon dulu.");
  }
  if (input.race === "hm" && current > 0 && current < 6) {
    warnings.push("Long run terjauhmu < 6 km. Program dimulai dari 10 km — naikkan dulu ke 8 km dengan lari easy sebelum mulai.");
  }
  const peakWeek = weeks.reduce((a, b) => (b.longRunKm > a.longRunKm ? b : a), weeks[0]);
  if (input.runsPerWeek === 3 && peakWeek.longRunKm / peakWeek.totalKm > 0.55) {
    warnings.push(
      `Dengan 3 lari/minggu, long run puncak (${peakWeek.longRunKm} km) > 55% volume mingguan. Pilih 4 lari/minggu supaya beban lebih merata.`,
    );
  }
  const tempoFast = paceRangeFastSec(tempo);
  if (tempoFast && racePaceSec < tempoFast - 30 && input.race !== "5k") {
    warnings.push(`Target race pace ${rp} jauh lebih cepat dari zona tempo-mu (${tempo}). Target mungkin terlalu ambisius.`);
  }

  return {
    input,
    spec,
    raceDate: addDays(input.startDate, spec.weeks * 7 - 1),
    racePaceSec,
    weeks,
    warnings,
    strengthNote:
      "ST 2×/minggu: Senin (Lower/Full Body) & Rabu (Upper). Jangan taruh ST kaki sehari sebelum sesi Selasa atau long run Minggu. Saat taper, ST cukup 1× ringan.",
  };
}

function paceRangeFastSec(range: string): number | undefined {
  const m = range.match(/(\d+):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

function focusText(phase: Phase, cutback: boolean, raceWeek: boolean): string {
  if (raceWeek) return "Minggu lomba — segarkan kaki, tidur cukup, jangan coba hal baru.";
  if (cutback) return "Cutback — volume turun ±25% supaya tubuh beradaptasi (sejalan minggu deload blok).";
  return {
    base: "Bangun basis aerobik: mayoritas Z2, kenalkan kecepatan ringan.",
    build: "Naikkan ambang (tempo) sambil memperpanjang long run.",
    peak: "Spesifik lomba: interval & race pace, long run terjauh.",
    taper: "Taper — volume turun, intensitas dijaga singkat.",
  }[phase];
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
}): ProgramSession {
  const { race, phase, cutback, raceWeek, w, tempo, interval, norwegian, rp, easy } = o;
  const day = "Selasa";
  if (raceWeek) {
    return { day, title: "Sharpener 25'", detail: `15' easy + 4×1' @ race pace ${rp} (jeda 1' jalan).`, intensity: "moderate", km: 4 };
  }
  if (cutback || phase === "taper") {
    return { day, title: "Easy + strides 30'", detail: `25' Z2 @ ${easy} + 4×20" strides santai-cepat.`, intensity: "easy", km: 3.5 };
  }
  if (phase === "base") {
    return {
      day,
      title: "Fartlek ringan 35'",
      detail: `10' Z2, lalu ${w % 2 ? 6 : 8}×1' agak cepat / 1' jog, 5' pendinginan. RPE 5–6.`,
      intensity: "moderate",
      km: 5,
    };
  }
  if (phase === "build") {
    const reps = w % 2 ? 2 : 3;
    return {
      day,
      title: `Tempo ${reps}×${reps === 2 ? 10 : 8}'`,
      detail: `10' pemanasan Z2, ${reps}× ${reps === 2 ? 10 : 8}' @ ${tempo} (HR 160–170), jog 2' antar set.`,
      intensity: "moderate",
      km: 6.5,
    };
  }
  // Peak — spesifik jarak lomba.
  if (race === "5k") return { day, title: "Interval 5×800 m", detail: `@ ${interval}, jog 2' antar repetisi. Pemanasan & pendinginan 10'.`, intensity: "high", km: 6.5 };
  if (race === "10k") return { day, title: "Interval 4×1 km", detail: `@ ${interval}, jog 2'30" antar repetisi. Pemanasan & pendinginan 10'.`, intensity: "high", km: 7.5 };
  if (race === "hm") return { day, title: "Race pace 3×2 km", detail: `@ race pace ${rp}, jog 3' antar set. Pemanasan & pendinginan 10'.`, intensity: "moderate", km: 9 };
  return { day, title: "Norwegian 4×4", detail: `4×4' @ ${norwegian} (Z4), recovery jog 3'. Menjaga VO₂max di tengah volume tinggi.`, intensity: "high", km: 7 };
}

/** Minggu program yang berjalan pada tanggal tertentu (1-based), atau 0 bila belum mulai / sudah selesai. */
export function currentWeekIndex(program: Program, today: string): number {
  for (const w of program.weeks) {
    if (today >= w.start && today <= addDays(w.start, 6)) return w.index;
  }
  return 0;
}

export function weekToText(program: Program, week: ProgramWeek): string {
  const lines = [
    `${program.spec.label} · Minggu ${week.index}/${program.spec.weeks} (${PHASE_LABEL[week.phase]}${week.cutback ? ", cutback" : ""})`,
    week.focus,
    "",
    ...week.sessions.map((s) => `- ${s.day}: ${s.title} — ${s.detail}`),
    "",
    `Total ±${week.totalKm} km lari. ${program.strengthNote}`,
  ];
  return lines.join("\n");
}
