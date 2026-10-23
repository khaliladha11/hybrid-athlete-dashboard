/**
 * Logika /api/sync dan /api/status tanpa Next.js (bisa diuji). Setiap bagian divalidasi dengan
 * parser yang sama seperti impor cadangan; tombstone log lama dipadatkan saat ditulis.
 */
import { todayWib } from "@/lib/date";
import { compactTombstones } from "@/lib/log-entries";
import type { OnboardingState } from "@/lib/onboarding";
import type { AthleteProfile } from "@/lib/profile";
import type { PasscodeConfig } from "@/lib/auth/config";
import type { RedisConfig } from "@/lib/redis";
import { emptyPart, isPartName, PART_NAMES, validatePart, type PartData, type PartName } from "./parts";
import { mergeOnboarding } from "./merge";
import { beforeRestoreId, dailyId, isSnapshotId, pruneIds, serverHasData, sortSnapshots, summarize, type SnapshotKind, type SnapshotParts } from "./snapshots";
import type { PartWrite, StoredPart, SyncStore, WriteResult } from "./store";

export const MAX_BODY_BYTES = 1024 * 1024;

export type Availability = { passcode: boolean; database: boolean; sync: boolean };
export type DisabledReason = "no-passcode" | "no-database";

/** Sinkron wajib sandi aktif (bukan sekadar terisi) dan database. Hanya boolean yang keluar dari server. */
export function availability(cfg: PasscodeConfig, redis: RedisConfig | null): Availability {
  const passcode = cfg.state === "on";
  const database = redis !== null;
  return { passcode, database, sync: passcode && database };
}

export const disabledReason = (a: Availability): DisabledReason => (a.passcode ? "no-database" : "no-passcode");

/** Data tersimpan → bentuk bersih; data rusak di server dianggap kosong (tidak pernah dikirim ke klien apa adanya). */
function clean(part: PartName, data: unknown, base: AthleteProfile): unknown {
  if (data === null || data === undefined) return emptyPart(part);
  return validatePart(part, data, base) ?? emptyPart(part);
}

const cleanAll = (all: Record<PartName, StoredPart>, base: AthleteProfile) =>
  Object.fromEntries(PART_NAMES.map((p) => [p, { rev: all[p].rev, epoch: all[p].epoch, data: clean(p, all[p].data, base) }])) as Record<PartName, StoredPart>;

/** Simpan snapshot (bila id belum ada), lalu sisakan 7 terbaru. */
async function takeSnapshot(store: SyncStore, kind: SnapshotKind, id: string, parts: SnapshotParts, nowIso: string): Promise<boolean> {
  const created = await store.saveSnapshot({ id, kind, createdAt: nowIso, summary: summarize(parts) }, parts);
  if (created) await store.deleteSnapshots(pruneIds(await store.listSnapshots()));
  return created;
}

/** Semua bagian + snapshot harian saat sinkron pertama hari itu (WIB), sebelum ada tulisan hari itu. */
export async function handleGet(store: SyncStore, base: AthleteProfile, now = new Date()) {
  const id = dailyId(todayWib(now));
  const { parts: all, hasSnapshot } = await store.readForSync(id);
  const parts = cleanAll(all, base);
  if (!hasSnapshot && serverHasData(parts)) {
    // Snapshot gagal tidak boleh menggagalkan sinkron.
    await takeSnapshot(store, "daily", id, parts, now.toISOString()).catch(() => false);
  }
  return { enabled: true as const, parts };
}

export async function handleListSnapshots(store: SyncStore) {
  return { enabled: true as const, snapshots: sortSnapshots(await store.listSnapshots()) };
}

export type RestoreOutcome = { status: 200; body: { enabled: true; restored: string; undoId: string } } | { status: 400 | 404; body: { error: string } };

/** Pulihkan: snapshot keadaan sekarang dulu (bisa dibatalkan), lalu ganti semua bagian & naikkan epoch. */
export async function handleRestore(store: SyncStore, rawBody: string, base: AthleteProfile, now = new Date()): Promise<RestoreOutcome> {
  let id: unknown;
  try {
    id = (JSON.parse(rawBody) as { id?: unknown })?.id;
  } catch {
    id = undefined;
  }
  if (!isSnapshotId(id)) return { status: 400, body: { error: "invalid" } };
  const snap = await store.getSnapshot(id);
  if (!snap) return { status: 404, body: { error: "not_found" } };
  const iso = now.toISOString();
  const undoId = beforeRestoreId(iso);
  const current = cleanAll(await store.readAll(), base);
  await takeSnapshot(store, "before-restore", undoId, current, iso);
  const data = Object.fromEntries(PART_NAMES.map((p) => [p, clean(p, snap[p]?.data, base)])) as Record<PartName, unknown>;
  // Kemajuan onboarding & persetujuan disclaimer tidak ikut mundur karena pulihkan.
  data.onboarding = mergeOnboarding(data.onboarding as OnboardingState | null, current.onboarding.data as OnboardingState | null);
  await store.restoreAll(data);
  return { status: 200, body: { enabled: true, restored: id, undoId } };
}

export type PostOutcome = { status: 200; body: { enabled: true; results: WriteResult[] } } | { status: 400 | 413; body: { error: string } };

export async function handlePost(store: SyncStore, rawBody: string, base: AthleteProfile, nowMs = Date.now()): Promise<PostOutcome> {
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return { status: 413, body: { error: "too_large" } };
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "invalid" } };
  }
  const writes = (body as { writes?: unknown })?.writes;
  if (!Array.isArray(writes) || writes.length === 0 || writes.length > PART_NAMES.length) return { status: 400, body: { error: "invalid" } };
  const seen = new Set<PartName>();
  const valid: PartWrite[] = [];
  for (const w of writes as Record<string, unknown>[]) {
    const part = w?.part;
    const baseRev = w?.baseRev;
    if (!isPartName(part) || seen.has(part) || typeof baseRev !== "number" || !Number.isInteger(baseRev) || baseRev < 0) return { status: 400, body: { error: "invalid" } };
    let data = validatePart(part, w.data, base);
    if (data === undefined) return { status: 400, body: { error: "invalid" } };
    if (part === "log") data = compactTombstones(data as PartData["log"], nowMs);
    seen.add(part);
    valid.push({ part, baseRev, data });
  }
  const results = await store.writeMany(valid);
  return {
    status: 200,
    body: { enabled: true, results: results.map((r) => (r.ok ? r : { ...r, data: clean(r.part, r.data, base) })) },
  };
}
