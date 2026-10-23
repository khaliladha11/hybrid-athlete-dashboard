import { baseProfile } from "@/lib/profile";
import { json, openSync } from "@/lib/sync/gate";
import { handleRestore } from "@/lib/sync/server";

// Pulihkan snapshot. Keadaan sekarang disimpan dulu sebagai snapshot "sebelum pulihkan".
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const o = await openSync();
  if ("response" in o) return o.response;
  try {
    const out = await handleRestore(o.store, (await request.text()).slice(0, 1024), baseProfile);
    return json(out.body, out.status);
  } catch {
    return json({ error: "database" }, 503);
  }
}
