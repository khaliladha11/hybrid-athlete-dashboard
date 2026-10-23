import { NextResponse } from "next/server";
import { passcodeConfig } from "@/lib/auth/config";
import { redisEnv } from "@/lib/redis";
import { availability } from "@/lib/sync/server";

// Status pemasangan untuk onboarding langkah 4 & Setting: hanya boolean, tidak pernah nilai env.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(availability(passcodeConfig(), redisEnv()), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
