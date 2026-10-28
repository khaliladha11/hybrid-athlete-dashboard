/**
 * Gabungan sinkron per bagian (murni, docs/SYNC.md §4). Pemenang tidak ditentukan oleh jam perangkat:
 * klien mencatat kunci yang ia ubah sejak `rev` terakhir dari server (`dirty`), lalu
 * - profile & program: utuh; lokal menang bila dirty, selain itu server;
 * - settings & preferences: per sub-bagian / kunci dengan aturan yang sama;
 * - onboarding: gabungan simetris (langkah selesai = gabungan, versi disclaimer = maksimum);
 * - log: per entri lewat `mergeLogs` (tombstone menang, komutatif & idempoten);
 * - prs (0.14.0): per entri lewat `mergePrs`, aturan yang sama dengan log;
 * - sessions (0.14.1): per entri lewat `mergeSessions`, aturan yang sama dengan log;
 * - program (0.13): pengaturan utuh dengan aturan dirty, override sesi digabung per `sessionId`, program arsip
 *   (0.13.3) digabung per `id` dua sisi; override milik arsip dipindahkan ke arsipnya.
 * Aktivasi pertama (perangkat belum pernah sinkron): server menang untuk bagian utuh & per kunci,
 * lokal hanya mengisi yang kosong; log & onboarding tetap digabung.
 */
import { mergeLogs } from "@/lib/log-entries";
import { mergePrs } from "@/lib/prs";
import { mergeSessions } from "@/lib/st-session";
import { STEPS, type OnboardingState } from "@/lib/onboarding";
import { isArchived, isOverride, mergeArchived, mergeOverrides, mergeWeekNotes, routeOverrides, type ArchivedProgram, type ProgramOverride } from "@/lib/program/settings";
import { PREFERENCE_KEYS, SETTINGS_KEYS, type PartData, type PartName } from "./parts";

export const WHOLE = "*";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Kunci yang berubah antara dua versi lokal (untuk menandai dirty). */
export function changedKeys<K extends PartName>(name: K, prev: PartData[K], next: PartData[K]): string[] {
  if (same(prev, next)) return [];
  if (prev === null || next === null) return [WHOLE];
  if (name === "settings" || name === "preferences") {
    const keys = name === "settings" ? SETTINGS_KEYS : PREFERENCE_KEYS;
    const p = prev as Record<string, unknown>;
    const n = next as Record<string, unknown>;
    return keys.filter((k) => !same(p[k], n[k]));
  }
  if (name === "program") {
    const p = parseProgram(prev as string);
    const n = parseProgram(next as string);
    if (!p || !n) return [WHOLE];
    return [
      ...(same(p.settings, n.settings) ? [] : [PROGRAM_SETTINGS]),
      ...(same(p.overrides, n.overrides) ? [] : [PROGRAM_OVERRIDES]),
      ...(same(p.archived, n.archived) ? [] : [PROGRAM_ARCHIVED]),
    ];
  }
  return [WHOLE];
}

export const PROGRAM_SETTINGS = "settings";
export const PROGRAM_OVERRIDES = "overrides";
export const PROGRAM_ARCHIVED = "archived";

/** String program di perangkat → pengaturan + override (urut per sesi) + arsip. Rusak → null. */
function parseProgram(raw: string | null): { settings: Record<string, unknown>; overrides: ProgramOverride[]; archived: ArchivedProgram[]; weekNotesSeen: string[] } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const { overrides, archived, weekNotesSeen, ...rest } = v as Record<string, unknown>;
    const settings = Object.fromEntries(Object.keys(rest).sort().map((k) => [k, rest[k]]));
    return {
      settings,
      overrides: mergeOverrides(Array.isArray(overrides) ? overrides.filter(isOverride) : []),
      archived: mergeArchived(Array.isArray(archived) ? archived.filter(isArchived) : []),
      weekNotesSeen: mergeWeekNotes(weekNotesSeen),
    };
  } catch {
    return null;
  }
}

/** Gabungan bagian program: pengaturan utuh (dirty → lokal), override per sesi selalu digabung. */
function mergeProgram(server: string | null, local: string | null, dirty: string[], first: boolean): string | null {
  if (server === null) return local;
  if (local === null) return !first && dirty.length ? null : server;
  const s = parseProgram(server);
  const l = parseProgram(local);
  if (!s || !l) return first ? server : dirty.length ? local : server;
  const useLocal = !first && (dirty.includes(WHOLE) || dirty.includes(PROGRAM_SETTINGS));
  const routed = routeOverrides(mergeOverrides(s.overrides, l.overrides), mergeArchived(s.archived, l.archived));
  const { overrides, archived } = routed;
  // Catatan akhir minggu yang sudah ditutup di perangkat mana pun tetap tertutup (0.14.3).
  const weekNotesSeen = mergeWeekNotes(s.weekNotesSeen, l.weekNotesSeen);
  return JSON.stringify({
    ...(useLocal ? l.settings : s.settings),
    ...(overrides.length ? { overrides } : {}),
    ...(archived.length ? { archived } : {}),
    ...(weekNotesSeen.length ? { weekNotesSeen } : {}),
  });
}

const minIso = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : a ?? b);
const maxStr = <T extends string>(a?: T, b?: T) => (a && b ? (a > b ? a : b) : a ?? b);

/** Gabungan onboarding yang simetris & idempoten: kemajuan di perangkat mana pun tidak hilang. */
export function mergeOnboarding(a: OnboardingState | null, b: OnboardingState | null): OnboardingState | null {
  if (!a || !b) return a ?? b;
  const completed = STEPS.filter((s) => a.completed.includes(s) || b.completed.includes(s));
  const skipped = STEPS.filter((s) => (a.skipped.includes(s) || b.skipped.includes(s)) && !completed.includes(s));
  const va = a.termsVersion ?? 0;
  const vb = b.termsVersion ?? 0;
  const out: OnboardingState = {
    version: 1,
    currentStep: STEPS[Math.max(STEPS.indexOf(a.currentStep), STEPS.indexOf(b.currentStep))],
    completed,
    skipped,
  };
  const termsVersion = Math.max(va, vb);
  if (termsVersion > 0) {
    out.termsVersion = termsVersion;
    const accepted = va === vb ? minIso(a.termsAcceptedAt, b.termsAcceptedAt) : va > vb ? a.termsAcceptedAt : b.termsAcceptedAt;
    if (accepted) out.termsAcceptedAt = accepted;
  }
  for (const k of ["protectionConfirmedAt", "completedAt", "tourCompletedAt"] as const) {
    const v = minIso(a[k], b[k]);
    if (v) out[k] = v;
  }
  if (out.completedAt) out.currentStep = "summary";
  if (a.migrated || b.migrated) out.migrated = true;
  const choice = maxStr(a.conditionsChoice, b.conditionsChoice);
  if (choice) out.conditionsChoice = choice;
  const zone = maxStr(a.zonePath, b.zonePath);
  if (zone) out.zonePath = zone;
  return out;
}

function mergeKeyed<T extends Record<string, unknown>>(server: T | null, local: T | null, keys: readonly string[], dirty: string[], first: boolean): T | null {
  if (server === null) return local;
  if (local === null) return !first && dirty.length ? null : server;
  if (!first && dirty.includes(WHOLE)) return local;
  const out: Record<string, unknown> = { ...server };
  for (const k of keys) {
    const useLocal = first ? server[k] === undefined : dirty.includes(k);
    if (useLocal) {
      if (local[k] === undefined) delete out[k];
      else out[k] = local[k];
    }
  }
  return out as T;
}

export function mergePart<K extends PartName>(name: K, server: PartData[K], local: PartData[K], dirty: string[], first = false): PartData[K] {
  switch (name) {
    case "log":
      return mergeLogs(server as PartData["log"], local as PartData["log"]) as PartData[K];
    case "prs":
      return mergePrs(server as PartData["prs"], local as PartData["prs"]) as PartData[K];
    case "sessions":
      return mergeSessions(server as PartData["sessions"], local as PartData["sessions"]) as PartData[K];
    case "onboarding":
      return mergeOnboarding(server as OnboardingState | null, local as OnboardingState | null) as PartData[K];
    case "settings":
      return mergeKeyed(server as Record<string, unknown> | null, local as Record<string, unknown> | null, SETTINGS_KEYS, dirty, first) as PartData[K];
    case "preferences":
      return (mergeKeyed(server as Record<string, unknown>, local as Record<string, unknown>, PREFERENCE_KEYS, dirty, first) ?? {}) as PartData[K];
    case "program":
      return mergeProgram(server as string | null, local as string | null, dirty, first) as PartData[K];
    default:
      // profile: bagian utuh.
      if (first) return (server ?? local) as PartData[K];
      return (dirty.length ? local : server) as PartData[K];
  }
}
