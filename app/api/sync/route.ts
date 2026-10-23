import { NextResponse } from "next/server";
import { passcodeConfig } from "@/lib/auth/config";
import { isRequestUnlocked } from "@/lib/auth/guard";
import { baseProfile } from "@/lib/profile";
import { redisEnv } from "@/lib/redis";
import { availability, disabledReason, handleGet, handlePost } from "@/lib/sync/server";
import { redisSyncStore } from "@/lib/sync/store";

// Sinkron (docs/SYNC.md §4). Wajib sandi aktif + sesi valid + database. Database hanya diakses di sini.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

async function open() {
  const redis = redisEnv();
  const a = availability(passcodeConfig(), redis);
  if (!a.sync || !redis) return { response: json({ enabled: false, reason: disabledReason(a) }) };
  if (!(await isRequestUnlocked())) return { response: json({ error: "locked" }, 401) };
  return { store: redisSyncStore(redis) };
}

export async function GET() {
  const o = await open();
  if (!o.store) return o.response;
  try {
    return json(await handleGet(o.store, baseProfile));
  } catch {
    return json({ error: "database" }, 503);
  }
}

export async function POST(request: Request) {
  const o = await open();
  if (!o.store) return o.response;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 1024 * 1024) return json({ error: "too_large" }, 413);
  try {
    const out = await handlePost(o.store, await request.text(), baseProfile);
    return json(out.body, out.status);
  } catch {
    return json({ error: "database" }, 503);
  }
}
