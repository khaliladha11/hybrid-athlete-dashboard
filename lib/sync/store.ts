/**
 * Penyimpanan sinkron di server (docs/SYNC.md §4, §8). Satu hash Redis per bagian (`rev` + `data` JSON).
 * Baca semua bagian = 1 pipeline; tulis = EVAL Lua atomik yang hanya menyimpan bila `rev == baseRev`,
 * selain itu mengembalikan versi terbaru supaya klien bisa menggabungkan lalu mengulang.
 * Akses database hanya lewat modul ini, dan modul ini hanya dipakai route server.
 */
import { redisPipeline, type RedisConfig } from "@/lib/redis";
import { PART_NAMES, type PartName } from "./parts";

export interface StoredPart {
  rev: number;
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
  writeMany(writes: PartWrite[]): Promise<WriteResult[]>;
}

export const syncKey = (part: PartName) => `ha:sync:${part}`;

const parseJson = (s: unknown): unknown => {
  if (typeof s !== "string" || !s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** Untuk test dan pengembangan: semantik sama dengan Redis. */
export function memorySyncStore(): SyncStore & { raw: Map<PartName, { rev: number; data: string }> } {
  const raw = new Map<PartName, { rev: number; data: string }>();
  return {
    raw,
    async readAll() {
      return Object.fromEntries(PART_NAMES.map((p) => [p, { rev: raw.get(p)?.rev ?? 0, data: parseJson(raw.get(p)?.data) }])) as Record<PartName, StoredPart>;
    },
    async writeMany(writes) {
      return writes.map(({ part, baseRev, data }) => {
        const cur = raw.get(part) ?? { rev: 0, data: "" };
        if (cur.rev !== baseRev) return { part, ok: false as const, rev: cur.rev, data: parseJson(cur.data) };
        raw.set(part, { rev: cur.rev + 1, data: JSON.stringify(data) });
        return { part, ok: true as const, rev: cur.rev + 1 };
      });
    },
  };
}

export const WRITE_SCRIPT = [
  "local r = tonumber(redis.call('HGET', KEYS[1], 'rev') or '0')",
  "if r ~= tonumber(ARGV[1]) then return {0, r, redis.call('HGET', KEYS[1], 'data') or ''} end",
  "redis.call('HSET', KEYS[1], 'rev', r + 1, 'data', ARGV[2])",
  "return {1, r + 1, ''}",
].join("\n");

export function redisSyncStore(cfg: RedisConfig, fetchImpl: typeof fetch = fetch): SyncStore {
  const pipeline = redisPipeline(cfg, fetchImpl);
  return {
    async readAll() {
      const results = await pipeline(PART_NAMES.map((p) => ["HGETALL", syncKey(p)]));
      return Object.fromEntries(
        PART_NAMES.map((p, i) => {
          const flat = Array.isArray(results[i]) ? (results[i] as unknown[]) : [];
          const h: Record<string, unknown> = {};
          for (let j = 0; j + 1 < flat.length; j += 2) h[String(flat[j])] = flat[j + 1];
          return [p, { rev: Number(h.rev) || 0, data: parseJson(h.data) }];
        }),
      ) as Record<PartName, StoredPart>;
    },
    async writeMany(writes) {
      if (!writes.length) return [];
      const results = await pipeline(writes.map((w) => ["EVAL", WRITE_SCRIPT, 1, syncKey(w.part), w.baseRev, JSON.stringify(w.data)]));
      return writes.map((w, i) => {
        const [ok, rev, data] = (Array.isArray(results[i]) ? results[i] : [0, 0, ""]) as [number, number, string];
        return Number(ok) === 1 ? { part: w.part, ok: true as const, rev: Number(rev) } : { part: w.part, ok: false as const, rev: Number(rev), data: parseJson(data) };
      });
    },
  };
}
