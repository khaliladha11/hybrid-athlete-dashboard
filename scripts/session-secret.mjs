#!/usr/bin/env node
/**
 * Mencetak SESSION_SECRET acak (32 byte, base64url, 43 karakter) ke terminal. Tidak menyimpan apa pun: salin nilainya
 * sendiri ke Vercel › Settings › Environment Variables atau `.env.local`. Jangan tempel ke chat.
 *
 * Pakai: npm run secret
 */
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

export const sessionSecret = () => randomBytes(32).toString("base64url");

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(sessionSecret());
}
