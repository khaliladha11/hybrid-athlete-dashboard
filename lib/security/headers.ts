/**
 * Header keamanan (0.16, docs/RELEASE-1.0.md #4). Murni, dipakai `proxy.ts` (CSP dengan nonce per request) dan
 * `next.config.ts` (header statis untuk semua respons).
 *
 * - Script: hanya yang membawa nonce (script Next.js dan script tema di layout) dan yang dimuat olehnya
 *   (`'strict-dynamic'`). Mode pengembangan menambah `'unsafe-eval'` (HMR React).
 * - Style: `'unsafe-inline'` karena atribut `style` React dan font next/font; tanpa nonce di style-src supaya
 *   `'unsafe-inline'` tetap berlaku.
 * - Gambar, font, koneksi, worker, manifest: hanya situs sendiri (data intervals.icu & sinkron lewat server).
 * - Tidak bisa dibingkai situs lain; form hanya ke situs sendiri; tanpa plugin.
 */

export function contentSecurityPolicy(nonce: string, dev = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** Header statis untuk semua respons. */
export const SECURITY_HEADERS: readonly { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Aplikasi tidak memakai kamera, mikrofon, lokasi, pembayaran, USB, atau sensor gerak.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()" },
];

/** Nonce acak base64 (128 bit). */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
