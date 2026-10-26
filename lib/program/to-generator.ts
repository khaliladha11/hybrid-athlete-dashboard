/**
 * Sesi rencana → isian generator atau kartu sesi program (docs/PROGRAM-HIDUP.md §4.4, keputusan D4). Murni.
 *
 * - easy/recovery → Generator Lari Easy, durasi dibulatkan ke 30/45/60 terdekat.
 * - quality → Generator Lari dengan level dari fase (intensitas sesi); pola dipilih bila ada di generator
 *   (Tempo → `tempo`, Norwegian 4×4 → `4x4`). Easy + strides (cutback/taper) → Easy 30'.
 * - long run, lomba, dan sesi spesifik lomba (race pace berseri, sharpener) tidak dibuat ulang lewat generator
 *   30/45/60 menit (D4): tampil sebagai kartu sesi program dengan teks salin format Copy Set.
 * - st-lower → Strength Lower; st-upper → Upper Pull (minggu ganjil) / Upper Push (minggu genap). Taper: Easy.
 * Judul quality yang tidak dikenali menjadi kartu, tidak dipaksa masuk generator.
 */
import type { PlanToday } from "@/lib/coach";
import { isRunPattern, type RunPattern } from "@/lib/generator/run";
import { DIFFICULTIES, DURATIONS, STRENGTH_TYPES, type Difficulty, type Duration, type StrengthType } from "@/lib/generator/types";
import type { SessionResult } from "./compliance";
import { isRunKind, type PlanKind, type PlannedSession } from "./sessions";

export type GeneratorTarget =
  | { to: "run"; duration: Duration; difficulty: Difficulty; pattern?: RunPattern }
  | { to: "strength"; type: StrengthType; duration: Duration; difficulty: Difficulty }
  | { to: "card" };

/** Menit per km untuk sesi quality tanpa durasi tertulis (termasuk pemanasan & pendinginan). */
export const QUALITY_MIN_PER_KM = 7.5;
const EASY_MIN_PER_KM = 8.5;

/** Bulatkan ke 30/45/60 terdekat (seri → yang lebih pendek). */
export function nearestDuration(min: number): Duration {
  return DURATIONS.reduce((best, d) => (Math.abs(d - min) < Math.abs(best - min) ? d : best), DURATIONS[0]);
}

export function toGenerator(s: PlannedSession): GeneratorTarget {
  switch (s.kind) {
    case "easy":
    case "recovery":
      return { to: "run", difficulty: "easy", duration: nearestDuration(s.minutes ?? (s.km ? s.km * EASY_MIN_PER_KM : 45)) };
    case "long":
    case "race":
      return { to: "card" };
    case "st-lower":
      return { to: "strength", type: "lower", duration: 45, difficulty: s.intensity === "easy" ? "easy" : "moderate" };
    case "st-upper":
      return { to: "strength", type: s.week % 2 ? "upperPull" : "upperPush", duration: 45, difficulty: s.intensity === "easy" ? "easy" : "moderate" };
    case "quality": {
      const t = s.title;
      if (/^(Race pace|Sharpener)/i.test(t)) return { to: "card" };
      if (s.intensity === "easy") return { to: "run", difficulty: "easy", duration: nearestDuration(s.minutes ?? 30) };
      const duration = nearestDuration(s.minutes ?? (s.km ?? 6) * QUALITY_MIN_PER_KM);
      if (/^Tempo/i.test(t)) return { to: "run", difficulty: "moderate", duration, pattern: "tempo" };
      // 4×4 butuh minimal 45' (pemanasan + 28' kerja).
      if (/^Norwegian 4×4/i.test(t)) return { to: "run", difficulty: "high", duration: duration < 45 ? 45 : duration, pattern: "4x4" };
      if (/^Interval/i.test(t)) return { to: "run", difficulty: "high", duration };
      if (/^Fartlek/i.test(t)) return { to: "run", difficulty: "moderate", duration };
      return { to: "card" };
    }
  }
}

/** Label pendek sesi: judul tanpa angka repetisi/durasi ("Tempo 2×10'" → "Tempo"). */
export function shortTitle(title: string): string {
  const cut = title
    .replace(/\s+\d+\s*[×x]\s*[\d.,]+.*$/u, "")
    .replace(/\s+\d+'$/u, "")
    .trim();
  return (cut || title).slice(0, 40);
}

const km1 = (km: number) => String(Math.round(km * 10) / 10);
const pace = (p: string) => p.replace(/\/km$/, "");

/**
 * Teks salin kartu sesi program, format sama dengan Copy Set ("Run [..]", "Set 1: … × N").
 * `km` boleh diganti (mis. long run yang dipendekkan saran).
 */
export function sessionCardText(s: PlannedSession, ctx: { easyPace: string; racePace: string; km?: number }): string {
  const easy = pace(ctx.easyPace);
  const race = pace(ctx.racePace);
  const km = ctx.km ?? s.km ?? 0;
  if (s.kind === "race") return `Run [${km1(km)} km, Pace ${race}]`;
  if (s.kind === "long") {
    // Long run progresif (Peak HM/FM): 3 km terakhir di race pace.
    if (s.intensity === "moderate" && km > 3) return `Run [${km1(km - 3)} km, Pace ${easy}]\nRun [3 km, Pace ${race}]`;
    return `Run [${km1(km)} km, Pace ${easy}]`;
  }
  const rp = s.title.match(/^Race pace (\d+)\s*[×x]\s*([\d.,]+) km/i);
  if (rp) return `Warm-up [10', Pace ${easy}]\nSet 1: Run [${rp[2].replace(",", ".")} km, Pace ${race}] & Rest [3'] × ${rp[1]}\nCool-down [10']`;
  if (/^Sharpener/i.test(s.title)) return `Warm-up [15', Pace ${easy}]\nSet 1: Run [1', Pace ${race}] & Rest [1'] × 4`;
  return [s.title, s.detail].filter(Boolean).join("\n");
}

// ---------- Prefill generator lewat query ----------

export interface RunPrefill {
  week: number;
  kind: PlanKind;
  duration: Duration;
  difficulty: Difficulty;
  pattern?: RunPattern;
  /** Label rencana pendek, mis. "Tempo". */
  label: string;
  /** Isian sudah diturunkan oleh saran. */
  adjusted?: boolean;
  /** Level & durasi menurut rencana (berbeda dari isian bila `adjusted`). */
  planDifficulty: Difficulty;
  planDuration: Duration;
}

export interface StrengthPrefill {
  week: number;
  type: StrengthType;
  duration: Duration;
  difficulty: Difficulty;
  label: string;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const LABEL_RE = /^[\p{L}\p{N} +×'./-]{1,40}$/u;
const KINDS: readonly PlanKind[] = ["quality", "easy", "recovery", "long", "race", "st-lower", "st-upper"];

/** Tautan generator untuk sesi rencana. `override` = versi yang diturunkan saran. */
export function generatorHref(s: PlannedSession, t: GeneratorTarget, override: { difficulty?: Difficulty; duration?: Duration } = {}): string | null {
  if (t.to === "card") return null;
  const q = new URLSearchParams({ src: "program", w: String(s.week), k: s.kind });
  if (t.to === "run") {
    const difficulty = override.difficulty ?? t.difficulty;
    const duration = override.duration ?? t.duration;
    q.set("d", String(duration));
    q.set("lvl", difficulty);
    if (t.pattern && difficulty === t.difficulty) q.set("p", t.pattern);
    q.set("t", shortTitle(s.title));
    if (override.difficulty || override.duration) {
      q.set("adj", "1");
      q.set("plvl", t.difficulty);
      q.set("pd", String(t.duration));
    }
    return `/run?${q.toString()}`;
  }
  q.set("type", t.type);
  q.set("d", String(t.duration));
  q.set("lvl", t.difficulty);
  q.set("t", shortTitle(s.title));
  return `/strength?${q.toString()}`;
}

function base(params: Params) {
  if (one(params.src) !== "program") return null;
  const week = Number(one(params.w));
  const duration = Number(one(params.d)) as Duration;
  const difficulty = one(params.lvl) as Difficulty;
  const label = one(params.t) ?? "";
  if (!Number.isInteger(week) || week < 1 || week > 30) return null;
  if (!DURATIONS.includes(duration) || !DIFFICULTIES.includes(difficulty)) return null;
  return { week, duration, difficulty, label: LABEL_RE.test(label) ? label : "Sesi program" };
}

export function parseRunPrefill(params: Params): RunPrefill | null {
  const b = base(params);
  const kind = one(params.k) as PlanKind;
  if (!b || !KINDS.includes(kind) || !isRunKind(kind)) return null;
  const p = one(params.p);
  const adjusted = one(params.adj) === "1";
  const planDifficulty = one(params.plvl) as Difficulty;
  const planDuration = Number(one(params.pd)) as Duration;
  const plan = adjusted && DIFFICULTIES.includes(planDifficulty) && DURATIONS.includes(planDuration) ? { planDifficulty, planDuration } : { planDifficulty: b.difficulty, planDuration: b.duration };
  return { ...b, kind, ...(isRunPattern(p) ? { pattern: p } : {}), ...(adjusted ? { adjusted: true } : {}), ...plan };
}

export function parseStrengthPrefill(params: Params): StrengthPrefill | null {
  const b = base(params);
  const type = one(params.type) as StrengthType;
  if (!b || !STRENGTH_TYPES.includes(type)) return null;
  return { ...b, type };
}

// ---------- Sesi hari ini & rencana untuk saran ----------

/** Sesi hari ini yang belum selesai atau dilewati; lari didahulukan dari ST. */
export function todaySession(sessions: PlannedSession[], results: Map<string, SessionResult>, today: string): PlannedSession | null {
  const open = sessions.filter((s) => s.date === today && !["selesai", "dilewati"].includes(results.get(s.id)?.status ?? ""));
  return open.find((s) => isRunKind(s.kind)) ?? open[0] ?? null;
}

/** Rencana hari ini untuk `suggestFor`: level & durasi generator, jarak, dan long run minggu lalu. */
export function planToday(s: PlannedSession, sessions: PlannedSession[]): PlanToday | null {
  if (!isRunKind(s.kind)) return null;
  const t = toGenerator(s);
  const prevLong = sessions.find((x) => x.week === s.week - 1 && (x.kind === "long" || x.kind === "race"));
  return {
    kind: s.kind as PlanToday["kind"],
    difficulty: t.to === "run" ? t.difficulty : s.intensity,
    ...(t.to === "run" ? { duration: t.duration } : {}),
    ...(s.km !== undefined ? { km: s.km } : {}),
    ...(prevLong?.km !== undefined ? { prevLongKm: prevLong.km } : {}),
  };
}
