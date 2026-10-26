import { NextResponse } from "next/server";
import { todayWib } from "@/lib/date";
import { getActivities } from "@/lib/intervals/data-source";
import { rangeDays } from "@/lib/program/range";

// Aktivitas sejak awal program untuk kalender & kepatuhan (0.13). Key intervals.icu tetap di server;
// sesi sandi diperiksa `intervalsGet`. Error dikembalikan sebagai pesan singkat tanpa stack trace.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const today = todayWib();
  const days = rangeDays(new URL(request.url).searchParams.get("oldest"), today);
  if (days === null) {
    return NextResponse.json(
      { ok: false, error: { code: "UNKNOWN", status: 400, title: "Rentang tidak valid", message: "Tanggal awal harus YYYY-MM-DD, tidak di masa depan, dan maksimal 200 hari ke belakang." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const result = await getActivities(days, today);
  return NextResponse.json(result, { status: result.ok ? 200 : 502, headers: { "Cache-Control": result.ok ? "private, max-age=300" : "no-store" } });
}
