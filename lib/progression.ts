/**
 * Progresi beban dari riwayat sesi (murni, tanpa I/O).
 *
 * Aturan "2-for-2" (NSCA Essentials) disesuaikan dengan batas RPE ≤ 7:
 * naik satu tingkat hanya bila DUA sesi berturut-turut mencapai batas atas
 * repetisi dengan RPE tidak melebihi target. RPE terasa lebih berat dari
 * target → tahan; jauh lebih berat (> target + 1) → turun satu tingkat.
 * Beban tidak pernah melewati batas movement library. Minggu deload: progresi ditunda.
 */
import { parseWeight, type Movement, type WeightSpec } from "@/lib/profile";
import type { StrengthItem, StrengthWorkout } from "@/lib/generator/types";

export interface LogEntry {
  id: string;
  /** YYYY-MM-DD (WIB) */
  date: string;
  movement: string;
  /** Beban kg (untuk gerakan berbeban). */
  load?: number;
  /** Nama band (untuk gerakan band). */
  band?: string;
  /** Repetisi di set terakhir, atau detik untuk gerakan tahan (hold). */
  value: number;
  valueUnit: "reps" | "sec";
  /** Target saat sesi itu diresepkan. */
  target: { lo: number; hi: number };
  rpe: number;
  targetRpe: number;
  deload: boolean;
  blockIndex: number;
}

export type Recommendation =
  | { kind: "load"; action: "increase" | "hold" | "decrease"; load: number; from: number; reason: string }
  | { kind: "band"; band: string; reason: string }
  | { kind: "hold"; seconds: number; reason: string }
  | { kind: "info"; reason: string };

/** "10–12", "8/kaki", "10–12 (turun 3 detik)", "15" → { lo, hi }. */
export function parseRepRange(reps?: string): { lo: number; hi: number } | undefined {
  const m = reps?.match(/(\d+)(?:\s*[–-]\s*(\d+))?/);
  if (!m) return undefined;
  const lo = Number(m[1]);
  return { lo, hi: m[2] ? Number(m[2]) : lo };
}

/** Kenaikan beban terkecil yang masuk akal untuk rentang library ini. */
export function loadStep(spec: Extract<WeightSpec, { kind: "load" }>): number {
  return spec.max >= 10 ? 1 : spec.max >= 3 ? 0.5 : 0.25;
}

const round = (v: number, step: number) => Math.round(v / step) * step;

/** Batas atas gerakan tahan (Dead Hang, Farmer's Hold). */
export const MAX_HOLD_SEC = 60;

function hitTarget(e: LogEntry): boolean {
  return e.value >= e.target.hi && e.rpe <= e.targetRpe;
}

/** Riwayat satu gerakan, terbaru dulu. */
export function historyFor(entries: LogEntry[], movement: string): LogEntry[] {
  return entries
    .filter((e) => e.movement === movement)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function recommend(movement: Movement, entries: LogEntry[], opts: { deload: boolean }): Recommendation | null {
  const h = historyFor(entries, movement.name).filter((e) => !e.deload);
  if (!h.length) return null;
  if (opts.deload) return { kind: "info", reason: "Minggu deload — progresi ditunda, pakai beban deload." };

  const spec = parseWeight(movement.weight);
  const [last, prev] = h;
  const twice = !!prev && hitTarget(last) && hitTarget(prev);

  if (last.valueUnit === "sec") {
    if (twice && last.value < MAX_HOLD_SEC) {
      const seconds = Math.min(MAX_HOLD_SEC, last.value + 5);
      return { kind: "hold", seconds, reason: `2 sesi tuntas di ${last.value} dtk — naik ke ${seconds} dtk.` };
    }
    return { kind: "hold", seconds: last.value, reason: `Tahan ${last.value} dtk sampai 2 sesi tuntas dengan RPE ≤ ${last.targetRpe}.` };
  }

  if (spec.kind === "load" && last.load !== undefined) {
    const step = loadStep(spec);
    // Beban terakhir dipakai apa adanya (hanya di-clamp); hasil baru dibulatkan ke 0.25 kg.
    const clamp = (v: number) => Math.min(spec.max, Math.max(spec.min, round(v, 0.25)));
    const from = Math.min(spec.max, Math.max(spec.min, last.load));
    if (last.rpe > last.targetRpe + 1) {
      const load = clamp(from - step);
      return { kind: "load", action: load < from ? "decrease" : "hold", load, from, reason: `RPE terakhir ${last.rpe} (target ${last.targetRpe}) — turunkan dulu.` };
    }
    if (last.rpe > last.targetRpe) {
      return { kind: "load", action: "hold", load: from, from, reason: `RPE terakhir ${last.rpe} sedikit di atas target — tahan beban.` };
    }
    if (twice) {
      if (from >= spec.max) {
        return { kind: "load", action: "hold", load: from, from, reason: `Sudah di batas library (${spec.max} kg) — progresi lewat tempo lebih lambat, bukan beban.` };
      }
      const load = clamp(from + step);
      return { kind: "load", action: "increase", load, from, reason: `2 sesi berturut di batas atas rep dengan RPE ≤ ${last.targetRpe} — naik ${load - from} kg.` };
    }
    return {
      kind: "load",
      action: "hold",
      load: from,
      from,
      reason: hitTarget(last)
        ? `1/2 sesi tuntas di ${from} kg — tuntaskan sekali lagi untuk naik.`
        : `Tahan ${from} kg sampai 2 sesi berturut mencapai ${last.target.hi} rep.`,
    };
  }

  if (spec.kind === "band") {
    const idx = spec.options.indexOf(last.band ?? spec.options[0]);
    if (twice && idx >= 0 && idx < spec.options.length - 1) {
      return { kind: "band", band: spec.options[idx + 1], reason: `2 sesi tuntas dengan ${spec.options[idx]} — naik ke ${spec.options[idx + 1]} Band.` };
    }
  }

  return {
    kind: "info",
    reason: twice
      ? "2 sesi tuntas — tambah 1–2 rep atau perlambat fase turun 3 detik."
      : `Target: ${last.target.hi} rep dengan RPE ≤ ${last.targetRpe}.`,
  };
}

const ARROW: Record<"increase" | "hold" | "decrease", string> = { increase: "↑", hold: "→", decrease: "↓" };

/**
 * Terapkan rekomendasi ke gerakan utama (★) sebuah workout.
 * Beban tetap di-clamp ke rentang library, jadi aturan WAJIB tidak bisa dilanggar.
 */
export function applyProgression(
  w: StrengthWorkout,
  movements: Map<string, Movement>,
  entries: LogEntry[],
): StrengthWorkout {
  if (!entries.length) return w;
  const items = w.items.map((it): StrengthItem => {
    const m = movements.get(it.movement);
    if (!it.anchor || !m) return it;
    const rec = recommend(m, entries, { deload: w.deload });
    if (!rec) return it;
    switch (rec.kind) {
      case "load": {
        if (it.load.kind !== "load") return it;
        const spec = parseWeight(m.weight);
        if (spec.kind !== "load") return it;
        const v = Math.min(spec.max, Math.max(spec.min, rec.load));
        return { ...it, load: { ...it.load, min: v, max: v }, progression: `${ARROW[rec.action]} ${rec.reason}` };
      }
      case "band":
        return it.load.kind === "band" ? { ...it, load: { kind: "band", band: rec.band }, progression: `↑ ${rec.reason}` } : it;
      case "hold":
        return it.durationSec ? { ...it, durationSec: rec.seconds, progression: rec.reason } : it;
      case "info":
        return { ...it, progression: rec.reason };
    }
  });
  return { ...w, items };
}

/** Validasi longgar untuk data impor (JSON dari cadangan). */
export function isLogEntry(x: unknown): x is LogEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  return (
    typeof e.id === "string" &&
    typeof e.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.movement === "string" &&
    num(e.value) &&
    (e.valueUnit === "reps" || e.valueUnit === "sec") &&
    !!e.target &&
    num((e.target as Record<string, unknown>).lo) &&
    num((e.target as Record<string, unknown>).hi) &&
    num(e.rpe) &&
    num(e.targetRpe) &&
    typeof e.deload === "boolean" &&
    num(e.blockIndex) &&
    (e.load === undefined || num(e.load)) &&
    (e.band === undefined || typeof e.band === "string")
  );
}
