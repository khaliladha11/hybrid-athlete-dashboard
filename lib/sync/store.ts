/**
 * Penyimpanan sinkron di server (docs/SYNC.md §4, §8). Satu hash Redis per bagian (`rev`, `epoch`, `data` JSON).
 * Baca semua bagian = 1 pipeline; tulis = EVAL Lua atomik yang hanya menyimpan bila `rev == baseRev`,
 * selain itu mengembalikan versi terbaru supaya klien bisa menggabungkan lalu mengulang.
 * Pulihkan menaikkan `epoch` semua bagian dalam satu EVAL: klien mengganti datanya, bukan menggabungkan.
 * Snapshot: isi di `ha:sync:snap:<id>`, daftar ringkas di hash `ha:sync:snapmeta`.
 * Akses database hanya lewat modul ini, dan modul ini hanya dipakai route server.
 */
import { redisPipeline, type RedisConfig } from "@/lib/redis";
import { PART_NAMES, type PartName } from "./parts";
import type { SnapshotMeta, SnapshotParts } from "./snapshots";

export interface StoredPart {
  rev: number;
  /** Naik setiap pulihkan; klien dengan epoch lebih lama mengganti bagian lokalnya. */
  epoch: number;
  /** JSON mentah; null = bagian belum pernah ditulis. */
  data: unknown;
}
export interface PartWrite {
  part: PartName;
  baseRev: number;
  data: unknown;
}
export type WriteResult = { part: PartName; ok: true; rev: number } | { part: PartName; ok: false; rev: number; data: unknown };

export interface SyncStore {
  readAll(): Promise<Record<PartName, StoredPart>>;
  /** `readAll` + apakah snapshot `snapshotId` sudah ada, dalam satu request. */
  readForSync(snapshotId: string): Promise<{ parts: Record<PartName, StoredPart>; hasSnapshot: boolean }>;
  writeMany(writes: PartWrite[]): Promise<WriteResult[]>;
  /** Simpan snapshot hanya bila id belum ada. Mengembalikan true bila baru dibuat. */
  saveSnapshot(meta: SnapshotMeta, parts: SnapshotParts): Promise<boolean>;
  listSnapshots(): Promise<SnapshotMeta[]>;
  getSnapshot(id: string): Promise<SnapshotParts | null>;
  deleteSnapshots(ids: string[]): Promise<void>;
  /** Tulis semua bagian sekaligus (atomik), `rev` & `epoch` naik. */
  restoreAll(data: Record<PartName, unknown>): Promise<void>;
}

export const syncKey = (part: PartName) => `ha:sync:${part}`;
export const snapKey = (id: string) => `ha:sync:snap:${id}`;
export const SNAP_META_KEY = "ha:sync:snapmeta";

const parseJson = (s: unknown): unknown => {
  if (typeof s !== "string" || !s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** Untuk test dan pengembangan: semantik sama dengan Redis. */
export function memorySyncStore(): SyncStore & { raw: Map<PartName, { rev: number; epoch?: number; data: string }>; snaps: Map<string, { meta: SnapshotMeta; parts: string }> } {
  const raw = new Map<PartName, { rev: number; epoch?: number; data: string }>();
  const snaps = new Map<string, { meta: SnapshotMeta; parts: string }>();
  const readAll = async () =>
    Object.fromEntries(PART_NAMES.map((p) => [p, { rev: raw.get(p)?.rev ?? 0, epoch: raw.get(p)?.epoch ?? 0, data: parseJson(raw.get(p)?.data) }])) as Record<PartName, StoredPart>;
  return {
    raw,
    snaps,
    readAll,
    async readForSync(id) {
      return { parts: await readAll(), hasSnapshot: snaps.has(id) };
    },
    async writeMany(writes) {
      return writes.map(({ part, baseRev, data }) => {
        const cur = raw.get(part) ?? { rev: 0, data: "" };
        if (cur.rev !== baseRev) return { part, ok: false as const, rev: cur.rev, data: parseJson(cur.data) };
        raw.set(part, { ...cur, rev: cur.rev + 1, data: JSON.stringify(data) });
        return { part, ok: true as const, rev: cur.rev + 1 };
      });
    },
    async saveSnapshot(meta, parts) {
      if (snaps.has(meta.id)) return false;
      snaps.set(meta.id, { meta, parts: JSON.stringify(parts) });
      return true;
    },
    async listSnapshots() {
      return [...snaps.values()].map((s) => s.meta);
    },
    async getSnapshot(id) {
      return (parseJson(snaps.get(id)?.parts) as SnapshotParts | null) ?? null;
    },
    async deleteSnapshots(ids) {
      for (const id of ids) snaps.delete(id);
    },
    async restoreAll(data) {
      for (const p of PART_NAMES) {
        const cur = raw.get(p) ?? { rev: 0, epoch: 0, data: "" };
        raw.set(p, { rev: cur.rev + 1, epoch: (cur.epoch ?? 0) + 1, data: JSON.stringify(data[p]) });
      }
    },
  };
}

export const WRITE_SCRIPT = [
  "local r = tonumber(redis.call('HGET', KEYS[1], 'rev') or '0')",
  "if r ~= tonumber(ARGV[1]) then return {0, r, redis.call('HGET', KEYS[1], 'data') or ''} end",
  "redis.call('HSET', KEYS[1], 'rev', r + 1, 'data', ARGV[2])",
  "return {1, r + 1, ''}",
].join("\n");

export const RESTORE_SCRIPT = [
  "for i = 1, #KEYS do",
  "  local r = tonumber(redis.call('HGET', KEYS[i], 'rev') or '0') + 1",
  "  local e = tonumber(redis.call('HGET', KEYS[i], 'epoch') or '0') + 1",
  "  redis.call('HSET', KEYS[i], 'rev', r, 'epoch', e, 'data', ARGV[i])",
  "end",
  "return #KEYS",
].join("\n");

function partsFromHashes(results: unknown[]): Record<PartName, StoredPart> {
  return Object.fromEntries(
    PART_NAMES.map((p, i) => {
      const flat = Array.isArray(results[i]) ? (results[i] as unknown[]) : [];
      const h: Record<string, unknown> = {};
      for (let j = 0; j + 1 < flat.length; j += 2) h[String(flat[j])] = flat[j + 1];
      return [p, { rev: Number(h.rev) || 0, epoch: Number(h.epoch) || 0, data: parseJson(h.data) }];
    }),
  ) as Record<PartName, StoredPart>;
}

export function redisSyncStore(cfg: RedisConfig, fetchImpl: typeof fetch = fetch): SyncStore {
  const pipeline = redisPipeline(cfg, fetchImpl);
  const reads = () => PART_NAMES.map((p) => ["HGETALL", syncKey(p)]);
  return {
    async readAll() {
      return partsFromHashes(await pipeline(reads()));
    },
    async readForSync(id) {
      const results = await pipeline([...reads(), ["EXISTS", snapKey(id)]]);
      return { parts: partsFromHashes(results), hasSnapshot: Number(results[PART_NAMES.length]) === 1 };
    },
    async writeMany(writes) {
      if (!writes.length) return [];
      const results = await pipeline(writes.map((w) => ["EVAL", WRITE_SCRIPT, 1, syncKey(w.part), w.baseRev, JSON.stringify(w.data)]));
      return writes.map((w, i) => {
        const [ok, rev, data] = (Array.isArray(results[i]) ? results[i] : [0, 0, ""]) as [number, number, string];
        return Number(ok) === 1 ? { part: w.part, ok: true as const, rev: Number(rev) } : { part: w.part, ok: false as const, rev: Number(rev), data: parseJson(data) };
      });
    },
    async saveSnapshot(meta, parts) {
      const [created] = await pipeline([["SET", snapKey(meta.id), JSON.stringify(parts), "NX"]]);
      if (created !== "OK") return false;
      await pipeline([["HSET", SNAP_META_KEY, meta.id, JSON.stringify(meta)]]);
      return true;
    },
    async listSnapshots() {
      const [flat] = await pipeline([["HGETALL", SNAP_META_KEY]]);
      const list = Array.isArray(flat) ? flat : [];
      const out: SnapshotMeta[] = [];
      for (let j = 1; j < list.length; j += 2) {
        const m = parseJson(list[j]) as SnapshotMeta | null;
        if (m?.id) out.push(m);
      }
      return out;
    },
    async getSnapshot(id) {
      const [raw] = await pipeline([["GET", snapKey(id)]]);
      return (parseJson(raw) as SnapshotParts | null) ?? null;
    },
    async deleteSnapshots(ids) {
      if (!ids.length) return;
      await pipeline([["DEL", ...ids.map(snapKey)], ["HDEL", SNAP_META_KEY, ...ids]]);
    },
    async restoreAll(data) {
      await pipeline([["EVAL", RESTORE_SCRIPT, PART_NAMES.length, ...PART_NAMES.map(syncKey), ...PART_NAMES.map((p) => JSON.stringify(data[p]))]]);
    },
  };
}
