import { NextResponse } from "next/server";
import { clearedSessionCookie } from "@/lib/auth/session";

// "Kunci perangkat ini": hapus cookie sesi (httpOnly, jadi hanya server yang bisa).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const res = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store, max-age=0" } });
  res.cookies.set(clearedSessionCookie(new URL(request.url).protocol === "https:"));
  return res;
}
