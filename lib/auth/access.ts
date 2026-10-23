/**
 * Keputusan akses untuk `proxy.ts` (murni, bisa diuji). Aset yang dibutuhkan untuk memasang & membuka
 * PWA tetap terbuka; halaman lain diarahkan ke /unlock, API dijawab 401.
 */
import type { PasscodeConfig } from "./config";
import { verifySession } from "./session";

/** Terbuka tanpa sandi. `/_next/static/*` (JS, CSS, font) dikecualikan lewat matcher dan dicek ulang di sini. */
export const PUBLIC_PATHS: readonly string[] = [
  "/unlock",
  "/api/unlock",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon.ico",
];

export const isPublicPath = (path: string) => PUBLIC_PATHS.includes(path) || path.startsWith("/_next/static/");

/** Tujuan setelah membuka: hanya path di situs ini. URL luar, `//host`, `/\host`, API, dan /unlock → "/". */
export function sanitizeNext(raw: string | null | undefined): string {
  if (!raw || raw.length > 512) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || /[\u0000-\u001f\\]/.test(raw)) return "/";
  if (raw === "/unlock" || raw.startsWith("/unlock?") || raw.startsWith("/api/")) return "/";
  return raw;
}

export type Decision = { type: "next" } | { type: "unauthorized" } | { type: "redirect"; to: string };

export function decide(input: { path: string; search: string; cfg: PasscodeConfig; token?: string; nowMs?: number }): Decision {
  const { path, search, cfg, token, nowMs } = input;
  if (cfg.state === "off") return { type: "next" };
  const unlocked = cfg.state === "on" && verifySession(cfg, token, nowMs);
  if (path === "/unlock") return unlocked ? { type: "redirect", to: sanitizeNext(new URLSearchParams(search).get("next")) } : { type: "next" };
  if (isPublicPath(path) || unlocked) return { type: "next" };
  if (path.startsWith("/api/")) return { type: "unauthorized" };
  const next = sanitizeNext(path + search);
  return { type: "redirect", to: next === "/" ? "/unlock" : `/unlock?next=${encodeURIComponent(next)}` };
}
