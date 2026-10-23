/**
 * Sesi sandi aplikasi: cookie `v1.<exp>.<sig>` bertanda tangan HMAC-SHA256 dengan `SESSION_SECRET`.
 * Tanda tangan menyertakan sidik jari sandi, jadi mengganti sandi (atau secret) membatalkan semua sesi.
 * Sandi tidak pernah masuk cookie. Semua perbandingan memakai `timingSafeEqual`.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PasscodeOn } from "./config";

export const SESSION_COOKIE = "ha_session";
export const SESSION_TTL_SEC = 90 * 24 * 60 * 60;

const TOKEN_RE = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/;

function fingerprint(cfg: PasscodeOn): string {
  return createHmac("sha256", cfg.secret).update(`fp:${cfg.passcode}`).digest().subarray(0, 16).toString("base64url");
}

function signature(cfg: PasscodeOn, exp: number): string {
  return createHmac("sha256", cfg.secret).update(`v1.${exp}.${fingerprint(cfg)}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signSession(cfg: PasscodeOn, nowMs = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + SESSION_TTL_SEC;
  return `v1.${exp}.${signature(cfg, exp)}`;
}

/** Format salah, kedaluwarsa, tanda tangan palsu, atau sandi/secret sudah diganti → false. */
export function verifySession(cfg: PasscodeOn, token: string | undefined, nowMs = Date.now()): boolean {
  const m = token ? TOKEN_RE.exec(token) : null;
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp * 1000 <= nowMs || exp * 1000 > nowMs + (SESSION_TTL_SEC + 60) * 1000) return false;
  return safeEqual(m[2], signature(cfg, exp));
}

/** Waktu konstan: kedua sisi di-hash dulu supaya panjang sandi tidak bocor lewat waktu. */
export function checkPasscode(cfg: PasscodeOn, input: string): boolean {
  const a = createHash("sha256").update(input.trim(), "utf8").digest();
  const b = createHash("sha256").update(cfg.passcode, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Atribut cookie sesi. `secure` false hanya untuk http://localhost saat pengembangan. */
export function sessionCookie(value: string, secure: boolean) {
  return { name: SESSION_COOKIE, value, httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: SESSION_TTL_SEC };
}

export function clearedSessionCookie(secure: boolean) {
  return { ...sessionCookie("", secure), maxAge: 0 };
}
