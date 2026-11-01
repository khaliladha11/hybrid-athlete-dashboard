/**
 * Workout lari → workout terstruktur intervals.icu (0.17, docs/RELEASE-1.0.md #6). Murni, tanpa I/O.
 *
 * Dikirim sebagai teks workout native di field `description` (dokumentasi API: endpoint event menerima "native
 * Intervals.icu format ('description' field)"). Aturan sintaks dari panduan Workout Builder dan "Specify workouts using
 * absolute pace" (forum intervals.icu, 2025):
 * - langkah `- <cue> <durasi> <target>`; teks sebelum durasi menjadi cue di jam;
 * - pace absolut `- 10m 8:50-8:00/km Pace` (lambat-cepat, unit eksplisit);
 * - ulangan `Judul 4x` di baris sendiri, satu baris kosong sebelum dan sesudah; tanpa ulangan bersarang.
 *
 * Aturan ekspor (docs/TRAINING-LOGIC.md "Kirim ke jam"):
 * - **Setiap langkah punya target pace.** Huawei membuang langkah tanpa target; jog dan jalan diberi pace sendiri.
 * - **Tanpa ramp** (tidak semua platform mendukung).
 * - **Ulangan satu langkah diurai** (Huawei mengabaikan jumlah ulangannya).
 * - Jog/jalan di bagian inti = langkah istirahat (`intensity=rest`, contoh resmi halaman Huawei).
 * - HR dan RPE tidak dijadikan target (satu satuan per workout; HR absolut tidak terdokumentasi), hanya catatan.
 */
import type { RunBlock, RunStep, RunWorkout } from "@/lib/generator/types";
import type { PlannedSession } from "@/lib/program/sessions";
import { formatPace, parseRange, type PaceRange } from "@/lib/run-zones";

export interface ExportedEvent {
  category: "WORKOUT" | "NOTE";
  name: string;
  description: string;
  movingTimeSec: number;
}

export type ExportResult = { ok: true; event: ExportedEvent } | { ok: false; reason: string };

/** Id luar event: satu entri per sesi program, per tanggal untuk generator bebas, per tanggal untuk catatan ST. */
export const externalId = {
  session: (sessionId: string) => `ha:s:${sessionId}`,
  generator: (date: string) => `ha:g:${date}`,
  stNote: (date: string) => `ha:st:${date}`,
};
export const EXTERNAL_ID_RE = /^ha:(s|g|st):[\w.:-]{1,120}$/;

/** Pace jalan untuk target langkah jalan (jalan cepat sampai jalan santai). */
export const WALK_PACE: PaceRange = { fast: 600, slow: 780 };
/** Jog pemulihan: batas lambat Easy sampai 60 dtk/km lebih lambat. */
export const JOG_SLOWER_SEC = 60;
const FALLBACK_EASY: PaceRange = { fast: 480, slow: 530 };

const NAME_MAX = 80;
const CUE_MAX = 40;

/** "8:50-8:00/km Pace" (lambat-cepat) atau "5:50/km Pace". */
export function paceTarget(r: PaceRange): string {
  return r.fast === r.slow ? `${formatPace(r.fast)}/km Pace` : `${formatPace(r.slow)}-${formatPace(r.fast)}/km Pace`;
}

/** Menit → "10m", "30s", "1m30s". */
export function durationToken(min: number): string {
  const sec = Math.round(min * 60);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m && s ? `${m}m${s}s` : m ? `${m}m` : `${s}s`;
}

/** Km → "12km", "2.5km". */
export const distanceToken = (km: number) => `${Math.round(km * 100) / 100}km`;

/**
 * Cue aman untuk parser: tanpa angka (supaya tidak terbaca sebagai durasi/target), tanpa token zona/satuan, tanpa
 * tanda baca selain spasi, maksimal 40 karakter.
 */
export function cueText(label: string): string {
  const words = label
    .replace(/\([^)]*\)/g, " ")
    .replace(/[/+&·,.:;'"×–—-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/\d/.test(w) && !/^(SPM|HR|RPE|Pace|Z\d|x)$/i.test(w))
    .map((w) => w.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > CUE_MAX) break;
    out = next;
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const tidyName = (t: string) => t.replace(/[—–]/g, "-").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);

interface Paces {
  easy: PaceRange;
}

function stepPace(s: RunStep, paces: Paces): PaceRange {
  if (s.kind === "walk") return WALK_PACE;
  const own = s.pace ? parseRange(s.pace) : undefined;
  if (s.kind === "run" && own) return own;
  if (s.kind === "jog") return { fast: paces.easy.slow, slow: paces.easy.slow + JOG_SLOWER_SEC };
  return own ?? paces.easy;
}

function stepLine(s: RunStep, paces: Paces, rest: boolean): string {
  const cue = cueText(s.label);
  const parts = ["-", ...(cue ? [cue] : []), durationToken(s.durationMin), paceTarget(stepPace(s, paces))];
  if (rest) parts.push("intensity=rest");
  return parts.join(" ");
}

const isRecovery = (s: RunStep) => s.kind !== "run";

/** Satu blok menjadi baris teks; ulangan satu langkah diurai, ulangan ≥ 2 langkah memakai `Judul Nx`. */
function blockLines(b: RunBlock, paces: Paces): string[] {
  const rest = (s: RunStep) => b.phase === "main" && isRecovery(s);
  if (b.repeat > 1 && b.steps.length >= 2) {
    const head = cueText(b.title);
    return ["", `${head ? `${head} ` : ""}${b.repeat}x`, ...b.steps.map((s) => stepLine(s, paces, rest(s))), ""];
  }
  const steps = Array.from({ length: b.repeat }, () => b.steps).flat();
  return steps.map((s) => stepLine(s, paces, rest(s)));
}

/** Teks bagian (Warmup / inti / Cooldown) dengan baris kosong yang dirapikan. */
function assemble(sections: { header?: string; lines: string[] }[], intro: string[]): string {
  const out: string[] = [...intro];
  for (const sec of sections) {
    if (!sec.lines.length) continue;
    out.push("");
    if (sec.header) out.push(sec.header);
    out.push(...sec.lines);
  }
  // Baris kosong ganda (ulangan bersebelahan) dirapatkan jadi satu; tanpa baris kosong di awal/akhir.
  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

/** Catatan HR/RPE singkat di atas langkah (bukan target). Tidak pernah diakhiri pola "Nx" supaya tidak jadi ulangan. */
function hrNote(w: RunWorkout): string[] {
  const hrs = new Set<string>();
  for (const b of w.blocks) for (const s of b.steps) if (s.kind === "run" && s.hr) hrs.add(s.hr.replace(/[–—]/g, "-"));
  return hrs.size ? [`Acuan HR: ${[...hrs].join(", ")}.`] : [];
}

const totalSec = (w: RunWorkout) => Math.round(w.blocks.reduce((sum, b) => sum + b.repeat * b.steps.reduce((a, s) => a + s.durationMin, 0), 0) * 60);

/** Workout generator lari → event WORKOUT. `easyPace` = zona Easy profil, untuk target jog. */
export function exportRun(w: RunWorkout, ctx: { easyPace?: string }): ExportResult {
  const paces: Paces = { easy: parseRange(ctx.easyPace) ?? FALLBACK_EASY };
  const lines = (phase: RunBlock["phase"]) => w.blocks.filter((b) => b.phase === phase).flatMap((b) => blockLines(b, paces));
  const description = assemble(
    [
      { header: "Warmup", lines: lines("warmup") },
      { lines: lines("main") },
      { header: "Cooldown", lines: lines("cooldown") },
    ],
    hrNote(w),
  );
  return { ok: true, event: { category: "WORKOUT", name: tidyName(w.title), description, movingTimeSec: totalSec(w) } };
}

/**
 * Kartu sesi program (long run, race pace, sharpener) → event WORKOUT. Sesi yang masuk generator dikirim lewat
 * `exportRun`; lomba tidak dikirim (intervals.icu punya kategori lomba sendiri).
 */
export function exportProgramCard(s: PlannedSession, ctx: { easyPace?: string; racePace: string; km?: number }): ExportResult {
  const easy = parseRange(ctx.easyPace) ?? FALLBACK_EASY;
  const race = parseRange(ctx.racePace);
  const jog: PaceRange = { fast: easy.slow, slow: easy.slow + JOG_SLOWER_SEC };
  const mid = (r: PaceRange) => (r.fast + r.slow) / 2;
  const walk = (min: number, cue = "Jalan") => `- ${cue} ${durationToken(min)} ${paceTarget(WALK_PACE)}`;
  const name = tidyName(s.title);

  if (s.kind === "race") return { ok: false, reason: "Lomba tidak dikirim. Tambahkan lombanya langsung di kalender intervals.icu." };
  if (!race) return { ok: false, reason: "Pace lomba belum ada di program." };

  if (s.kind === "long") {
    const km = ctx.km ?? s.km ?? 0;
    if (km <= 0) return { ok: false, reason: "Jarak long run belum ada di program." };
    const progressive = s.intensity === "moderate" && km > 3;
    const main = progressive
      ? [`- Long run ${distanceToken(km - 3)} ${paceTarget(easy)}`, `- Race pace ${distanceToken(3)} ${paceTarget(race)}`]
      : [`- Long run ${distanceToken(km)} ${paceTarget(easy)}`];
    const runSec = progressive ? (km - 3) * mid(easy) + 3 * mid(race) : km * mid(easy);
    const description = assemble([{ header: "Warmup", lines: [walk(5)] }, { lines: main }, { header: "Cooldown", lines: [walk(5)] }], []);
    return { ok: true, event: { category: "WORKOUT", name: tidyName(`${name} · ${progressive ? "3 km terakhir race pace" : "easy"}`), description, movingTimeSec: Math.round(runSec + 600) } };
  }

  const rp = s.title.match(/^Race pace (\d+)\s*[×x]\s*([\d.,]+) km/i);
  if (s.kind === "quality" && rp) {
    const reps = Number(rp[1]);
    const km = Number(rp[2].replace(",", "."));
    const description = assemble(
      [
        { header: "Warmup", lines: [`- Easy ${durationToken(10)} ${paceTarget(easy)}`] },
        { lines: ["", `Race pace ${reps}x`, `- Race pace ${distanceToken(km)} ${paceTarget(race)}`, `- Jog ${durationToken(3)} ${paceTarget(jog)} intensity=rest`, ""] },
        { header: "Cooldown", lines: [`- Jog ${durationToken(10)} ${paceTarget(jog)}`] },
      ],
      [],
    );
    return { ok: true, event: { category: "WORKOUT", name, description, movingTimeSec: Math.round(20 * 60 + reps * (km * mid(race) + 180)) } };
  }

  if (s.kind === "quality" && /^Sharpener/i.test(s.title)) {
    const description = assemble(
      [
        { header: "Warmup", lines: [`- Easy ${durationToken(15)} ${paceTarget(easy)}`] },
        { lines: ["", "Race pace 4x", `- Race pace ${durationToken(1)} ${paceTarget(race)}`, `${walk(1)} intensity=rest`, ""] },
        { header: "Cooldown", lines: [walk(2)] },
      ],
      [],
    );
    return { ok: true, event: { category: "WORKOUT", name, description, movingTimeSec: 25 * 60 } };
  }

  return { ok: false, reason: "Sesi ini belum punya bentuk workout terstruktur. Pakai Copy Set." };
}

/** Catatan ST di kalender (opsional, bawaan mati): teks saja, bukan workout terstruktur. */
export function exportStNote(title: string, minutes: number): ExportResult {
  return {
    ok: true,
    event: { category: "NOTE", name: tidyName(`${title} ${minutes} menit`), description: "Sesi strength dicatat di aplikasi Hybrid Athlete.", movingTimeSec: minutes * 60 },
  };
}

/** Hash pendek (FNV-1a) isi event + tanggal: tahu workout berubah sejak dikirim. */
export function eventHash(e: ExportedEvent, date: string): string {
  let h = 0x811c9dc5;
  const text = `${date}\n${e.category}\n${e.name}\n${e.description}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
