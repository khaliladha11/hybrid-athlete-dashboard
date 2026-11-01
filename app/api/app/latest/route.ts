import { fetchLatestRelease } from "@/lib/app-release";

// Rilis stabil terbaru upstream untuk Setting › Tentang & versi (1.0). Di balik sandi seperti /api lain; tanpa token.
export async function GET() {
  const latest = await fetchLatestRelease();
  return Response.json(latest ? { latest } : {}, { headers: { "Cache-Control": "private, max-age=3600" } });
}
