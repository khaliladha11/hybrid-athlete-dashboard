/**
 * Upstash Redis lewat REST (`fetch`, tanpa dependensi klien). Dipakai batas percobaan sandi & sinkron.
 * Env dari integrasi Vercel Marketplace: `UPSTASH_REDIS_REST_*` atau `KV_REST_API_*` (urutan sama
 * dengan SDK resmi: UPSTASH didahulukan). Token tidak pernah keluar dari server.
 */

type Env = Record<string, string | undefined>;
export type RedisConfig = { url: string; token: string };
export type RedisCommand = (string | number)[];

export function redisEnv(env: Env = process.env): RedisConfig | null {
  const pick = (u?: string, t?: string) => (u?.trim() && t?.trim() ? { url: u.trim().replace(/\/+$/, ""), token: t.trim() } : null);
  return pick(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN) ?? pick(env.KV_REST_API_URL, env.KV_REST_API_TOKEN);
}

/** Satu request `/pipeline` berisi beberapa perintah. Gagal (HTTP, error perintah, timeout) → throw. */
export function redisPipeline(cfg: RedisConfig, fetchImpl: typeof fetch = fetch, timeoutMs = 5000) {
  return async (commands: RedisCommand[]): Promise<unknown[]> => {
    const res = await fetchImpl(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    if (!Array.isArray(out) || out.some((r) => r?.error)) throw new Error("redis error");
    return out.map((r) => r.result);
  };
}
