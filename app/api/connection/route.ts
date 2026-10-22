import { NextResponse } from "next/server";
import { getIntervalsConfig, intervalsGet } from "@/lib/intervals/client";
import { resolveConnection } from "@/lib/intervals/connection";

// Status koneksi intervals.icu untuk onboarding (langkah 3) dan pengingat di Setting.
// Respons hanya { status, athleteName? }. Key & athlete ID tetap di server. Tidak di-cache.
export const dynamic = "force-dynamic";

export async function GET() {
  const { hasKey, athleteId } = getIntervalsConfig();
  const result = await resolveConnection({
    hasKey,
    fetchAthlete: () => intervalsGet(`/athlete/${encodeURIComponent(athleteId)}`),
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
