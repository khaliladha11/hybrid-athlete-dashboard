import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Modul server memakai `import "server-only"`; di test Node cukup diganti modul kosong.
vi.mock("server-only", () => ({}));
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined) }),
}));

// Data uji fiktif; bukan sandi siapa pun.
const PASS = "kunci-uji-123";
const SECRET = "s".repeat(40);

function setEnv(on: boolean) {
  if (on) {
    vi.stubEnv("APP_PASSCODE", PASS);
    vi.stubEnv("SESSION_SECRET", SECRET);
  } else {
    vi.stubEnv("APP_PASSCODE", "");
  }
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
}

const post = (body: unknown, ip = "203.0.113.9") =>
  new Request("https://app.example.test/api/unlock", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  cookieJar.clear();
  (globalThis as { __haUnlockMemory?: unknown }).__haUnlockMemory = undefined;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("route /api/unlock", () => {
  it("sandi benar → 204 + cookie httpOnly, Secure, SameSite=Lax, 90 hari; tanpa sandi/secret di respons", async () => {
    setEnv(true);
    const { POST } = await import("@/app/api/unlock/route");
    const res = await POST(post({ passcode: PASS }));
    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^ha_session=v1\.\d+\.[\w-]{43};/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=7776000/);
    expect(cookie).not.toContain(PASS);
    expect(cookie).not.toContain(SECRET);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("salah 5 kali → 429 dengan Retry-After; body tidak pernah memuat sandi", async () => {
    setEnv(true);
    const { POST } = await import("@/app/api/unlock/route");
    const statuses: number[] = [];
    let last: Response | undefined;
    for (let i = 0; i < 6; i++) {
      last = await POST(post({ passcode: "salah" }));
      statuses.push(last.status);
      expect(await last.clone().text()).not.toContain(PASS);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429, 429]);
    expect(Number(last!.headers.get("retry-after"))).toBeGreaterThan(0);
    // IP lain tidak ikut terblokir.
    expect((await POST(post({ passcode: PASS }, "198.51.100.4"))).status).toBe(204);
  });

  it("body rusak dianggap salah, bukan error", async () => {
    setEnv(true);
    const { POST } = await import("@/app/api/unlock/route");
    const bad = new Request("https://app.example.test/api/unlock", { method: "POST", body: "{bukan json" });
    expect((await POST(bad)).status).toBe(401);
  });

  it("/api/lock menghapus cookie", async () => {
    const { POST } = await import("@/app/api/lock/route");
    const res = await POST(new Request("https://app.example.test/api/lock", { method: "POST" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/ha_session=;.*Max-Age=0/i);
  });
});

describe("proxy", () => {
  const req = (path: string, cookie?: string) =>
    new NextRequest(new URL(path, "https://app.example.test"), { headers: cookie ? { cookie } : {} });

  it("APP_PASSCODE kosong → semua diteruskan (identik 0.11)", async () => {
    setEnv(false);
    const { proxy } = await import("@/proxy");
    for (const p of ["/", "/setting", "/api/connection"]) expect(proxy(req(p)).headers.get("x-middleware-next")).toBe("1");
  });

  it("tanpa sesi: halaman → 307 ke /unlock?next, API → 401; aset PWA terbuka", async () => {
    setEnv(true);
    const { proxy } = await import("@/proxy");
    const page = proxy(req("/program"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toBe("https://app.example.test/unlock?next=%2Fprogram");
    expect(page.headers.get("cache-control")).toContain("no-store");
    const api = proxy(req("/api/connection"));
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: "locked" });
    for (const p of ["/manifest.json", "/icon-192.png", "/unlock"]) expect(proxy(req(p)).headers.get("x-middleware-next"), p).toBe("1");
  });

  it("dengan cookie dari /api/unlock → diteruskan", async () => {
    setEnv(true);
    const { POST } = await import("@/app/api/unlock/route");
    const { proxy } = await import("@/proxy");
    const cookie = (await POST(post({ passcode: PASS }))).headers.get("set-cookie")!.split(";")[0];
    expect(proxy(req("/program", cookie)).headers.get("x-middleware-next")).toBe("1");
  });

  it("matcher mengecualikan aset build, manifest, dan ikon", async () => {
    const { config } = await import("@/proxy");
    const re = new RegExp(`^${config.matcher[0]}$`);
    for (const p of ["/_next/static/chunks/a.js", "/manifest.json", "/icon-512.png", "/apple-touch-icon.png", "/favicon.svg"]) expect(re.test(p), p).toBe(false);
    for (const p of ["/", "/run", "/api/connection", "/movements/push-up/0.webp", "/_next/image"]) expect(re.test(p), p).toBe(true);
  });
});

describe("pemeriksaan sesi sebelum intervals.icu", () => {
  it("sandi aktif tanpa sesi → LOCKED, intervals.icu tidak dipanggil", async () => {
    setEnv(true);
    vi.stubEnv("INTERVALS_API_KEY", "key-uji");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { intervalsGet } = await import("@/lib/intervals/client");
    const res = await intervalsGet("/athlete/0");
    expect(res).toMatchObject({ ok: false, error: { code: "LOCKED", status: 401 } });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(res)).not.toContain("key-uji");
  });

  it("dengan sesi valid atau sandi tidak aktif → intervals.icu dipanggil", async () => {
    setEnv(true);
    vi.stubEnv("INTERVALS_API_KEY", "key-uji");
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ id: "i1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { signSession } = await import("@/lib/auth/session");
    const { passcodeConfig } = await import("@/lib/auth/config");
    const { intervalsGet } = await import("@/lib/intervals/client");
    cookieJar.set("ha_session", signSession(passcodeConfig() as never));
    expect((await intervalsGet("/athlete/0")).ok).toBe(true);
    cookieJar.clear();
    setEnv(false);
    expect((await intervalsGet("/athlete/0")).ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
