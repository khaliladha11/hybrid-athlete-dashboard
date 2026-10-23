import "server-only";
import { cookies } from "next/headers";
import { passcodeConfig } from "./config";
import { SESSION_COOKIE, verifySession } from "./session";

/**
 * Lapisan kedua di belakang `proxy.ts`: dipanggil sebelum data intervals.icu diambil,
 * supaya data tidak pernah dirender untuk request tanpa sesi walau matcher proxy berubah.
 */
export async function isRequestUnlocked(): Promise<boolean> {
  const cfg = passcodeConfig();
  if (cfg.state === "off") return true;
  if (cfg.state !== "on") return false;
  return verifySession(cfg, (await cookies()).get(SESSION_COOKIE)?.value);
}

export function isPasscodeEnabled(): boolean {
  return passcodeConfig().state !== "off";
}
