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
import { META } from "@/lib/generator/meta";
import type { Difficulty, StrengthItem, StrengthWorkout } from "@/lib/generator/types";
import { latestPr, type PrEntry } from "@/lib/prs";

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
export const TEMPO_TEXT = "turun 3 detik, jeda 2 detik di bawah";

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

export function recommend(movement: Movement, entries: LogEntry[], opts: { deload: boolean; ctx?: ProgressionCtx }): Recommendation | null {
  if (movement.cap && opts.ctx) return recommendCapped(movement, entries, opts.deload, opts.ctx);
  return recommendLegacy(movement, entries, opts);
}

const kgs = (v: number) => `${Math.round(v * 100) / 100} kg`;
/** "RPE 5" bila dua sesi sama, "RPE 5 dan 6" bila beda (lama → baru). */
const rpePair = (a: LogEntry, b: LogEntry) => (a.rpe === b.rpe ? `RPE ${b.rpe}` : `RPE ${a.rpe} dan ${b.rpe}`);
const repsPair = (a: LogEntry, b: LogEntry) => (a.value === b.value ? `${b.value} rep` : `${a.value} dan ${b.value} rep`);
const capLabel = (m: Movement, kg: number) =>
  m.cap?.source === "equipment" ? `batas alat ${kgs(kg)}` : m.cap?.source === "safety" ? `batas keamanan ${kgs(kg)}` : `batas ${kgs(kg)}`;

/**
 * Aturan baru (aturan batas beban aktif): syarat naik relatif (RPE ≤ target − 1), double progression saat mentok,
 * dan alasan berangka. Gerakan tahan & band memakai syarat relatif yang sama.
 */
function recommendCapped(m: Movement, entries: LogEntry[], deload: boolean, ctx: ProgressionCtx): Recommendation | null {
  const h = historyFor(entries, m.name).filter((e) => !e.deload);
  if (!h.length) return null;
  if (deload) return { kind: "info", reason: "Minggu deload: progresi ditunda, pakai beban deload." };
  const [last, prev] = h;
  const ok = (e: LogEntry) => e.value >= e.target.hi && e.rpe <= e.targetRpe - 1;
  const twice = !!prev && ok(last) && ok(prev);
  const t = last.targetRpe;
  const spec = parseWeight(m.weight);

  if (last.valueUnit === "sec") {
    if (twice && last.value < MAX_HOLD_SEC) {
      const seconds = Math.min(MAX_HOLD_SEC, last.value + 5);
      return { kind: "hold", seconds, reason: `2 sesi terakhir ${rpePair(prev, last)} di ${last.value} detik (target RPE ${t}), naik ke ${seconds} detik.` };
    }
    return { kind: "hold", seconds: last.value, reason: `Tahan ${last.value} detik sampai 2 sesi tuntas dengan RPE ≤ ${t - 1}.` };
  }

  if (spec.kind === "band") {
    const idx = spec.options.indexOf(last.band ?? spec.options[0]);
    if (twice && idx >= 0 && idx < spec.options.length - 1) {
      return { kind: "band", band: spec.options[idx + 1], reason: `2 sesi terakhir ${rpePair(prev, last)} di ${last.value} rep dengan ${spec.options[idx]}, naik ke ${spec.options[idx + 1]} Band.` };
    }
  }

  if (spec.kind !== "load" || last.load === undefined) {
    return {
      kind: "info",
      reason: twice ? `2 sesi terakhir ${rpePair(prev, last)} di ${repsPair(prev, last)}: tambah 1–2 rep atau perlambat fase turun 3 detik.` : `Target ${last.target.hi} rep dengan RPE ≤ ${t - 1}.`,
    };
  }

  const hi = m.cap!.kg;
  const from = Math.min(hi, Math.max(spec.min, last.load));
  const loads = m.loads?.length ? m.loads : undefined;
  const step = loadStep(spec);
  const up = loads ? loads.find((v) => v > from + 1e-9) : from + step <= hi + 1e-9 ? round(from + step, 0.25) : undefined;
  const down = loads ? ([...loads].reverse().find((v) => v < from - 1e-9) ?? from) : Math.max(spec.min, round(from - step, 0.25));

  if (last.rpe > t + 1) {
    return { kind: "load", action: down < from ? "decrease" : "hold", load: down, from, reason: `RPE terakhir ${last.rpe} (target ${t}): turunkan dulu ke ${kgs(down)}.` };
  }
  if (last.rpe > t) {
    return { kind: "load", action: "hold", load: from, from, reason: `RPE terakhir ${last.rpe} sedikit di atas target ${t}: tahan ${kgs(from)}.` };
  }

  // Belum mentok: progresi beban biasa (syarat relatif).
  if (up !== undefined && up <= hi + 1e-9) {
    if (twice) {
      return { kind: "load", action: "increase", load: up, from, reason: `2 sesi terakhir ${rpePair(prev, last)} di ${repsPair(prev, last)} (target RPE ${t}): naik ke ${kgs(up)}.` };
    }
    const reason =
      last.value < last.target.hi
        ? `Tambah rep dulu: ${last.value} dari ${last.target.hi} rep di ${kgs(from)}.`
        : last.rpe > t - 1
          ? `${last.value} rep di ${kgs(from)} dengan RPE ${last.rpe}. Naik beban setelah 2 sesi dengan RPE ≤ ${t - 1}.`
          : `1 dari 2 sesi tuntas di ${kgs(from)} (RPE ${last.rpe}, ${last.value} rep). Tuntaskan sekali lagi untuk naik.`;
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
      reason: `Beban sudah di ${capText}. Naikkan rep sampai ${range.hi} (terakhir ${last.value}) dengan RPE ≤ ${t - 1}${tempo ? `, tetap dengan tempo ${TEMPO_TEXT}` : ""}.`,
    };
  }
  const base = `2 sesi terakhir ${rpePair(prev, last)} di ${repsPair(prev, last)} (target RPE ${t}), beban sudah di ${capText}.`;
  if (!tempo) {
    return { kind: "load", action: "hold", load: from, from, reps, tempo: true, reason: `${base} Tambah tempo: ${TEMPO_TEXT}.` };
  }
  const variantName = META[m.name]?.harderVariant;
  const variant = variantName ? ctx.usable?.(variantName) : undefined;
  if (!variant) {
    return { kind: "load", action: "hold", load: from, from, reps, tempo: true, reason: `${base} Belum ada varian lebih sulit di library, tetap tempo dan jeda.` };
  }
  const now = !!ctx.free || (!!ctx.blockStart && last.date < ctx.blockStart);
  if (!now) {
    return { kind: "load", action: "hold", load: from, from, reps, tempo: true, reason: `${base} Siap pindah ke ${variant.name} mulai blok berikutnya. Sampai itu tetap tempo dan jeda.` };
  }
  return { kind: "load", action: "hold", load: from, from, reps, variant: variant.name, reason: `${base} Pindah ke varian lebih sulit: ${variant.name}.` };
}

function recommendLegacy(movement: Movement, entries: LogEntry[], opts: { deload: boolean }): Recommendation | null {
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
      return { kind: "load", action: load < from ? "decrease" : "hold", load, from, reason: `RPE terakhir ${last.rpe} (target ${last.targetRpe}) — turunkan dulu.` };
    }
    if (last.rpe > last.targetRpe) {
      return { kind: "load", action: "hold", load: from, from, reason: `RPE terakhir ${last.rpe} sedikit di atas target — tahan beban.` };
    }
    if (twice) {
      if (from >= hi) {
        return { kind: "load", action: "hold", load: from, from, reason: capReason(movement, hi) };
      }
      const load = stepUp();
      if (load <= from) {
        return { kind: "load", action: "hold", load: from, from, reason: "Sudah beban terberat yang bisa dirakit dari alat — progresi lewat tempo lebih lambat atau tambah rep." };
      }
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

/** Alasan tahan di batas atas: library (aturan lama), alat, atau keamanan (0.14.0). */
function capReason(m: Movement, hi: number): string {
  switch (m.cap?.source) {
    case "equipment":
      return `Sudah di batas alat (${hi} kg). Progresi lewat rep atau tempo sampai alat bertambah.`;
    case "safety":
      return `Sudah di batas keamanan (${hi} kg) karena kondisi aktif. Progresi lewat rep atau tempo.`;
    default:
      return `Sudah di batas library (${hi} kg) — progresi lewat tempo lebih lambat, bukan beban.`;
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
  opts: { blockStart?: string; free?: boolean; holdLoad?: string } = {},
): StrengthWorkout {
  if (!entries.length && !prs.length) return w;
  const usable = (name: string) => {
    const v = movements.get(name);
    return v && v.available !== false ? v : undefined;
  };
  const ctx: ProgressionCtx = { difficulty: w.difficulty, blockStart: opts.blockStart, free: opts.free, usable };
  const items = w.items.map((it): StrengthItem => {
    const m = movements.get(it.movement);
    if (!it.anchor || !m) return it;
    const raw = recommend(m, entries, { deload: w.deload, ctx }) ?? (w.deload ? null : prStart(m, prs));
    const rec = raw && opts.holdLoad ? holdForPhase(raw, opts.holdLoad) : raw;
    if (!rec) return it;
    switch (rec.kind) {
      case "load": {
        if (it.load.kind !== "load") return it;
        if (rec.variant && w.items.some((x) => x.movement === rec.variant)) {
          // Varian sudah ada di sesi ini: jangan dobel, tetap tempo/jeda.
          return { ...it, ...(rec.reps ? { reps: `${rec.reps}${it.reps?.match(/\/\S+/)?.[0] ?? ""}` } : {}), tempo: true, progression: `→ ${rec.reason.replace(/ Pindah ke varian lebih sulit: .*$/, "")} ${rec.variant} sudah ada di sesi ini, tetap tempo dan jeda.` };
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
            reps: typeof vMeta?.reps === "string" ? vMeta.reps : (vMeta?.reps?.[w.difficulty] ?? rec.reps ?? it.reps),
            load: start !== undefined && vs.kind === "load" ? { kind: "load", min: start, max: start, unit: "kg", perHand: vs.perHand } : it.load,
            cue: vMeta?.cue ?? it.cue,
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
function holdForPhase(rec: Recommendation, phase: string): Recommendation {
  const why = `Fase ${phase}: beban ditahan, volume dikurangi. Naik lagi setelah fase ini.`;
  if (rec.kind === "load" && rec.action === "increase") return { kind: "load", action: "hold", load: rec.from, from: rec.from, reason: `Siap naik, tetapi tahan ${kgs(rec.from)}. ${why}` };
  if (rec.kind === "load" && rec.variant) {
    const { variant: _v, ...rest } = rec;
    return { ...rest, tempo: true, reason: `${rec.reason.replace(/ Pindah ke varian lebih sulit: .*$/, "")} Varian ${rec.variant} menunggu sampai fase ini selesai, tetap tempo dan jeda.` };
  }
  if (rec.kind === "band") return { kind: "info", reason: `Siap naik ke ${rec.band} Band, tetapi tahan band sekarang. ${why}` };
  return rec;
}

/** Titik awal dari PR terbaru untuk gerakan tanpa log (hanya saat aturan batas beban aktif, `cap` ada). */
function prStart(m: Movement, prs: PrEntry[]): Recommendation | null {
  const spec = parseWeight(m.weight);
  const pr = latestPr(prs, m.name);
  if (!m.cap || spec.kind !== "load" || !pr) return null;
  const target = Math.min(m.cap.kg, Math.max(spec.min, pr.loadKg));
  // Beban yang bisa dirakit ≤ PR (tidak melompat di atas PR); tanpa alat terisi pakai PR apa adanya.
  const load = m.loads?.length ? ([...m.loads].reverse().find((v) => v <= target + 1e-9) ?? m.loads[0]) : target;
  return { kind: "load", action: "hold", load, from: load, reason: `Mulai dari PR ${pr.loadKg} kg (${pr.date}).` };
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
