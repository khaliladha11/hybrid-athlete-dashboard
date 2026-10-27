import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tombstone } from "@/lib/log-entries";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { availability, handleGet, handlePost, MAX_BODY_BYTES } from "@/lib/sync/server";
import { memorySyncStore, redisSyncStore, syncKey, WRITE_SCRIPT, type SyncStore } from "@/lib/sync/store";

vi.mock("server-only", () => ({}));
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined) }),
}));

// Data uji fiktif.
const PASS = "kunci-uji-123";
const SECRET = "s".repeat(40);
const entry = (id: string, date = "2026-01-05"): LogEntry => ({
  id,
  date,
  movement: "Goblet Squat",
  load: 10,
  value: 10,
  valueUnit: "reps",
  target: { lo: 8, hi: 10 },
  rpe: 6,
  targetRpe: 7,
  deload: false,
  blockIndex: 1,
  updatedAt: `${date}T08:00:00.000Z`,
});

/** Redis tiruan di memori yang menjawab REST /pipeline: HGETALL, EVAL (skrip tulis), INCR/EXPIRE/TTL/GET/DEL. */
function fakeRedis() {
  const hashes = new Map<string, Record<string, string>>();
  const calls: unknown[][][] = [];
  const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const cmds = JSON.parse(String(init?.body)) as unknown[][];
    calls.push(cmds);
    const results = cmds.map(([op, ...args]) => {
      if (op === "HGETALL") return Object.entries(hashes.get(String(args[0])) ?? {}).flat();
      if (op === "EVAL") {
        expect(args[0]).toBe(WRITE_SCRIPT);
        const key = String(args[2]);
        const h = hashes.get(key) ?? {};
        const rev = Number(h.rev ?? 0);
        if (rev !== Number(args[3])) return [0, rev, h.data ?? ""];
        hashes.set(key, { rev: String(rev + 1), data: String(args[4]) });
        return [1, rev + 1, ""];
      }
      return null;
    });
    return new Response(JSON.stringify(results.map((result) => ({ result }))), { status: 200 });
  });
  return { hashes, calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

function stores(): [string, () => SyncStore & { calls?: unknown[][][] }][] {
  return [
    ["memori", () => memorySyncStore()],
    [
      "Redis tiruan",
      () => {
        const r = fakeRedis();
        return Object.assign(redisSyncStore({ url: "https://redis.example.test", token: "tok-uji" }, r.fetchImpl), { calls: r.calls });
      },
    ],
  ];
}

describe.each(stores())("store sinkron (%s)", (_name, make) => {
  it("bagian kosong: rev 0 & data null", async () => {
    const s = make();
    const all = await s.readAll();
    expect(Object.keys(all)).toEqual(["profile", "settings", "program", "preferences", "onboarding", "log", "prs"]);
    expect(all.profile).toEqual({ rev: 0, epoch: 0, data: null });
  });

  it("baseRev cocok → simpan & rev naik; tidak cocok → konflik dengan versi terbaru", async () => {
    const s = make();
    expect(await s.writeMany([{ part: "profile", baseRev: 0, data: { name: "A" } }])).toEqual([{ part: "profile", ok: true, rev: 1 }]);
    expect(await s.writeMany([{ part: "profile", baseRev: 0, data: { name: "B" } }])).toEqual([{ part: "profile", ok: false, rev: 1, data: { name: "A" } }]);
    expect(await s.writeMany([{ part: "profile", baseRev: 1, data: { name: "B" } }])).toEqual([{ part: "profile", ok: true, rev: 2 }]);
    expect((await s.readAll()).profile).toEqual({ rev: 2, epoch: 0, data: { name: "B" } });
  });

  it("beberapa bagian dalam satu tulis; baca semua bagian = satu request", async () => {
    const s = make();
    const r = await s.writeMany([
      { part: "program", baseRev: 0, data: "p" },
      { part: "log", baseRev: 0, data: [entry("a")] },
    ]);
    expect(r.every((x) => x.ok)).toBe(true);
    const before = s.calls?.length ?? 0;
    expect((await s.readAll()).log.data).toEqual([entry("a")]);
    if (s.calls) expect(s.calls.length - before).toBe(1);
  });
});

describe("Redis: kunci & perintah", () => {
  it("satu hash per bagian; token hanya di header", async () => {
    const r = fakeRedis();
    const s = redisSyncStore({ url: "https://redis.example.test", token: "tok-uji" }, r.fetchImpl);
    await s.writeMany([{ part: "settings", baseRev: 0, data: { conditions: [] } }]);
    expect([...r.hashes.keys()]).toEqual([syncKey("settings")]);
    expect(JSON.stringify(r.calls)).not.toContain("tok-uji");
  });
});

describe("logika /api/sync", () => {
  it("GET mengembalikan semua bagian; data rusak di server dianggap kosong", async () => {
    const s = memorySyncStore();
    s.raw.set("profile", { rev: 3, data: '"bukan objek"' });
    s.raw.set("log", { rev: 1, data: JSON.stringify([entry("a"), { rusak: 1 }]) });
    const out = await handleGet(s, baseProfile);
    expect(out.parts.profile).toEqual({ rev: 3, epoch: 0, data: null });
    expect(out.parts.log).toEqual({ rev: 1, epoch: 0, data: [entry("a")] });
    expect(out.parts.preferences).toEqual({ rev: 0, epoch: 0, data: {} });
  });

  it("POST memvalidasi tiap bagian; payload rusak atau bagian ganda ditolak", async () => {
    const s = memorySyncStore();
    const post = (body: unknown) => handlePost(s, JSON.stringify(body), baseProfile);
    for (const bad of [
      {},
      { writes: [] },
      { writes: [{ part: "rahasia", baseRev: 0, data: 1 }] },
      { writes: [{ part: "profile", baseRev: -1, data: {} }] },
      { writes: [{ part: "profile", baseRev: 0, data: "x" }] },
      { writes: [{ part: "log", baseRev: 0, data: "x" }] },
      { writes: [{ part: "profile", baseRev: 0, data: {} }, { part: "profile", baseRev: 0, data: {} }] },
    ]) {
      expect((await post(bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await handlePost(s, "{bukan json", baseProfile)).status).toBe(400);
    expect((await handlePost(s, "x".repeat(MAX_BODY_BYTES + 1), baseProfile)).status).toBe(413);
    expect(s.raw.size).toBe(0);
  });

  it("POST membersihkan field asing dan memadatkan tombstone lama", async () => {
    const s = memorySyncStore();
    const now = Date.parse("2026-06-01T00:00:00Z");
    const out = await handlePost(
      s,
      JSON.stringify({
        writes: [
          { part: "profile", baseRev: 0, data: { name: "Alex", script: "<x>" } },
          { part: "log", baseRev: 0, data: [tombstone(entry("old"), "2026-01-01T00:00:00.000Z"), entry("live")] },
        ],
      }),
      baseProfile,
      now,
    );
    expect(out.status).toBe(200);
    expect(JSON.parse(s.raw.get("profile")!.data)).toEqual({ name: "Alex" });
    expect(JSON.parse(s.raw.get("log")!.data).map((e: LogEntry) => e.id)).toEqual(["live"]);
  });
});

describe("route /api/sync & /api/status", () => {
  const setEnv = (opts: { passcode?: boolean; redis?: boolean }) => {
    vi.stubEnv("APP_PASSCODE", opts.passcode ? PASS : "");
    vi.stubEnv("SESSION_SECRET", opts.passcode ? SECRET : "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", opts.redis ? "https://redis.example.test" : "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", opts.redis ? "tok-uji" : "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
  };
  const unlock = async () => {
    const { signSession } = await import("@/lib/auth/session");
    const { passcodeConfig } = await import("@/lib/auth/config");
    cookieJar.set("ha_session", signSession(passcodeConfig() as never));
  };

  beforeEach(() => cookieJar.clear());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("tanpa sandi atau tanpa database → tidak aktif, database tidak dipanggil", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { GET } = await import("@/app/api/sync/route");
    setEnv({ passcode: false, redis: true });
    expect(await (await GET()).json()).toEqual({ enabled: false, reason: "no-passcode" });
    setEnv({ passcode: true, redis: false });
    await unlock();
    expect(await (await GET()).json()).toEqual({ enabled: false, reason: "no-database" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("aktif tanpa sesi → 401; dengan sesi → data", async () => {
    const r = fakeRedis();
    vi.stubGlobal("fetch", r.fetchImpl);
    setEnv({ passcode: true, redis: true });
    const { GET, POST } = await import("@/app/api/sync/route");
    expect((await GET()).status).toBe(401);
    await unlock();
    const post = await POST(new Request("https://app.example.test/api/sync", { method: "POST", body: JSON.stringify({ writes: [{ part: "program", baseRev: 0, data: "p" }] }) }));
    expect(await post.json()).toEqual({ enabled: true, results: [{ part: "program", ok: true, rev: 1 }] });
    const got = await (await GET()).json();
    expect(got.parts.program).toEqual({ rev: 1, epoch: 0, data: "p" });
    expect(JSON.stringify(got)).not.toContain("tok-uji");
  });

  it("/api/status hanya boolean, tanpa nilai env", async () => {
    const { GET } = await import("@/app/api/status/route");
    setEnv({ passcode: true, redis: true });
    const body = await GET().json();
    expect(body).toEqual({ passcode: true, database: true, sync: true });
    expect(JSON.stringify(body)).not.toMatch(/kunci-uji|tok-uji|redis\.example/);
    setEnv({ passcode: false, redis: false });
    expect(await GET().json()).toEqual({ passcode: false, database: false, sync: false });
  });

  it("sandi diisi tapi tidak lengkap → sinkron tidak aktif", () => {
    expect(availability({ state: "misconfigured", reason: "secret" }, { url: "u", token: "t" })).toEqual({ passcode: false, database: true, sync: false });
  });
});
