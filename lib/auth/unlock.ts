/**
 * Logika POST /api/unlock tanpa Next.js (bisa diuji). Respons tidak pernah memuat sandi atau secret.
 * Urutan: cek batas dulu → bandingkan sandi (waktu konstan) → catat gagal / reset & buat sesi.
 */
import type { PasscodeConfig } from "./config";
import { MAX_FAILS, type RateStore } from "./rate-limit";
import { checkPasscode, signSession } from "./session";

export type UnlockBody =
  | { error: "off" }
  | { error: "misconfigured" }
  | { error: "rate_limited"; retryAfterSec: number }
  | { error: "wrong"; remaining: number };

export type UnlockResult = { status: 204; token: string } | { status: 401 | 404 | 429 | 503; body: UnlockBody };

const MAX_INPUT = 256;

export async function attemptUnlock(input: { cfg: PasscodeConfig; passcode: unknown; store: RateStore; key: string; nowMs?: number }): Promise<UnlockResult> {
  const { cfg, store, key, nowMs } = input;
  if (cfg.state === "off") return { status: 404, body: { error: "off" } };
  if (cfg.state === "misconfigured") return { status: 503, body: { error: "misconfigured" } };

  const before = await store.peek(key);
  if (before.count >= MAX_FAILS) return { status: 429, body: { error: "rate_limited", retryAfterSec: before.ttlSec } };

  const passcode = typeof input.passcode === "string" ? input.passcode.slice(0, MAX_INPUT) : "";
  if (!checkPasscode(cfg, passcode)) {
    const after = await store.hit(key);
    if (after.count >= MAX_FAILS) return { status: 429, body: { error: "rate_limited", retryAfterSec: after.ttlSec } };
    return { status: 401, body: { error: "wrong", remaining: MAX_FAILS - after.count } };
  }
  await store.reset(key);
  return { status: 204, token: signSession(cfg, nowMs) };
}
