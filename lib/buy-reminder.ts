/**
 * Pengingat beli beban per area tubuh (0.14.0, STRENGTH-HIDUP §3e, D2). Murni, hanya dari data.
 *
 * - Area: lower, upper push, upper pull (kategori movement library).
 * - Syarat: ≥ 80% gerakan berbeban yang aktif di area itu mentok di **batas alat** (bukan batas keamanan), masing-masing
 *   2 sesi terakhir di beban itu dengan rep di ujung atas dan RPE ≤ target − 1.
 * - Isi: plat (sepasang) yang membuka progresi untuk gerakan terbanyak di area itu; seri → plat paling ringan.
 *   Tanpa tautan toko. Hanya berlaku saat aturan batas beban aktif (gerakan punya `cap`).
 * - Bisa ditutup; muncul lagi hanya bila syaratnya baru terpenuhi (tanda tangan daftar gerakan + batas berubah).
 */
import type { ConditionId } from "./conditions";
import { buildableLoads, type Equipment } from "./equipment";
import { safetyCap } from "./load-bounds";
import type { Movement, MovementLibrary } from "./profile";
import { historyFor, type LogEntry } from "./progression";
import { parseWeight } from "./weights";

export const BUY_AREAS = ["lower", "upperPush", "upperPull"] as const;
export type BuyArea = (typeof BUY_AREAS)[number];
export const AREA_LABEL: Record<BuyArea, string> = { lower: "lower", upperPush: "upper push", upperPull: "upper pull" };
export const BUY_THRESHOLD = 0.8;
/** Berat plat umum yang dicoba (kg). */
export const CANDIDATE_PLATES = [0.5, 1, 1.25, 2, 2.5, 5];

export interface BuyReminder {
  area: BuyArea;
  plateKg: number;
  /** Jumlah gerakan mentok yang progresinya terbuka. */
  unlocks: number;
  /** Gerakan mentok di area ini. */
  stuck: string[];
  signature: string;
  text: string;
}

const kgText = (v: number) => String(v).replace(".", ",");

/** Mentok di batas alat: 2 sesi terakhir (bukan deload) di beban itu, rep di ujung atas, RPE ≤ target − 1. */
export function stuckAtEquipment(m: Movement, log: LogEntry[]): boolean {
  if (m.cap?.source !== "equipment") return false;
  const h = historyFor(log, m.name).filter((e) => !e.deload && !e.deletedAt);
  const [a, b] = h;
  const ok = (e: LogEntry | undefined) => !!e && e.load !== undefined && e.load >= m.cap!.kg - 1e-9 && e.value >= e.target.hi && e.rpe <= e.targetRpe - 1;
  return ok(a) && ok(b);
}

const withPlatePair = (eq: Equipment, kg: number): Equipment => {
  const has = eq.plates.some((p) => Math.abs(p.kg - kg) < 1e-9);
  return { ...eq, plates: has ? eq.plates.map((p) => (Math.abs(p.kg - kg) < 1e-9 ? { ...p, count: p.count + 2 } : p)) : [...eq.plates, { kg, count: 2 }] };
};

export function buyReminders({ lib, eq, active, log }: { lib: MovementLibrary; eq: Equipment; active: readonly ConditionId[]; log: LogEntry[] }): BuyReminder[] {
  const out: BuyReminder[] = [];
  for (const area of BUY_AREAS) {
    const loaded = (lib[area] ?? []).filter((m) => m.available !== false && !!m.cap && parseWeight(m.weight).kind === "load");
    if (!loaded.length) continue;
    const stuck = loaded.filter((m) => stuckAtEquipment(m, log));
    if (!stuck.length || stuck.length / loaded.length < BUY_THRESHOLD) continue;
    let best: { kg: number; n: number } | undefined;
    for (const kg of CANDIDATE_PLATES) {
      const next = withPlatePair(eq, kg);
      const n = stuck.filter((m) => {
        const limit = safetyCap(m.name, active)?.kg ?? Infinity;
        return buildableLoads(m.name, m.weight, next)?.some((v) => v > m.cap!.kg + 1e-9 && v <= limit + 1e-9);
      }).length;
      if (n > 0 && (!best || n > best.n)) best = { kg, n };
    }
    if (!best) continue;
    const names = stuck.map((m) => m.name).sort();
    out.push({
      area,
      plateKg: best.kg,
      unlocks: best.n,
      stuck: names,
      signature: names.map((n) => `${n}@${stuck.find((m) => m.name === n)!.cap!.kg}`).join("|"),
      text: `Sepasang plat ${kgText(best.kg)} kg membuka progresi untuk ${best.n} gerakan ${AREA_LABEL[area]}.`,
    });
  }
  return out;
}

/** Pengingat yang belum ditutup (atau syaratnya baru terpenuhi lagi sejak ditutup). */
export const visibleReminders = (all: BuyReminder[], dismissed: Partial<Record<BuyArea, string>> = {}) => all.filter((r) => dismissed[r.area] !== r.signature);
