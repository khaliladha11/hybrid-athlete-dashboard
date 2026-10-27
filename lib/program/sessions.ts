/**
 * Sesi rencana ber-id dari program (docs/PROGRAM-HIDUP.md §3). Murni.
 * Id = `{programId}:{minggu}:{hari}:{jenis}`, stabil selama jarak lomba & tanggal mulai tidak berubah.
 * Sesi ST diturunkan dari jadwal TRAINING-LOGIC §7: Senin Lower/Full & Rabu Upper. Sejak 0.14.1 isinya mengikuti
 * fase (`st-phase.ts`): minggu taper sebelum minggu lomba tetap 2× dengan volume setengah, ST kaki terakhir ≥ 8 hari
 * sebelum Hari H, minggu lomba hanya Upper ringan ≥ 3 hari sebelum Hari H. Override `move` mengubah tanggal; `skip` menandai.
 */
import { addDays } from "@/lib/date";
import type { Difficulty } from "@/lib/generator/types";
import type { Program, SessionKind } from "@/lib/program";
import type { ProgramOverride } from "./settings";
import { stPhaseKey, stSlots, type StPhaseKey } from "./st-phase";

export type PlanKind = SessionKind | "st-lower" | "st-upper";

export const RUN_KINDS: readonly PlanKind[] = ["quality", "easy", "recovery", "long", "race"];
export const isRunKind = (k: PlanKind) => RUN_KINDS.includes(k);

export interface PlannedSession {
  id: string;
  /** 1-based. */
  week: number;
  day: string;
  /** Tanggal menurut program. */
  plannedDate: string;
  /** Tanggal efektif (setelah override `move`). */
  date: string;
  kind: PlanKind;
  title: string;
  detail?: string;
  intensity: Difficulty;
  km?: number;
  minutes?: number;
  /** Aturan fase untuk sesi ST (0.14.1). */
  stPhase?: StPhaseKey;
  override?: ProgramOverride;
}

const DAY_OFFSET: Record<string, number> = { Senin: 0, Selasa: 1, Rabu: 2, Kamis: 3, Jumat: 4, Sabtu: 5, Minggu: 6 };

export const sessionId = (programId: string, week: number, day: string, kind: PlanKind) => `${programId}:${week}:${day.toLowerCase()}:${kind}`;

/**
 * `activeFrom` (0.13.3): sesi sebelum tanggal itu tidak dibuat (program baru yang dimulai di tengah minggu).
 * Sesi setelah Hari H di minggu lomba juga tidak dibuat.
 */
export function planSessions(program: Program, programId: string, overrides: ProgramOverride[] = [], activeFrom?: string): PlannedSession[] {
  const byId = new Map(overrides.map((o) => [o.sessionId, o]));
  const out: PlannedSession[] = [];
  const push = (s: Omit<PlannedSession, "id" | "date" | "override">) => {
    if ((activeFrom && s.plannedDate < activeFrom) || s.plannedDate > program.raceDate) return;
    const id = sessionId(programId, s.week, s.day, s.kind);
    const override = byId.get(id);
    out.push({ ...s, id, date: override?.action === "move" && override.toDate ? override.toDate : s.plannedDate, ...(override ? { override } : {}) });
  };
  for (const w of program.weeks) {
    const stPhase = stPhaseKey(w);
    const light = stPhase === "taper" || stPhase === "race";
    const slots = stSlots(stPhase, { monday: w.start, wednesday: addDays(w.start, 2), raceDate: program.raceDate });
    const stIntensity = stPhase === "build" ? "high" : "moderate";
    if (slots.lower) push({ week: w.index, day: "Senin", plannedDate: w.start, kind: "st-lower", title: light ? "ST Lower ringan" : "ST Lower / Full Body", intensity: stIntensity, stPhase });
    for (const s of w.sessions) {
      push({ week: w.index, day: s.day, plannedDate: addDays(w.start, DAY_OFFSET[s.day] ?? 0), kind: s.kind, title: s.title, detail: s.detail, intensity: s.intensity, km: s.km, minutes: s.minutes });
    }
    if (slots.upper) push({ week: w.index, day: "Rabu", plannedDate: addDays(w.start, 2), kind: "st-upper", title: light ? "ST Upper ringan" : "ST Upper", intensity: stIntensity, stPhase });
  }
  return out.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.id.localeCompare(b.id));
}
