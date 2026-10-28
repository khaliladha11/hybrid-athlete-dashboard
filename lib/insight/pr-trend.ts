/**
 * #8 Tren PR per gerakan (docs/INSIGHT.md §4, 0.15.1). Murni.
 *
 * - Beban terbaik per tanggal dari PR (manual & log) dan log ★ berbeban gerakan itu; seri beban sama → rep terbanyak.
 *   Garis hanya memuat titik pertama & terakhir, PR beban baru, dan hari dengan penanda tahap.
 * - Saat beban mentok (0.14.0), tahap progresi lain tampil sebagai penanda di garis yang sama:
 *   `rep` rep naik di beban yang sama, `tempo` log dengan tempo/jeda, `variant` log varian lebih sulit (`variantOf`).
 *   Hari yang hanya punya log varian memakai beban titik sebelumnya sebagai posisi penanda.
 * - Batas alat (`capKg`) ditulis sebagai garis; "mentok sejak" = tanggal pertama beban mencapai batas itu.
 */
import type { LogEntry } from "@/lib/progression";
import { isLivePr, type PrEntry } from "@/lib/prs";
import { num1 } from "./format";

export type StageMarker = "rep" | "tempo" | "variant";

export interface PrPoint {
  date: string;
  load: number;
  reps?: number;
  markers: StageMarker[];
  /** Posisi dibawa dari titik sebelumnya (hari yang hanya punya log varian). */
  carried?: boolean;
}

export interface PrSeries {
  movement: string;
  points: PrPoint[];
  capKg?: number;
  cappedSince?: string;
}

const liveLog = (log: LogEntry[]) => log.filter((e) => !e.deletedAt);

/** Gerakan yang punya catatan beban (PR atau log ★ berbeban), terbaru dulu. */
export function movementsWithLoad(prs: PrEntry[], log: LogEntry[]): string[] {
  const last = new Map<string, string>();
  const note = (m: string, d: string) => last.set(m, (last.get(m) ?? "") > d ? last.get(m)! : d);
  for (const p of prs.filter(isLivePr)) note(p.movement, p.date);
  for (const e of liveLog(log)) if (e.load !== undefined && e.valueUnit === "reps") note(e.movement, e.date);
  return [...last].sort((a, b) => b[1].localeCompare(a[1]) || a[0].localeCompare(b[0])).map(([m]) => m);
}

export function prSeries(movement: string, prs: PrEntry[], log: LogEntry[], capKg?: number): PrSeries {
  const best = new Map<string, { load: number; reps?: number }>();
  const offer = (date: string, load: number, reps?: number) => {
    const cur = best.get(date);
    if (!cur || load > cur.load || (load === cur.load && (reps ?? 0) > (cur.reps ?? 0))) best.set(date, { load, ...(reps ? { reps } : {}) });
  };
  for (const p of prs.filter((p) => isLivePr(p) && p.movement === movement)) offer(p.date, p.loadKg, p.reps);
  const entries = liveLog(log);
  for (const e of entries) if (e.movement === movement && e.load !== undefined && e.valueUnit === "reps") offer(e.date, e.load, e.value);

  const tempoDates = new Set(entries.filter((e) => e.movement === movement && e.tempo).map((e) => e.date));
  const variantDates = new Set(entries.filter((e) => e.variantOf === movement).map((e) => e.date));
  const dates = [...new Set([...best.keys(), ...variantDates])].sort();

  const points: PrPoint[] = [];
  const bestRepsAt = new Map<number, number>();
  for (const date of dates) {
    const b = best.get(date);
    const prev = points.at(-1);
    if (!b && !prev) continue;
    const markers: StageMarker[] = [];
    if (b) {
      const had = bestRepsAt.get(b.load);
      if (prev && prev.load === b.load && had !== undefined && (b.reps ?? 0) > had) markers.push("rep");
      bestRepsAt.set(b.load, Math.max(had ?? 0, b.reps ?? 0));
    }
    if (tempoDates.has(date)) markers.push("tempo");
    if (variantDates.has(date)) markers.push("variant");
    points.push(b ? { date, load: b.load, ...(b.reps ? { reps: b.reps } : {}), markers } : { date, load: prev!.load, markers, carried: true });
  }
  const cappedSince = capKg !== undefined ? points.find((p) => !p.carried && p.load >= capKg)?.date : undefined;
  // Garis PR: titik pertama & terakhir, PR beban baru, atau hari dengan tahap progresi (catatan sama tidak digambar ulang).
  let top = -Infinity;
  const kept = points.filter((p, i) => {
    const keep = i === 0 || i === points.length - 1 || (!p.carried && p.load > top) || p.markers.length > 0;
    if (!p.carried) top = Math.max(top, p.load);
    return keep;
  });
  for (const p of kept) if (p.carried) p.load = Math.max(...kept.filter((q) => !q.carried && q.date < p.date).map((q) => q.load));
  return { movement, points: kept,...(capKg !== undefined ? { capKg } : {}), ...(cappedSince ? { cappedSince } : {}) };
}

const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const day = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`)).replace(".", "");
const kg = (v: number) => `${num1(v).replace(",0", "")} kg`;

export const MARKER_LABEL: Record<StageMarker, string> = { rep: "rep naik", tempo: "tempo/jeda", variant: "pindah varian" };

export function prSummary(s: PrSeries): { drawable: boolean; text: string } {
  const real = s.points.filter((p) => !p.carried);
  if (!real.length) return { drawable: false, text: `Belum ada catatan beban untuk ${s.movement}.` };
  const top = [...real].sort((a, b) => b.load - a.load || (b.reps ?? 0) - (a.reps ?? 0) || a.date.localeCompare(b.date))[0];
  const bestText = `Beban terbaik ${kg(top.load)}${top.reps ? ` × ${top.reps} rep` : ""} (${day(top.date)}).`;
  if (real.length < 2) return { drawable: false, text: `${bestText} Butuh 2 catatan beban untuk tren ini.` };
  const capped = s.cappedSince && s.capKg !== undefined ? ` Beban mentok di batas alat ${kg(s.capKg)} sejak ${day(s.cappedSince)}; progresi lanjut lewat rep, tempo/jeda, dan varian.` : "";
  return { drawable: true, text: `${bestText}${capped}` };
}
