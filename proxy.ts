import { NextResponse, type NextRequest } from "next/server";
import { decide } from "@/lib/auth/access";
import { passcodeConfig } from "@/lib/auth/config";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Kunci sandi aplikasi (docs/SYNC.md §3). Next.js 16: "middleware" bernama "proxy", runtime Node.js.
 * Tanpa APP_PASSCODE semua request diteruskan apa adanya (perilaku 0.11). Ini lapisan pertama;
 * pengambilan data intervals.icu & route API memeriksa sesi lagi (`lib/auth/guard.ts`).
 */
export function proxy(request: NextRequest) {
  const cfg = passcodeConfig();
  if (cfg.state === "off") return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const decision = decide({ path: pathname, search, cfg, token: request.cookies.get(SESSION_COOKIE)?.value });
  if (decision.type === "next") return NextResponse.next();

  const res =
    decision.type === "unauthorized"
      ? NextResponse.json({ error: "locked" }, { status: 401 })
      : NextResponse.redirect(new URL(decision.to, request.url), 307);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export const config = {
  // JS/CSS/font build, manifest, dan ikon tidak pernah butuh sandi (PWA tetap bisa dipasang & dibuka).
  matcher: ["/((?!_next/static/|manifest\\.json$|icon-192\\.png$|icon-512\\.png$|icon\\.svg$|apple-touch-icon\\.png$|favicon).*)"],
};
