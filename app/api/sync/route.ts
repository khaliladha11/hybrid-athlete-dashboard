import { baseProfile } from "@/lib/profile";
import { json, openSync } from "@/lib/sync/gate";
import { handleGet, handlePost, MAX_BODY_BYTES } from "@/lib/sync/server";

// Sinkron (docs/SYNC.md §4). Wajib sandi aktif + sesi valid + database. Database hanya diakses di server.
export const dynamic = "force-dynamic";

export async function GET() {
  const o = await openSync();
  if ("response" in o) return o.response;
  try {
    return json(await handleGet(o.store, baseProfile));
  } catch {
    return json({ error: "database" }, 503);
  }
}

export async function POST(request: Request) {
  const o = await openSync();
  if ("response" in o) return o.response;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);
  try {
    const out = await handlePost(o.store, await request.text(), baseProfile);
    return json(out.body, out.status);
  } catch {
    return json({ error: "database" }, 503);
  }
}
