import "server-only";
import { NextResponse } from "next/server";
import { passcodeConfig } from "@/lib/auth/config";
import { isRequestUnlocked } from "@/lib/auth/guard";
import { redisEnv } from "@/lib/redis";
import { availability, disabledReason } from "./server";
import { redisSyncStore, type SyncStore } from "./store";

export const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/** Gerbang semua route sinkron: sandi aktif + database + sesi valid. Database hanya dibuka di sini. */
export async function openSync(): Promise<{ store: SyncStore } | { response: NextResponse }> {
  const redis = redisEnv();
  const a = availability(passcodeConfig(), redis);
  if (!a.sync || !redis) return { response: json({ enabled: false, reason: disabledReason(a) }) };
  if (!(await isRequestUnlocked())) return { response: json({ error: "locked" }, 401) };
  return { store: redisSyncStore(redis) };
}
