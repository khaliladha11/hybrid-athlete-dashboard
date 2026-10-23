import { NextResponse } from "next/server";
import { passcodeConfig } from "@/lib/auth/config";
import { clientKey, unlockLimiter } from "@/lib/auth/rate-limit";
import { sessionCookie } from "@/lib/auth/session";
import { attemptUnlock } from "@/lib/auth/unlock";

// Buka kunci sandi aplikasi. Sandi tidak pernah di-log atau dikembalikan.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  let passcode: unknown;
  try {
    passcode = ((await request.json()) as { passcode?: unknown } | null)?.passcode;
  } catch {
    passcode = undefined;
  }
  const result = await attemptUnlock({ cfg: passcodeConfig(), passcode, store: unlockLimiter(), key: clientKey(request.headers) });
  if (result.status !== 204) {
    const headers: Record<string, string> = { ...NO_STORE };
    if (result.body.error === "rate_limited") headers["Retry-After"] = String(result.body.retryAfterSec);
    return NextResponse.json(result.body, { status: result.status, headers });
  }
  const res = new NextResponse(null, { status: 204, headers: NO_STORE });
  res.cookies.set(sessionCookie(result.token, new URL(request.url).protocol === "https:"));
  return res;
}
