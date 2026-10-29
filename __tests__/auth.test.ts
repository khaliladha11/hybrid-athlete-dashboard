import { describe, expect, it, vi } from "vitest";
import { decide, isPublicPath, sanitizeNext } from "@/lib/auth/access";
import { passcodeConfig, type PasscodeOn } from "@/lib/auth/config";
import { clientKey, MAX_FAILS, memoryStore, redisEnv, redisStore, WINDOW_SEC, withFallback, type RateStore } from "@/lib/auth/rate-limit";
import { checkPasscode, clearedSessionCookie, SESSION_TTL_SEC, sessionCookie, signSession, verifySession } from "@/lib/auth/session";
import { attemptUnlock } from "@/lib/auth/unlock";

// Data uji fiktif; bukan sandi siapa pun.
const SECRET = "s".repeat(40);
const ENV = { APP_PASSCODE: "kunci-uji-123", SESSION_SECRET: SECRET };
const cfg = passcodeConfig(ENV) as PasscodeOn;
const NOW = Date.UTC(2026, 0, 5, 3, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

vi.mock("node:crypto", async (orig) => {
  const actual = await orig<typeof import("node:crypto")>();
  return { ...actual, default: actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) };
});

describe("konfigurasi sandi", () => {
  it("APP_PASSCODE kosong → off (perilaku 0.11)", () => {
    expect(passcodeConfig({})).toEqual({ state: "off" });
    expect(passcodeConfig({ APP_PASSCODE: "   ", SESSION_SECRET: SECRET })).toEqual({ state: "off" });
  });

  it("sandi < 8 karakter atau secret < 32 byte → misconfigured (gagal tertutup)", () => {
    expect(passcodeConfig({ APP_PASSCODE: "1234567", SESSION_SECRET: SECRET })).toEqual({ state: "misconfigured", reason: "passcode" });
    expect(passcodeConfig({ APP_PASSCODE: "12345678", SESSION_SECRET: "x".repeat(31) })).toEqual({ state: "misconfigured", reason: "secret" });
    expect(passcodeConfig({ APP_PASSCODE: "12345678" })).toEqual({ state: "misconfigured", reason: "secret" });
  });

  it("valid → on", () => {
    expect(cfg.state).toBe("on");
  });
});

describe("sesi", () => {
  it("valid selama 90 hari, lalu kedaluwarsa", () => {
    const t = signSession(cfg, NOW);
    expect(verifySession(cfg, t, NOW)).toBe(true);
    expect(verifySession(cfg, t, NOW + 89 * DAY)).toBe(true);
    expect(verifySession(cfg, t, NOW + SESSION_TTL_SEC * 1000 + 1)).toBe(false);
  });

  it("tanda tangan dipalsukan, payload diubah, atau format rusak → ditolak", () => {
    const t = signSession(cfg, NOW);
    const [v, exp, sig] = t.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(verifySession(cfg, `${v}.${exp}.${flipped}`, NOW)).toBe(false);
    expect(verifySession(cfg, `${v}.${Number(exp) + 60}.${sig}`, NOW)).toBe(false);
    for (const bad of [undefined, "", "v1", "v2.1.abc", `${t}.x`, "v1.abc." + sig]) expect(verifySession(cfg, bad, NOW)).toBe(false);
  });

  it("mengganti sandi atau secret membatalkan semua sesi lama", () => {
    const t = signSession(cfg, NOW);
    const newPass = passcodeConfig({ ...ENV, APP_PASSCODE: "sandi-baru-456" }) as PasscodeOn;
    const newSecret = passcodeConfig({ ...ENV, SESSION_SECRET: "t".repeat(40) }) as PasscodeOn;
    expect(verifySession(newPass, t, NOW)).toBe(false);
    expect(verifySession(newSecret, t, NOW)).toBe(false);
  });

  it("cookie tidak memuat sandi maupun secret", () => {
    const t = signSession(cfg, NOW);
    expect(t).not.toContain(cfg.passcode);
    expect(t).not.toContain(SECRET);
    expect(Buffer.from(t.split(".")[2], "base64url").toString("latin1")).not.toContain(cfg.passcode);
  });

  it("atribut cookie: httpOnly, Secure, SameSite=Lax, 90 hari; kunci → Max-Age 0", () => {
    expect(sessionCookie("x", true)).toEqual({ name: "ha_session", value: "x", httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_SEC });
    expect(SESSION_TTL_SEC).toBe(90 * 24 * 60 * 60);
    expect(clearedSessionCookie(true)).toMatchObject({ value: "", maxAge: 0, httpOnly: true });
  });
});

describe("cek sandi", () => {
  it("benar, salah, panjang berbeda; spasi di tepi diabaikan", () => {
    expect(checkPasscode(cfg, "kunci-uji-123")).toBe(true);
    expect(checkPasscode(cfg, " kunci-uji-123 ")).toBe(true);
    expect(checkPasscode(cfg, "kunci-uji-124")).toBe(false);
    expect(checkPasscode(cfg, "k")).toBe(false);
    expect(checkPasscode(cfg, "")).toBe(false);
  });

  it("memakai perbandingan waktu-konstan", async () => {
    const crypto = await import("node:crypto");
    const spy = vi.mocked(crypto.timingSafeEqual);
    spy.mockClear();
    checkPasscode(cfg, "salah-total");
    verifySession(cfg, signSession(cfg, NOW), NOW);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("batas percobaan", () => {
  const fakeClock = () => {
    let t = NOW;
    return { now: () => t, advance: (ms: number) => (t += ms) };
  };

  it("memori: 5 gagal dalam 15 menit, lalu terbuka lagi setelah jendela habis", async () => {
    const clock = fakeClock();
    const s = memoryStore(clock.now);
    for (let i = 1; i <= MAX_FAILS; i++) expect((await s.hit("a")).count).toBe(i);
    expect((await s.peek("a")).ttlSec).toBe(WINDOW_SEC);
    clock.advance(WINDOW_SEC * 1000);
    expect(await s.peek("a")).toEqual({ count: 0, ttlSec: 0 });
  });

  it("IP berbeda dihitung terpisah; IP mentah tidak ada di kunci", () => {
    const k1 = clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    const k2 = clientKey(new Headers({ "x-real-ip": "198.51.100.2" }));
    expect(k1).not.toBe(k2);
    expect(k1).toMatch(/^ha:unlock:[0-9a-f]{32}$/);
    expect(k1).not.toContain("203.0.113.7");
  });

  it("Redis lewat REST pipeline: INCR + EXPIRE NX + TTL, header Bearer", async () => {
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const fake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      calls.push({ url: String(url), body, auth: new Headers(init?.headers).get("authorization") });
      const results = body[0][0] === "INCR" ? [{ result: 3 }, { result: 1 }, { result: 812 }] : body[0][0] === "GET" ? [{ result: "3" }, { result: 812 }] : [{ result: 1 }];
      return new Response(JSON.stringify(results), { status: 200 });
    });
    const s = redisStore({ url: "https://redis.example.test", token: "tok-uji" }, fake as unknown as typeof fetch);
    expect(await s.hit("k")).toEqual({ count: 3, ttlSec: 812 });
    expect(await s.peek("k")).toEqual({ count: 3, ttlSec: 812 });
    await s.reset("k");
    expect(calls[0]).toEqual({ url: "https://redis.example.test/pipeline", body: [["INCR", "k"], ["EXPIRE", "k", WINDOW_SEC, "NX"], ["TTL", "k"]], auth: "Bearer tok-uji" });
    expect(calls[2].body).toEqual([["DEL", "k"]]);
  });

  it("Redis gagal → jatuh ke memori, kunci tidak terbuka", async () => {
    const broken: RateStore = { hit: () => Promise.reject(new Error("down")), peek: () => Promise.reject(new Error("down")), reset: () => Promise.reject(new Error("down")) };
    const s = withFallback(broken, memoryStore(() => NOW));
    await s.hit("x");
    expect((await s.peek("x")).count).toBe(1);
  });

  it("env Redis: kedua penamaan didukung", () => {
    expect(redisEnv({ KV_REST_API_URL: "https://a.test/", KV_REST_API_TOKEN: "t" })).toEqual({ url: "https://a.test", token: "t" });
    expect(redisEnv({ UPSTASH_REDIS_REST_URL: "https://b.test", UPSTASH_REDIS_REST_TOKEN: "u" })).toEqual({ url: "https://b.test", token: "u" });
    expect(redisEnv({ KV_REST_API_URL: "https://a.test" })).toBeNull();
  });
});

describe("POST /api/unlock (logika)", () => {
  const run = (passcode: unknown, store: RateStore, c = passcodeConfig(ENV)) => attemptUnlock({ cfg: c, passcode, store, key: "ip", nowMs: NOW });

  it("benar → 204 dengan token sesi valid; hitungan gagal di-reset", async () => {
    const store = memoryStore(() => NOW);
    await run("salah", store);
    const r = await run("kunci-uji-123", store);
    expect(r.status).toBe(204);
    if (r.status === 204) expect(verifySession(cfg, r.token, NOW)).toBe(true);
    expect((await store.peek("ip")).count).toBe(0);
  });

  it("salah 6 kali: 4 kali sisa percobaan, ke-5 dan ke-6 diblokir; sandi benar pun ditolak saat diblokir", async () => {
    const store = memoryStore(() => NOW);
    const out = [];
    for (let i = 0; i < 6; i++) out.push(await run("salah", store));
    expect(out.map((r) => r.status)).toEqual([401, 401, 401, 401, 429, 429]);
    expect(out.slice(0, 4).map((r) => ("body" in r ? r.body : null))).toEqual([4, 3, 2, 1].map((remaining) => ({ error: "wrong", remaining })));
    expect(out[5]).toEqual({ status: 429, body: { error: "rate_limited", retryAfterSec: WINDOW_SEC } });
    expect((await run("kunci-uji-123", store)).status).toBe(429);
  });

  it("respons tidak pernah memuat sandi atau secret", async () => {
    const store = memoryStore(() => NOW);
    for (const p of ["salah", "kunci-uji-123", 42, null]) {
      const text = JSON.stringify(await run(p, store));
      expect(text).not.toContain("kunci-uji-123");
      expect(text).not.toContain(SECRET);
    }
  });

  it("sandi tidak aktif → 404; konfigurasi tidak lengkap → 503 untuk sandi apa pun", async () => {
    const store = memoryStore(() => NOW);
    expect(await run("x", store, passcodeConfig({}))).toEqual({ status: 404, body: { error: "off" } });
    expect(await run("12345678", store, passcodeConfig({ APP_PASSCODE: "12345678" }))).toEqual({ status: 503, body: { error: "misconfigured" } });
  });
});

describe("keputusan proxy", () => {
  const token = signSession(cfg, NOW);
  const d = (path: string, c = passcodeConfig(ENV), t?: string, search = "") => decide({ path, search, cfg: c, token: t, nowMs: NOW });

  it("sandi tidak aktif → semua lanjut (identik 0.11)", () => {
    for (const p of ["/", "/setting", "/api/connection", "/unlock"]) expect(d(p, passcodeConfig({}))).toEqual({ type: "next" });
  });

  it("aset PWA & halaman unlock terbuka tanpa sesi", () => {
    for (const p of ["/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/favicon.svg", "/_next/static/chunks/a.js", "/_next/static/media/f.woff2", "/api/unlock", "/unlock"]) {
      expect(d(p), p).toEqual({ type: "next" });
    }
    expect(isPublicPath("/movements/push-up/0.webp")).toBe(false);
  });

  it("service worker & halaman offline (0.16) terbuka tanpa sesi; API tetap terkunci", () => {
    for (const p of ["/sw.js", "/sw-rules.js", "/offline"]) expect(d(p), p).toEqual({ type: "next" });
    for (const p of ["/api/sync", "/api/activities"]) expect(d(p), p).toEqual({ type: "unauthorized" });
    expect(d("/strength/sesi")).toEqual({ type: "redirect", to: "/unlock?next=%2Fstrength%2Fsesi" });
  });

  it("tanpa sesi: halaman → /unlock?next, API → 401", () => {
    expect(d("/")).toEqual({ type: "redirect", to: "/unlock" });
    expect(d("/run", undefined, undefined, "?d=45")).toEqual({ type: "redirect", to: "/unlock?next=%2Frun%3Fd%3D45" });
    expect(d("/api/connection")).toEqual({ type: "unauthorized" });
    expect(d("/movements/push-up/0.webp")).toEqual({ type: "redirect", to: "/unlock?next=%2Fmovements%2Fpush-up%2F0.webp" });
  });

  it("dengan sesi valid: lanjut; /unlock diarahkan ke tujuan yang aman", () => {
    expect(d("/setting", undefined, token)).toEqual({ type: "next" });
    expect(d("/api/connection", undefined, token)).toEqual({ type: "next" });
    expect(d("/unlock", undefined, token, "?next=%2Fprogram")).toEqual({ type: "redirect", to: "/program" });
    expect(d("/unlock", undefined, token, "?next=https%3A%2F%2Fevil.test")).toEqual({ type: "redirect", to: "/" });
  });

  it("konfigurasi tidak lengkap → semua terkunci, cookie apa pun ditolak", () => {
    const mis = passcodeConfig({ APP_PASSCODE: "12345678" });
    expect(d("/", mis, token)).toEqual({ type: "redirect", to: "/unlock" });
    expect(d("/api/connection", mis, token)).toEqual({ type: "unauthorized" });
  });

  it("sanitizeNext hanya menerima path di situs ini", () => {
    for (const bad of [null, "", "//evil.test", "/\\evil.test", "https://evil.test", "javascript:alert(1)", "/unlock", "/unlock?next=/", "/api/sync", "/a\nb", "/" + "a".repeat(600)]) {
      expect(sanitizeNext(bad), String(bad)).toBe("/");
    }
    expect(sanitizeNext("/activity/abc?x=1#h")).toBe("/activity/abc?x=1#h");
  });
});
