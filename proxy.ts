import { NextResponse, type NextRequest } from "next/server";
import { decide } from "@/lib/auth/access";
import { passcodeConfig } from "@/lib/auth/config";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { contentSecurityPolicy, newNonce } from "@/lib/security/headers";

/**
 * Proxy (Next.js 16: "middleware" bernama "proxy", runtime Node.js).
 * - Kunci sandi aplikasi (docs/SYNC.md §3). Tanpa APP_PASSCODE semua request diteruskan (perilaku 0.11). Ini lapisan
 *   pertama; pengambilan data intervals.icu & route API memeriksa sesi lagi (`lib/auth/guard.ts`).
 * - CSP dengan nonce per request (0.16, `lib/security/headers.ts`): nonce diteruskan lewat header request supaya
 *   Next.js memasangnya di script-nya sendiri dan layout memasangnya di script tema.
 */
export function proxy(request: NextRequest) {
  const nonce = newNonce();
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const withCsp = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return withCsp(NextResponse.next({ request: { headers } }));
  };

  const cfg = passcodeConfig();
  if (cfg.state === "off") return forward();

  const { pathname, search } = request.nextUrl;
  const decision = decide({ path: pathname, search, cfg, token: request.cookies.get(SESSION_COOKIE)?.value });
  if (decision.type === "next") return forward();

  const res =
    decision.type === "unauthorized"
      ? NextResponse.json({ error: "locked" }, { status: 401 })
      : NextResponse.redirect(new URL(decision.to, request.url), 307);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return withCsp(res);
}

export const config = {
  // JS/CSS/font build, manifest, ikon, dan service worker (0.16) tidak pernah butuh sandi; halaman /offline lewat
  // PUBLIC_PATHS. Header keamanan statis untuk semua respons ada di next.config.ts.
  matcher: ["/((?!_next/static/|manifest\\.json$|icon-192\\.png$|icon-512\\.png$|icon\\.svg$|apple-touch-icon\\.png$|favicon|sw\\.js$|sw-rules\\.js$).*)"],
};
