import { NextResponse } from "next/server";
import { isRequestUnlocked } from "@/lib/auth/guard";
import { MAX_SEND_BODY_BYTES, handleSend, parseSendBody, type SendResponse } from "@/lib/intervals/calendar";
import { getIntervalsConfig, intervalsRequest } from "@/lib/intervals/client";

// Kirim / perbarui / hapus workout di kalender intervals.icu (0.17). Key & athlete ID tetap di server; respons hanya
// status atau kode error (lib/intervals/calendar.ts). Tanpa key (Demo Mode) tidak ada panggilan keluar.
export const dynamic = "force-dynamic";

const reply = (body: SendResponse, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });

export async function POST(request: Request) {
  if (!(await isRequestUnlocked())) return reply({ status: "error", code: "LOCKED" }, 401);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_SEND_BODY_BYTES) return reply({ status: "error", code: "INVALID" }, 413);
  const text = await request.text();
  if (text.length > MAX_SEND_BODY_BYTES) return reply({ status: "error", code: "INVALID" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply({ status: "error", code: "INVALID" }, 400);
  }
  const req = parseSendBody(raw);
  if (!req) return reply({ status: "error", code: "INVALID" }, 400);

  const { hasKey, athleteId } = getIntervalsConfig();
  if (!hasKey) return reply({ status: "demo" });

  const out = await handleSend(req, (method, path, opts) => intervalsRequest(method, path, opts), athleteId);
  if (out.status !== "error") return reply(out);
  return reply(out, out.code === "LOCKED" ? 401 : out.code === "RATE_LIMITED" ? 429 : 502);
}
