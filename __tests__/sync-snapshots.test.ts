import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tombstone } from "@/lib/log-entries";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { emptyMeta, syncOnce, type ServerParts, type SyncIO, type SyncMeta } from "@/lib/sync/engine";
import { emptyPart, PART_NAMES, type PartData } from "@/lib/sync/parts";
import { handleGet, handleListSnapshots, handleRestore } from "@/lib/sync/server";
import { beforeRestoreId, dailyId, MAX_SNAPSHOTS, pruneIds, summarize, type SnapshotMeta } from "@/lib/sync/snapshots";
import { memorySyncStore, redisSyncStore, RESTORE_SCRIPT, WRITE_SCRIPT, type SyncStore } from "@/lib/sync/store";

vi.mock("server-only", () => ({}));
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined) }),
}));

// Data fiktif.
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
/** 2026-01-05 10:00 WIB = 03:00 UTC. */
const at = (day: number, hourWib = 10) => new Date(Date.UTC(2026, 0, day, hourWib - 7));

/** Redis tiruan lengkap untuk snapshot & pulihkan. */
function fakeRedis() {
  const hashes = new Map<string, Record<string, string>>();
  const strings = new Map<string, string>();
  const fetchImpl = vi.fn(async (_u: string | URL | Request, init?: RequestInit) => {
    const cmds = JSON.parse(String(init?.body)) as (string | number)[][];
    const results = cmds.map(([op, ...a]) => {
      const k = String(a[0]);
      switch (op) {
        case "HGETALL":
          return Object.entries(hashes.get(k) ?? {}).flat();
        case "EXISTS":
          return strings.has(k) ? 1 : 0;
        case "SET":
          if (a[2] === "NX" && strings.has(k)) return null;
          strings.set(k, String(a[1]));
          return "OK";
        case "GET":
          return strings.get(k) ?? null;
        case "HSET": {
          const h = hashes.get(k) ?? {};
          for (let i = 1; i + 1 < a.length; i += 2) h[String(a[i])] = String(a[i + 1]);
          hashes.set(k, h);
          return 1;
        }
        case "DEL":
          for (const key of a) strings.delete(String(key));
          return a.length;
        case "HDEL": {
          const h = hashes.get(k) ?? {};
          for (const f of a.slice(1)) delete h[String(f)];
          return 1;
        }
        case "EVAL": {
          const n = Number(a[1]);
          const keys = a.slice(2, 2 + n).map(String);
          const argv = a.slice(2 + n).map(String);
          if (a[0] === WRITE_SCRIPT) {
            const h = hashes.get(keys[0]) ?? {};
            const rev = Number(h.rev ?? 0);
            if (rev !== Number(argv[0])) return [0, rev, h.data ?? ""];
            hashes.set(keys[0], { ...h, rev: String(rev + 1), data: argv[1] });
            return [1, rev + 1, ""];
          }
          expect(a[0]).toBe(RESTORE_SCRIPT);
          keys.forEach((key, i) => {
            const h = hashes.get(key) ?? {};
            hashes.set(key, { rev: String(Number(h.rev ?? 0) + 1), epoch: String(Number(h.epoch ?? 0) + 1), data: argv[i] });
          });
          return keys.length;
        }
        default:
          throw new Error(`perintah tidak dikenal ${op}`);
      }
    });
    return new Response(JSON.stringify(results.map((result) => ({ result }))), { status: 200 });
  });
  return { hashes, strings, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const makers: [string, () => SyncStore][] = [
  ["memori", () => memorySyncStore()],
  ["Redis tiruan", () => redisSyncStore({ url: "https://redis.example.test", token: "tok-uji" }, fakeRedis().fetchImpl)],
];

describe("snapshot (murni)", () => {
  it("id harian per tanggal WIB; ringkasan tanpa data mentah", () => {
    expect(dailyId("2026-01-05")).toBe("daily-2026-01-05");
    expect(beforeRestoreId("2026-01-05T03:04:05.678Z")).toBe("before-restore-20260105030405678");
    const s = summarize({
      profile: { rev: 1, data: { name: "Alex" } },
      settings: { rev: 0, data: null },
      program: { rev: 1, data: "p" },
      preferences: { rev: 0, data: {} },
      onboarding: { rev: 0, data: null },
      log: { rev: 1, data: [entry("a"), tombstone(entry("b"), "2026-01-06T00:00:00.000Z")] },
      prs: { rev: 0, data: [] },
      sessions: { rev: 0, data: [] },
      checkins: { rev: 0, data: [] },
    });
    expect(s).toEqual({ logEntries: 1, profile: true, settings: false, program: true });
    expect(JSON.stringify(s)).not.toContain("Alex");
  });

  it("retensi: 7 terbaru dari semua jenis", () => {
    const metas: SnapshotMeta[] = Array.from({ length: 9 }, (_, i) => ({
      id: `daily-2026-01-0${i + 1}`,
      kind: "daily",
      createdAt: `2026-01-0${i + 1}T00:00:00.000Z`,
      summary: { logEntries: 0, profile: false, settings: false, program: false },
    }));
    expect(pruneIds(metas)).toEqual(["daily-2026-01-02", "daily-2026-01-01"]);
    expect(pruneIds(metas.slice(0, MAX_SNAPSHOTS))).toEqual([]);
  });
});

describe.each(makers)("snapshot harian & pulihkan (%s)", (_n, make) => {
  async function seeded() {
    const store = make();
    await store.writeMany([
      { part: "profile", baseRev: 0, data: { name: "Alex" } },
      { part: "log", baseRev: 0, data: [entry("a"), entry("b", "2026-01-06")] },
    ]);
    return store;
  }

  it("server kosong: tidak ada snapshot", async () => {
    const store = make();
    await handleGet(store, baseProfile, at(5));
    expect(await store.listSnapshots()).toEqual([]);
  });

  it("sekali per hari WIB, dibuat sebelum tulisan hari itu", async () => {
    const store = await seeded();
    await handleGet(store, baseProfile, at(5, 6));
    await store.writeMany([{ part: "program", baseRev: 0, data: "p" }]);
    await handleGet(store, baseProfile, at(5, 23)); // masih 5 Jan WIB
    let list = (await handleListSnapshots(store)).snapshots;
    expect(list.map((s) => s.id)).toEqual(["daily-2026-01-05"]);
    expect(list[0].summary).toEqual({ logEntries: 2, profile: true, settings: false, program: false });
    await handleGet(store, baseProfile, at(6, 0)); // 00:00 WIB 6 Jan = 17:00 UTC 5 Jan
    list = (await handleListSnapshots(store)).snapshots;
    expect(list.map((s) => s.id)).toEqual(["daily-2026-01-06", "daily-2026-01-05"]);
    expect(list[0].summary.program).toBe(true);
  });

  it("menyimpan 7 terbaru", async () => {
    const store = await seeded();
    for (let d = 1; d <= 9; d++) await handleGet(store, baseProfile, at(d));
    const ids = (await handleListSnapshots(store)).snapshots.map((s) => s.id);
    expect(ids).toHaveLength(MAX_SNAPSHOTS);
    expect(ids[0]).toBe("daily-2026-01-09");
    expect(ids).not.toContain("daily-2026-01-02");
    expect(await store.getSnapshot("daily-2026-01-01")).toBeNull();
  });

  it("pulihkan membuat snapshot keadaan sekarang dulu, rev & epoch naik; batalkan mengembalikan keadaan semula", async () => {
    const store = await seeded();
    await handleGet(store, baseProfile, at(5));
    // Entri "a" dihapus setelah snapshot.
    const cur = await store.readAll();
    await store.writeMany([{ part: "log", baseRev: cur.log.rev, data: [tombstone(entry("a"), "2026-01-05T05:00:00.000Z"), entry("b", "2026-01-06")] }]);

    const r = await handleRestore(store, JSON.stringify({ id: "daily-2026-01-05" }), baseProfile, at(5, 12));
    expect(r.status).toBe(200);
    if (r.status !== 200) return;
    const after = await store.readAll();
    expect(after.log.epoch).toBe(1);
    expect(after.log.rev).toBe(cur.log.rev + 2);
    expect((after.log.data as LogEntry[]).find((e) => e.id === "a")?.deletedAt).toBeUndefined();
    const undo = (await handleListSnapshots(store)).snapshots.find((s) => s.id === r.body.undoId);
    expect(undo?.kind).toBe("before-restore");
    expect(undo?.summary.logEntries).toBe(1);

    const back = await handleRestore(store, JSON.stringify({ id: r.body.undoId }), baseProfile, at(5, 13));
    expect(back.status).toBe(200);
    const final = await store.readAll();
    expect(final.log.epoch).toBe(2);
    expect((final.log.data as LogEntry[]).find((e) => e.id === "a")?.deletedAt).toBeTruthy();
  });

  it("pulihkan tidak menurunkan kemajuan onboarding atau versi disclaimer", async () => {
    const store = make();
    const ob = (termsVersion: number) => ({ version: 1, currentStep: "summary", completed: ["welcome", "terms"], skipped: [], termsVersion, completedAt: "2026-01-01T00:00:00.000Z" });
    await store.writeMany([{ part: "onboarding", baseRev: 0, data: ob(1) }]);
    await handleGet(store, baseProfile, at(5));
    await store.writeMany([{ part: "onboarding", baseRev: 1, data: ob(2) }]);
    await handleRestore(store, JSON.stringify({ id: "daily-2026-01-05" }), baseProfile, at(5, 12));
    expect(((await store.readAll()).onboarding.data as { termsVersion: number }).termsVersion).toBe(2);
  });

  it("id tidak valid → 400, tidak ada → 404", async () => {
    const store = await seeded();
    expect((await handleRestore(store, JSON.stringify({ id: "../ha:sync:log" }), baseProfile)).status).toBe(400);
    expect((await handleRestore(store, "bukan json", baseProfile)).status).toBe(400);
    expect((await handleRestore(store, JSON.stringify({ id: "daily-2020-01-01" }), baseProfile)).status).toBe(404);
  });
});

describe("epoch di klien: pulihkan ikut ke semua perangkat", () => {
  function device(store: SyncStore, initial: Partial<PartData> = {}) {
    let local: PartData = { profile: null, settings: null, program: null, preferences: {}, onboarding: null, log: [], prs: [], sessions: [], checkins: [], ...initial };
    let meta: SyncMeta = emptyMeta();
    const io: SyncIO = {
      async get() {
        const out = await handleGet(store, baseProfile, at(5));
        const parts = Object.fromEntries(PART_NAMES.map((p) => [p, { ...out.parts[p], data: out.parts[p].data ?? emptyPart(p) }])) as ServerParts;
        return { enabled: true, parts };
      },
      post: (w) => store.writeMany(w),
      readLocal: () => local,
      applyLocal: (c) => (local = { ...local, ...c }),
      getMeta: () => meta,
      setMeta: (m) => (meta = m),
      now: () => "2026-01-05T12:00:00.000Z",
    };
    return {
      io,
      get local() {
        return local;
      },
      get meta() {
        return meta;
      },
      edit(change: Partial<PartData>) {
        local = { ...local, ...change };
        meta = { ...meta, parts: Object.fromEntries(Object.entries(meta.parts).map(([k, v]) => [k, k in change ? { ...v!, dirty: ["*"], gen: v!.gen + 1 } : v])) };
      },
    };
  }

  it("entri yang dihapus hidup lagi di kedua perangkat setelah pulihkan; dirty dibersihkan", async () => {
    const store = memorySyncStore();
    const hp = device(store, { profile: { name: "Alex" }, log: [entry("a")] });
    await syncOnce(hp.io);
    const laptop = device(store);
    await syncOnce(laptop.io);
    await syncOnce(hp.io); // membuat snapshot harian (server sudah berisi)
    // Laptop menghapus "a".
    laptop.edit({ log: [tombstone(entry("a"), "2026-01-05T06:00:00.000Z")] });
    await syncOnce(laptop.io);
    await syncOnce(hp.io);
    expect(hp.local.log[0].deletedAt).toBeTruthy();

    await handleRestore(store, JSON.stringify({ id: "daily-2026-01-05" }), baseProfile, at(5, 14));
    // HP punya perubahan yang belum terkirim: tetap diganti oleh pulihkan.
    hp.edit({ profile: { name: "Belum terkirim" } });
    for (const dev of [hp, laptop]) {
      await syncOnce(dev.io);
      expect(dev.local.log.map((e) => [e.id, !!e.deletedAt])).toEqual([["a", false]]);
      expect(dev.local.profile).toEqual({ name: "Alex" });
      expect(dev.meta.parts.log?.epoch).toBe(1);
      expect(dev.meta.parts.profile?.dirty).toEqual([]);
    }
  });
});

describe("route /api/sync/restore & /api/sync/snapshots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  beforeEach(() => cookieJar.clear());

  it("tanpa sesi → 401; tanpa database → tidak aktif", async () => {
    vi.stubEnv("APP_PASSCODE", "kunci-uji-123");
    vi.stubEnv("SESSION_SECRET", "s".repeat(40));
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok-uji");
    vi.stubGlobal("fetch", fakeRedis().fetchImpl);
    const restore = await import("@/app/api/sync/restore/route");
    const snaps = await import("@/app/api/sync/snapshots/route");
    expect((await restore.POST(new Request("https://app.example.test/api/sync/restore", { method: "POST", body: '{"id":"daily-2026-01-05"}' }))).status).toBe(401);
    expect((await snaps.GET()).status).toBe(401);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    expect(await (await snaps.GET()).json()).toEqual({ enabled: false, reason: "no-database" });
  });
});
