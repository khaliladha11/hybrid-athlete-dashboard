/**
 * Konfigurasi sandi aplikasi (docs/SYNC.md §3). Murni terhadap `env` supaya bisa diuji dan dipakai proxy.
 * Nilai sandi & secret hanya hidup di server: tidak pernah dikirim ke browser, log, atau pesan error.
 */

export const MIN_PASSCODE_CHARS = 8;
export const MIN_SECRET_BYTES = 32;

export type PasscodeOn = { state: "on"; passcode: string; secret: string };
export type PasscodeConfig =
  | { state: "off" }
  /** Sandi diisi tapi tidak valid → gagal tertutup: semua terkunci, sandi apa pun ditolak. */
  | { state: "misconfigured"; reason: "passcode" | "secret" }
  | PasscodeOn;

type Env = Record<string, string | undefined>;

/** `APP_PASSCODE` kosong → "off" (perilaku 0.11). Spasi di tepi diabaikan. */
export function passcodeConfig(env: Env = process.env): PasscodeConfig {
  const passcode = (env.APP_PASSCODE ?? "").trim();
  if (!passcode) return { state: "off" };
  if ([...passcode].length < MIN_PASSCODE_CHARS) return { state: "misconfigured", reason: "passcode" };
  const secret = (env.SESSION_SECRET ?? "").trim();
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) return { state: "misconfigured", reason: "secret" };
  return { state: "on", passcode, secret };
}
