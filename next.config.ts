import { SECURITY_HEADERS } from "./lib/security/headers";
import type { NextConfig } from "next";

/** Versi build untuk service worker (0.16): commit di Vercel, selain itu waktu build. */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || String(Date.now());

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // Service worker selalu diperiksa ulang supaya versi baru terdeteksi.
  // Header keamanan statis untuk semua respons (0.16); CSP dengan nonce dipasang per request di proxy.ts.
  async headers() {
    return [
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
      ...["/sw.js", "/sw-rules.js"].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "no-cache, max-age=0" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      })),
    ];
  },
  // Halaman Log dipecah: riwayat → Strength, cadangan → Setting (0.8).
  async redirects() {
    return [{ source: "/log", destination: "/strength#riwayat", permanent: false }];
  },
};

export default nextConfig;
