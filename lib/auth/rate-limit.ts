/**
 * Batas percobaan sandi: maks 5 gagal per 15 menit per IP (docs/SYNC.md §3).
 * Redis (Upstash REST lewat fetch, tanpa dependensi) bila env tersedia; selain itu memori per instance,
 * yang hanya upaya terbaik karena tiap instance serverless punya memorinya sendiri.
 * IP mentah tidak disimpan: kuncinya hash SHA-256.
 */
import { createHash } from "node:crypto";
import { redisEnv, redisPipeline, type RedisConfig } from "@/lib/redis";

export const MAX_FAILS = 5;
export const WINDOW_SEC = 15 * 60;

export interface RateState {
  count: number;
  /** Sisa detik jendela; 0 bila belum ada percobaan gagal. */
  ttlSec: number;
}

export interface RateStore {
  /** Tambah satu gagal; jendela 15 menit dimulai dari gagal pertama. */
  hit(key: string): Promise<RateState>;
  peek(key: string): Promise<RateState>;
  reset(key: string): Promise<void>;
}

type Env = Record<string, string | undefined>;

export function clientKey(headers: Headers): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
  return `ha:unlock:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

export function memoryStore(now: () => number = Date.now): RateStore {
  const map = new Map<string, { count: number; resetAt: number }>();
  const live = (key: string) => {
    const t = now();
    for (const [k, v] of map) if (v.resetAt <= t) map.delete(k);
    return map.get(key);
  };
  const state = (e?: { count: number; resetAt: number }): RateState =>
    e ? { count: e.count, ttlSec: Math.max(1, Math.ceil((e.resetAt - now()) / 1000)) } : { count: 0, ttlSec: 0 };
  return {
    async hit(key) {
      const e = live(key) ?? { count: 0, resetAt: now() + WINDOW_SEC * 1000 };
      e.count++;
      map.set(key, e);
      return state(e);
    },
    async peek(key) {
      return state(live(key));
    },
    async reset(key) {
      map.delete(key);
    },
  };
}

export { redisEnv };

export function redisStore(cfg: RedisConfig, fetchImpl: typeof fetch = fetch): RateStore {
  const pipeline = redisPipeline(cfg, fetchImpl, 3000);
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  return {
    async hit(key) {
      const [count, , ttl] = await pipeline([["INCR", key], ["EXPIRE", key, WINDOW_SEC, "NX"], ["TTL", key]]);
      return { count: num(count), ttlSec: Math.max(1, num(ttl)) };
    },
    async peek(key) {
      const [count, ttl] = await pipeline([["GET", key], ["TTL", key]]);
      const c = num(count);
      return { count: c, ttlSec: c ? Math.max(1, num(ttl)) : 0 };
    },
    async reset(key) {
      await pipeline([["DEL", key]]);
    },
  };
}

/** Redis bila tersedia; bila Redis gagal, jatuh ke memori tanpa membuka kunci. */
export function withFallback(primary: RateStore | null, fallback: RateStore): RateStore {
  if (!primary) return fallback;
  const run = <T,>(f: (s: RateStore) => Promise<T>) => f(primary).catch(() => f(fallback));
  return { hit: (k) => run((s) => s.hit(k)), peek: (k) => run((s) => s.peek(k)), reset: (k) => run((s) => s.reset(k)) };
}

const globalMemory = globalThis as unknown as { __haUnlockMemory?: RateStore };

export function unlockLimiter(env: Env = process.env): RateStore {
  globalMemory.__haUnlockMemory ??= memoryStore();
  const redis = redisEnv(env);
  return withFallback(redis ? redisStore(redis) : null, globalMemory.__haUnlockMemory);
}
