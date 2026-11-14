/**
 * Progresi beban dari riwayat sesi (murni, tanpa I/O).
 *
 * Aturan "2-for-2" (NSCA Essentials) disesuaikan dengan batas RPE ≤ 7:
 * naik satu tingkat hanya bila DUA sesi berturut-turut mencapai batas atas
 * repetisi dengan RPE tidak melebihi target. RPE terasa lebih berat dari
 * target → tahan; jauh lebih berat (> target + 1) → turun satu tingkat.
 * Beban tidak pernah melewati batas movement library, atau sejak 0.14.0 (aturan batas beban aktif)
 * batas efektif gerakan = min(alat, keamanan). Beban terakhir dipakai apa adanya (tanpa lompatan) dan
 * naik satu langkah. Minggu deload: progresi ditunda.
 *
 * Aturan baru 0.14.0 (hanya saat aturan batas beban aktif, STRENGTH-HIDUP §3c–d):
 * - Syarat naik relatif: dua sesi terakhir di ujung atas rep dengan **RPE ≤ target sesi − 1**.
 * - **Double progression saat mentok** (beban di batas alat/keamanan, tidak ada beban lebih berat yang bisa
 *   dirakit): rentang rep tetap per level (Easy 10–15, Moderate 8–12, High 6–10), lalu tempo/jeda, lalu varian
 *   satu sisi yang lebih sulit (`META.harderVariant`). Tempo boleh di tengah blok; ganti ★ ke varian berlaku mulai
 *   blok berikutnya (mode bebas: langsung). Alat bertambah → tidak mentok lagi → progresi beban jalan lagi.
 * - Setiap saran (Gita) menyebut alasannya dengan angka. Tidak pernah memblokir.
 */
import { parseWeight, type Movement, type WeightSpec } from "@/lib/profile";
import { metaCue, repsText } from "@/lib/i18n/safety-text";
import { META } from "@/lib/generator/meta";
import type { Difficulty, StrengthItem, StrengthWorkout } from "@/lib/generator/types";
import { latestPr, type PrEntry } from "@/lib/prs";
import type { Locale } from "@/lib/i18n/locale";
import { PROGRESSION } from "@/lib/i18n/messages/progression";

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
  /** ISO. Diisi sejak 0.12.1 (sinkron); entri lama diberi `${date}T00:00:00.000Z` saat migrasi. */
  updatedAt?: string;
  /** ISO. Ada = entri sudah dihapus (tombstone sinkron); tidak pernah tampil atau dihitung progresi. */
  deletedAt?: string;
  /** 0.14.0: sesi dikerjakan dengan tempo/jeda (turun 3 detik, jeda 2 detik). Entri lama: tanpa tempo. */
  tempo?: boolean;
  /** 0.14.0: gerakan ini dikerjakan sebagai varian lebih sulit dari gerakan tersebut. Entri lama: bukan varian. */
  variantOf?: string;
}

/** Rentang rep tetap saat beban mentok (D3). RPE tetap ≤ 7 mengikuti level. */
export const CAPPED_REPS: Record<Difficulty, { lo: number; hi: number }> = {
  easy: { lo: 10, hi: 15 },
  moderate: { lo: 8, hi: 12 },
  high: { lo: 6, hi: 10 },
};
export const cappedRepsLabel = (d: Difficulty) => `${CAPPED_REPS[d].lo}–${CAPPED_REPS[d].hi}`;
export const TEMPO_TEXT = PROGRESSION.id.tempo;

/** Konteks sesi untuk aturan baru: level, awal blok (untuk varian ★), mode bebas, dan pencari varian. */
export interface ProgressionCtx {
  difficulty: Difficulty;
  blockStart?: string;
  free?: boolean;
  /** Gerakan library yang tersedia & lolos kondisi aktif (undefined = tidak bisa dipakai). */
  usable?: (name: string) => Movement | undefined;
}

export type Recommendation =
  | {
      kind: "load";
      action: "increase" | "hold" | "decrease";
      load: number;
      from: number;
      reason: string;
      /** 0.14.0 saat mentok: rentang rep tetap, tempo/jeda, atau varian yang dipakai sekarang. */
      reps?: string;
      tempo?: boolean;
      variant?: string;
      /** 1.2.0: alasan tanpa kalimat "pindah ke varian" (untuk merangkai alasan lain tanpa mencocokkan teks). */
      reasonBase?: string;
    }
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

export function recommend(movement: Movement, entries: LogEntry[], opts: { deload: boolean; ctx?: ProgressionCtx; locale?: Locale }): Recommendation | null {
  const locale = opts.locale ?? "id";
  if (movement.cap && opts.ctx) return recommendCapped(movement, entries, opts.deload, opts.ctx, locale);
  return recommendLegacy(movement, entries, opts, locale);
}

const kgs = (v: number) => `${Math.round(v * 100) / 100} kg`;

/** Perangkai teks per bahasa: "RPE 5" bila dua sesi sama, "RPE 5 dan 6" bila beda (lama → baru). */
function texts(locale: Locale) {
  const P = PROGRESSION[locale];
  return {
    P,
    rpePair: (a: LogEntry, b: LogEntry) => (a.rpe === b.rpe ? `RPE ${b.rpe}` : `RPE ${a.rpe} ${P.and} ${b.rpe}`),
    repsPair: (a: LogEntry, b: LogEntry) => (a.value === b.value ? `${b.value} ${P.rep}` : `${a.value} ${P.and} ${b.value} ${P.rep}`),
    capLabel: (m: Movement, kg: number) =>
      m.cap?.source === "equipment" ? P.capEquipment(kgs(kg)) : m.cap?.source === "safety" ? P.capSafety(kgs(kg)) : P.capOther(kgs(kg)),
  };
}

/**
 * Aturan baru (aturan batas beban aktif): syarat naik relatif (RPE ≤ target − 1), double progression saat mentok,
 * dan alasan berangka. Gerakan tahan & band memakai syarat relatif yang sama.
 */
function recommendCapped(m: Movement, entries: LogEntry[], deload: boolean, ctx: ProgressionCtx, locale: Locale): Recommendation | null {
  const { P, rpePair, repsPair, capLabel } = texts(locale);
  const h = historyFor(entries, m.name).filter((e) => !e.deload);
  if (!h.length) return null;
  if (deload) return { kind: "info", reason: P.deload };
  const [last, prev] = h;
  const ok = (e: LogEntry) => e.value >= e.target.hi && e.rpe <= e.targetRpe - 1;
  const twice = !!prev && ok(last) && ok(prev);
  const t = last.targetRpe;
  const spec = parseWeight(m.weight);

  if (last.valueUnit === "sec") {
    if (twice && last.value < MAX_HOLD_SEC) {
      const seconds = Math.min(MAX_HOLD_SEC, last.value + 5);
      return { kind: "hold", seconds, reason: P.holdUp(rpePair(prev, last), last.value, t, seconds) };
    }
    return { kind: "hold", seconds: last.value, reason: P.holdKeep(last.value, t - 1) };
  }

  if (spec.kind === "band") {
    const idx = spec.options.indexOf(last.band ?? spec.options[0]);
    if (twice && idx >= 0 && idx < spec.options.length - 1) {
      return { kind: "band", band: spec.options[idx + 1], reason: P.bandUp(rpePair(prev, last), last.value, spec.options[idx], spec.options[idx + 1]) };
    }
  }

  if (spec.kind !== "load" || last.load === undefined) {
    return {
      kind: "info",
      reason: twice ? P.infoTwice(rpePair(prev, last), repsPair(prev, last)) : P.infoTarget(last.target.hi, t - 1),
    };
  }

  const hi = m.cap!.kg;
  const from = Math.min(hi, Math.max(spec.min, last.load));
  const loads = m.loads?.length ? m.loads : undefined;
  const step = loadStep(spec);
  const up = loads ? loads.find((v) => v > from + 1e-9) : from + step <= hi + 1e-9 ? round(from + step, 0.25) : undefined;
  const down = loads ? ([...loads].reverse().find((v) => v < from - 1e-9) ?? from) : Math.max(spec.min, round(from - step, 0.25));

  if (last.rpe > t + 1) {
    return { kind: "load", action: down < from ? "decrease" : "hold", load: down, from, reason: P.down(last.rpe, t, kgs(down)) };
  }
  if (last.rpe > t) {
    return { kind: "load", action: "hold", load: from, from, reason: P.slightlyOver(last.rpe, t, kgs(from)) };
  }

  // Belum mentok: progresi beban biasa (syarat relatif).
  if (up !== undefined && up <= hi + 1e-9) {
    if (twice) {
      return { kind: "load", action: "increase", load: up, from, reason: P.up(rpePair(prev, last), repsPair(prev, last), t, kgs(up)) };
    }
    const reason =
      last.value < last.target.hi
        ? P.moreReps(last.value, last.target.hi, kgs(from))
        : last.rpe > t - 1
          ? P.rpeHigh(last.value, kgs(from), last.rpe, t - 1)
          : P.oneOfTwo(kgs(from), last.rpe, last.value);
    return { kind: "load", action: "hold", load: from, from, reason };
  }

  // Mentok: rentang rep tetap → tempo/jeda → varian satu sisi.
  const reps = cappedRepsLabel(ctx.difficulty);
  const range = CAPPED_REPS[ctx.difficulty];
  const capText = capLabel(m, hi);
  const tempo = !!last.tempo;
  if (!twice) {
    return {
      kind: "load",
      action: "hold",
      load: from,
      from,
      reps,
      ...(tempo ? { tempo: true } : {}),
      reason: P.cappedReps(capText, range.hi, last.value, t - 1, tempo ? P.tempo : null),
    };
  }
  const base = P.cappedBase(rpePair(prev, last), repsPair(prev, last), t, capText);
  if (!tempo) {
    return { kind: "load", action: "hold", load: from, from, reps, tempo: true, reason: `${base} ${P.addTempo(P.tempo)}` };
  }
  const variantName = META[m.name]?.harderVariant;
  const variant = variantName ? ctx.usable?.(variantName) : undefined;
  if (!variant) {
    return { kind: "load", action: "hold", load: from, from, reps, tempo: true, reason: `${base} ${P.noVariant}` };
  }
  const now = !!ctx.free || (!!ctx.blockStart && last.date < ctx.blockStart);
  if (!now) {
    return { kind: "load", action: "hold", load: from, from, reps, tempo: true, reason: `${base} ${P.variantNext(variant.name)}` };
  }
  return { kind: "load", action: "hold", load: from, from, reps, variant: variant.name, reason: `${base} ${P.variantNow(variant.name)}`, reasonBase: base };
}

function recommendLegacy(movement: Movement, entries: LogEntry[], opts: { deload: boolean }, locale: Locale): Recommendation | null {
  const { P } = texts(locale);
  const h = historyFor(entries, movement.name).filter((e) => !e.deload);
  if (!h.length) return null;
  if (opts.deload) return { kind: "info", reason: P.deload };

  const spec = parseWeight(movement.weight);
  const [last, prev] = h;
  const twice = !!prev && hitTarget(last) && hitTarget(prev);

  if (last.valueUnit === "sec") {
    if (twice && last.value < MAX_HOLD_SEC) {
      const seconds = Math.min(MAX_HOLD_SEC, last.value + 5);
      return { kind: "hold", seconds, reason: P.legacyHoldUp(last.value, seconds) };
    }
    return { kind: "hold", seconds: last.value, reason: P.legacyHoldKeep(last.value, last.targetRpe) };
  }

  if (spec.kind === "load" && last.load !== undefined) {
    const step = loadStep(spec);
    // Beban terakhir dipakai apa adanya (hanya di-clamp); hasil baru dibulatkan ke 0.25 kg,
    // atau — bila alat sudah diisi — ke beban terdekat yang bisa dirakit.
    const hi = movement.cap?.kg ?? spec.max;
    const clamp = (v: number) => Math.min(hi, Math.max(spec.min, round(v, 0.25)));
    const from = Math.min(hi, Math.max(spec.min, last.load));
    const loads = movement.loads?.length ? movement.loads : undefined;
    const stepDown = () => (loads ? ([...loads].reverse().find((v) => v < from) ?? from) : clamp(from - step));
    const stepUp = () => (loads ? (loads.find((v) => v > from) ?? from) : clamp(from + step));
    if (last.rpe > last.targetRpe + 1) {
      const load = stepDown();
      return { kind: "load", action: load < from ? "decrease" : "hold", load, from, reason: P.legacyDown(last.rpe, last.targetRpe) };
    }
    if (last.rpe > last.targetRpe) {
      return { kind: "load", action: "hold", load: from, from, reason: P.legacyOver(last.rpe) };
    }
    if (twice) {
      if (from >= hi) {
        return { kind: "load", action: "hold", load: from, from, reason: capReason(movement, hi, locale) };
      }
      const load = stepUp();
      if (load <= from) {
        return { kind: "load", action: "hold", load: from, from, reason: P.heaviest };
      }
      return { kind: "load", action: "increase", load, from, reason: P.legacyUp(last.targetRpe, load - from) };
    }
    return {
      kind: "load",
      action: "hold",
      load: from,
      from,
      reason: hitTarget(last)
        ? P.legacyHalf(from)
        : P.legacyKeep(from, last.target.hi),
    };
  }

  if (spec.kind === "band") {
    const idx = spec.options.indexOf(last.band ?? spec.options[0]);
    if (twice && idx >= 0 && idx < spec.options.length - 1) {
      return { kind: "band", band: spec.options[idx + 1], reason: P.legacyBand(spec.options[idx], spec.options[idx + 1]) };
    }
  }

  return {
    kind: "info",
    reason: twice
      ? P.legacyTwice
      : P.legacyTarget(last.target.hi, last.targetRpe),
  };
}

/** Alasan tahan di batas atas: library (aturan lama), alat, atau keamanan (0.14.0). */
function capReason(m: Movement, hi: number, locale: Locale): string {
  const P = PROGRESSION[locale];
  switch (m.cap?.source) {
    case "equipment":
      return P.capEquipmentReason(hi);
    case "safety":
      return P.capSafetyReason(hi);
    default:
      return P.capLibraryReason(hi);
  }
}

const ARROW: Record<"increase" | "hold" | "decrease", string> = { increase: "↑", hold: "→", decrease: "↓" };

/**
 * Terapkan rekomendasi ke gerakan utama (★) sebuah workout.
 * Beban tetap di-clamp ke rentang library, atau ke batas efektif saat aturan batas beban 0.14.0 aktif, jadi
 * aturan WAJIB tidak bisa dilanggar. Saat aturan itu aktif dan gerakan belum punya log, PR terbaru menjadi titik
 * awal (bukan minggu deload).
 */
export function applyProgression(
  w: StrengthWorkout,
  movements: Map<string, Movement>,
  entries: LogEntry[],
  prs: PrEntry[] = [],
  opts: { blockStart?: string; free?: boolean; holdLoad?: string; locale?: Locale } = {},
): StrengthWorkout {
  if (!entries.length && !prs.length) return w;
  const locale = opts.locale ?? "id";
  const P = PROGRESSION[locale];
  const usable = (name: string) => {
    const v = movements.get(name);
    return v && v.available !== false ? v : undefined;
  };
  const ctx: ProgressionCtx = { difficulty: w.difficulty, blockStart: opts.blockStart, free: opts.free, usable };
  const items = w.items.map((it): StrengthItem => {
    const m = movements.get(it.movement);
    if (!it.anchor || !m) return it;
    const raw = recommend(m, entries, { deload: w.deload, ctx, locale }) ?? (w.deload ? null : prStart(m, prs, locale));
    const rec = raw && opts.holdLoad ? holdForPhase(raw, opts.holdLoad, locale) : raw;
    if (!rec) return it;
    switch (rec.kind) {
      case "load": {
        if (it.load.kind !== "load") return it;
        if (rec.variant && w.items.some((x) => x.movement === rec.variant)) {
          // Varian sudah ada di sesi ini: jangan dobel, tetap tempo/jeda.
          return { ...it, ...(rec.reps ? { reps: `${rec.reps}${it.reps?.match(/\/\S+/)?.[0] ?? ""}` } : {}), tempo: true, progression: `→ ${P.variantInSession(rec.reasonBase ?? rec.reason, rec.variant)}` };
        }
        if (rec.variant) {
          // Varian lebih sulit: gerakan baru mulai dari titik awal rentang library-nya.
          const v = usable(rec.variant)!;
          const vs = parseWeight(v.weight);
          const vMeta = META[v.name];
          const start = vs.kind === "load" ? (v.loads?.length ? v.loads[0] : vs.min) : undefined;
          return {
            ...it,
            movement: v.name,
            variantOf: m.name,
            reps: typeof vMeta?.reps === "string" ? repsText(vMeta.reps, locale) : (repsText(vMeta?.reps?.[w.difficulty], locale) ?? rec.reps ?? it.reps),
            load: start !== undefined && vs.kind === "load" ? { kind: "load", min: start, max: start, unit: "kg", perHand: vs.perHand } : it.load,
            cue: metaCue(v.name, locale) ?? it.cue,
            progression: `↑ ${rec.reason}`,
          };
        }
        const spec = parseWeight(m.weight);
        if (spec.kind !== "load") return it;
        const clamped = Math.min(m.cap?.kg ?? spec.max, Math.max(spec.min, rec.load));
        // Alat sudah diisi → beban yang diresepkan harus bisa dirakit.
        const v = m.loads?.length ? m.loads.reduce((b, x) => (Math.abs(x - clamped) < Math.abs(b - clamped) ? x : b), m.loads[0]) : clamped;
        return {
          ...it,
          load: { ...it.load, min: v, max: v },
          // Rentang tetap mempertahankan satuan per sisi (mis. "/kaki") dari resep asal.
          ...(rec.reps ? { reps: `${rec.reps}${it.reps?.match(/\/\S+/)?.[0] ?? ""}` } : {}),
          ...(rec.tempo ? { tempo: true } : {}),
          progression: `${ARROW[rec.action]} ${rec.reason}`,
        };
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

/**
 * Fase program yang menahan beban (0.14.1: Peak, Taper, minggu lomba): naik beban, naik band, atau pindah ke varian
 * ditahan dulu; rep, tempo, dan turun beban tetap berlaku.
 */
function holdForPhase(rec: Recommendation, phase: string, locale: Locale): Recommendation {
  const P = PROGRESSION[locale];
  const why = P.phaseWhy(phase);
  if (rec.kind === "load" && rec.action === "increase") return { kind: "load", action: "hold", load: rec.from, from: rec.from, reason: P.phaseHoldLoad(kgs(rec.from), why) };
  if (rec.kind === "load" && rec.variant) {
    const { variant: _v, reasonBase: _b, ...rest } = rec;
    return { ...rest, tempo: true, reason: P.phaseVariant(rec.reasonBase ?? rec.reason, rec.variant) };
  }
  if (rec.kind === "band") return { kind: "info", reason: P.phaseBand(rec.band, why) };
  return rec;
}

/** Titik awal dari PR terbaru untuk gerakan tanpa log (hanya saat aturan batas beban aktif, `cap` ada). */
function prStart(m: Movement, prs: PrEntry[], locale: Locale): Recommendation | null {
  const spec = parseWeight(m.weight);
  const pr = latestPr(prs, m.name);
  if (!m.cap || spec.kind !== "load" || !pr) return null;
  const target = Math.min(m.cap.kg, Math.max(spec.min, pr.loadKg));
  // Beban yang bisa dirakit ≤ PR (tidak melompat di atas PR); tanpa alat terisi pakai PR apa adanya.
  const load = m.loads?.length ? ([...m.loads].reverse().find((v) => v <= target + 1e-9) ?? m.loads[0]) : target;
  return { kind: "load", action: "hold", load, from: load, reason: PROGRESSION[locale].fromPr(pr.loadKg, pr.date) };
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
    (e.band === undefined || typeof e.band === "string") &&
    (e.updatedAt === undefined || typeof e.updatedAt === "string") &&
    (e.deletedAt === undefined || typeof e.deletedAt === "string") &&
    (e.tempo === undefined || typeof e.tempo === "boolean") &&
    (e.variantOf === undefined || typeof e.variantOf === "string")
  );
}
