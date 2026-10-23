import { json, openSync } from "@/lib/sync/gate";
import { handleListSnapshots } from "@/lib/sync/server";

// Riwayat cadangan: daftar snapshot (ringkasan saja, tanpa data).
export const dynamic = "force-dynamic";

export async function GET() {
  const o = await openSync();
  if ("response" in o) return o.response;
  try {
    return json(await handleListSnapshots(o.store));
  } catch {
    return json({ error: "database" }, 503);
  }
}
