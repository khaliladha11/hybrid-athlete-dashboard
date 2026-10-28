/**
 * #4 Volume ST per pola gerakan dan beban session-RPE mingguan (docs/INSIGHT.md §4, 0.15.1). Murni.
 *
 * Kerja ST dikumpulkan menjadi daftar set (`stWork`):
 * - Sesi mode latihan dengan rincian set (0.15.1): setiap set yang dicentang.
 * - Data lama (sesi tanpa rincian, log ★ dari generator): hanya set terakhir gerakan ★ yang diketahui → dihitung 1 set
 *   dan ditandai perkiraan. Gerakan utama sesi lama tanpa log ★ dihitung 1 set tanpa isi (jenis `unknown`).
 * - Aktivitas strength intervals.icu tidak punya isi gerakan: tidak masuk volume.
 *
 * Volume per jenis set:
 * - berbeban rep (`load`): kg × rep, kg seperti tercatat (dumbbell sepasang = per tangan, sama dengan log & PR);
 * - tahan (detik, termasuk Farmer's Hold berbeban): detik, tidak masuk kg;
 * - band & bodyweight rep (`unloaded`): rep, tanpa kg;
 * - semua set masuk jumlah set per pola, satu-satunya ukuran yang bisa dibandingkan antar jenis.
 * Beban mingguan = jumlah session-RPE (AU) sesi mode latihan, tidak dijumlah dengan load lari (I4).
 */
import { MOVEMENT_CATEGORIES } from "@/lib/athlete-settings";
import type { MovementCategory, MovementLibrary } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { isLiveSession, sessionLoad, type StSession } from "@/lib/st-session";
import { int } from "./format";
import type { Summary } from "./run-trends";
import { bucketIndex, weekBuckets, type WeekBucket } from "./weeks";

export type SetKind = "load" | "hold" | "unloaded" | "unknown";

export interface WorkSet {
  date: string;
  movement: string;
  kind: SetKind;
  /** kg (berbeban rep). */
  load?: number;
  /** Rep atau detik. */
  value: number;
  /** Data lama: hanya set terakhir gerakan ★ yang diketahui. */
  estimated: boolean;
  /** Kunci sesi (`ses:<id>` atau `log:<tanggal>`), untuk frekuensi otot. */
  sessionKey: string;
}

export const PATTERN_LABEL: Record<MovementCategory, string> = {
  upperPush: "Upper Push",
  upperPull: "Upper Pull",
  lower: "Lower",
  stabilityAndCore: "Core/Stabilitas",
  prehab: "Prehab",
};

/** Nama gerakan → pola (kategori library). */
export function patternMap(lib: Pick<MovementLibrary, MovementCategory>): Map<string, MovementCategory> {
  const out = new Map<string, MovementCategory>();
  for (const c of MOVEMENT_CATEGORIES) for (const m of lib[c] ?? []) out.set(m.name, c);
  return out;
}

const kindOf = (unit: "reps" | "sec", load: number | undefined): SetKind => (unit === "sec" ? "hold" : load !== undefined ? "load" : "unloaded");

const fromLog = (e: LogEntry, sessionKey: string): WorkSet => ({
  date: e.date,
  movement: e.movement,
  kind: kindOf(e.valueUnit, e.load),
  ...(e.load !== undefined && e.valueUnit === "reps" ? { load: e.load } : {}),
  value: e.value,
  estimated: true,
  sessionKey,
});

/** Semua kerja ST yang diketahui (lihat kepala file). Log dan sesi sudah hidup (tanpa tombstone) atau disaring di sini. */
export function stWork(sessions: StSession[], log: LogEntry[]): WorkSet[] {
  const live = sessions.filter(isLiveSession);
  const liveLog = log.filter((e) => !e.deletedAt);
  const out: WorkSet[] = [];
  const sessionDates = new Set(live.map((s) => s.date));
  for (const s of live) {
    const key = `ses:${s.id}`;
    if (s.sets?.length) {
      for (const x of s.sets) {
        out.push({ date: s.date, movement: x.movement, kind: kindOf(x.unit, x.load), ...(x.load !== undefined && x.unit === "reps" ? { load: x.load } : {}), value: x.value, estimated: false, sessionKey: key });
      }
      continue;
    }
    const logged = liveLog.filter((e) => e.date === s.date);
    for (const e of logged) out.push(fromLog(e, key));
    const seen = new Set(logged.map((e) => e.movement));
    for (const m of s.movements) if (!seen.has(m)) out.push({ date: s.date, movement: m, kind: "unknown", value: 0, estimated: true, sessionKey: key });
  }
  for (const e of liveLog) if (!sessionDates.has(e.date)) out.push(fromLog(e, `log:${e.date}`));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface PatternVolume {
  sets: number;
  /** kg × rep dari set berbeban. */
  kg: number;
  /** Detik dari set tahan. */
  sec: number;
  /** Rep tanpa kg (band & bodyweight). */
  reps: number;
}

export interface StrengthWeek extends WeekBucket {
  patterns: Record<MovementCategory, PatternVolume>;
  /** Ada set perkiraan (data lama) di minggu ini. */
  estimated: boolean;
  /** Session-RPE (AU) sesi mode latihan; kosong bila tidak ada sesi. */
  au?: number;
  stSessions: number;
}

const empty = (): PatternVolume => ({ sets: 0, kg: 0, sec: 0, reps: 0 });

export function strengthWeeks(work: WorkSet[], sessions: StSession[], patterns: Map<string, MovementCategory>, today: string, weeks: number): StrengthWeek[] {
  const buckets = weekBuckets(today, weeks);
  const rows: StrengthWeek[] = buckets.map((b) => ({
    ...b,
    patterns: Object.fromEntries(MOVEMENT_CATEGORIES.map((c) => [c, empty()])) as Record<MovementCategory, PatternVolume>,
    estimated: false,
    stSessions: 0,
  }));
  for (const w of work) {
    if (w.date > today) continue;
    const i = bucketIndex(w.date, buckets);
    const cat = patterns.get(w.movement);
    if (i < 0 || !cat) continue;
    const v = rows[i].patterns[cat];
    v.sets += 1;
    if (w.kind === "load") v.kg += (w.load ?? 0) * w.value;
    else if (w.kind === "hold") v.sec += w.value;
    else if (w.kind === "unloaded") v.reps += w.value;
    if (w.estimated) rows[i].estimated = true;
  }
  for (const s of sessions.filter(isLiveSession)) {
    if (s.date > today) continue;
    const i = bucketIndex(s.date, buckets);
    if (i < 0) continue;
    rows[i].au = (rows[i].au ?? 0) + sessionLoad(s);
    rows[i].stSessions += 1;
  }
  for (const r of rows) for (const c of MOVEMENT_CATEGORIES) r.patterns[c].kg = Math.round(r.patterns[c].kg);
  return rows;
}

const NEED_TWO = "Belum ada data cukup untuk tren ini (butuh 2 minggu).";

/** Kalimat di atas grafik volume satu pola. Minggu berjalan tidak masuk rata-rata. */
export function patternSummary(rows: StrengthWeek[], cat: MovementCategory): Summary {
  const withSets = rows.filter((r) => r.patterns[cat].sets > 0);
  if (!rows.some((r) => MOVEMENT_CATEGORIES.some((c) => r.patterns[c].sets > 0))) {
    return { drawable: false, text: "Belum ada sesi ST tercatat di perangkat ini dalam rentang ini." };
  }
  if (!withSets.length) return { drawable: false, text: `Belum ada set ${PATTERN_LABEL[cat]} dalam rentang ini.` };
  if (withSets.length < 2) return { drawable: false, text: NEED_TWO };
  const done = rows.filter((r) => !r.current);
  const n = Math.max(1, done.length);
  const avg = (k: keyof PatternVolume) => done.reduce((t, r) => t + r.patterns[cat][k], 0) / n;
  const parts = [`${PATTERN_LABEL[cat]}: rata-rata ${int(avg("sets"))} set per minggu`];
  if (avg("kg") > 0) parts.push(`${int(avg("kg"))} kg × rep`);
  if (avg("sec") > 0) parts.push(`${int(avg("sec"))} detik tahan`);
  if (avg("reps") > 0) parts.push(`${int(avg("reps"))} rep tanpa beban`);
  const est = rows.some((r) => r.estimated) ? " Minggu bertanda * adalah perkiraan (hanya gerakan ★)." : "";
  return { drawable: true, text: `${parts.join(", ")}.${est}` };
}

/** Kalimat di atas grafik beban session-RPE mingguan. */
export function auSummary(rows: StrengthWeek[]): Summary {
  const pts = rows.filter((r) => r.au !== undefined);
  if (!pts.length) return { drawable: false, text: "Belum ada sesi mode latihan dengan RPE sesi dalam rentang ini." };
  if (pts.length < 2) return { drawable: false, text: NEED_TWO };
  const done = rows.filter((r) => !r.current);
  const avg = done.reduce((t, r) => t + (r.au ?? 0), 0) / Math.max(1, done.length);
  return { drawable: true, text: `Beban ST rata-rata ${int(avg)} AU per minggu (RPE sesi × menit), terpisah dari load lari.` };
}
