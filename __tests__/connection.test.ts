import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectionFromResult, resolveConnection } from "@/lib/intervals/connection";
import type { FetchResult, IntervalsErrorCode } from "@/lib/intervals/types";

// client.ts memakai `import "server-only"`; di test Node cukup diganti modul kosong.
vi.mock("server-only", () => ({}));

const fail = (code: IntervalsErrorCode, status?: number): FetchResult<unknown> => ({ ok: false, error: { code, status, title: "x", message: "y" } });

describe("status koneksi (murni)", () => {
  it("tanpa key → missing, intervals.icu tidak dipanggil", async () => {
    const fetchAthlete = vi.fn();
    expect(await resolveConnection({ hasKey: false, fetchAthlete })).toEqual({ status: "missing" });
    expect(fetchAthlete).not.toHaveBeenCalled();
  });

  it("pemetaan kode error", () => {
    expect(connectionFromResult(fail("UNAUTHORIZED", 401))).toEqual({ status: "unauthorized" });
    expect(connectionFromResult(fail("FORBIDDEN", 403))).toEqual({ status: "forbidden" });
    expect(connectionFromResult(fail("NOT_FOUND", 404))).toEqual({ status: "not_found" });
    expect(connectionFromResult(fail("SERVER_ERROR", 503))).toEqual({ status: "network" });
    expect(connectionFromResult(fail("NETWORK"))).toEqual({ status: "network" });
    expect(connectionFromResult(fail("UNKNOWN", 429))).toEqual({ status: "network" });
  });

  it("ok: hanya nama atlet yang diteruskan (dipotong 80 karakter)", () => {
    const ok = (data: unknown): FetchResult<unknown> => ({ ok: true, data, source: "live" });
    expect(connectionFromResult(ok({ id: "i1", name: "  Atlet Contoh ", email: "a@b.c", icu_api_key: "k" }))).toEqual({ status: "ok", athleteName: "Atlet Contoh" });
    expect(connectionFromResult(ok({ firstname: "Atlet", lastname: "Contoh" }))).toEqual({ status: "ok", athleteName: "Atlet Contoh" });
    expect(connectionFromResult(ok({ id: "i1" }))).toEqual({ status: "ok" });
    expect(connectionFromResult(ok({ name: "x".repeat(200) })).athleteName).toHaveLength(80);
  });
});

describe("GET /api/connection (route, fetch palsu)", () => {
  const KEY = "SECRET-KEY-123";
  const ATHLETE = "i999999";
  const calls: { url: string; auth: string | null }[] = [];

  beforeEach(() => {
    calls.length = 0;
    vi.stubEnv("INTERVALS_API_KEY", KEY);
    vi.stubEnv("INTERVALS_ATHLETE_ID", ATHLETE);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** fetch palsu: catat URL & header, balas dengan status/isi tertentu atau lempar error. */
  function fakeFetch(reply: { status: number; body?: unknown } | Error) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL | string, init?: RequestInit) => {
        calls.push({ url: String(url), auth: new Headers(init?.headers).get("authorization") });
        if (reply instanceof Error) throw reply;
        return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status, headers: { "content-type": "application/json" } });
      }),
    );
  }

  async function call() {
    const { GET } = await import("@/app/api/connection/route");
    const res = await GET();
    const text = await res.text();
    return { res, text, json: JSON.parse(text) as Record<string, unknown> };
  }

  const cases: [string, { status: number; body?: unknown } | Error, string][] = [
    ["401", { status: 401 }, "unauthorized"],
    ["403", { status: 403 }, "forbidden"],
    ["404", { status: 404 }, "not_found"],
    ["500", { status: 500 }, "network"],
    ["503", { status: 503 }, "network"],
    ["timeout", Object.assign(new Error("timeout"), { name: "TimeoutError" }), "network"],
    ["jaringan", new TypeError("fetch failed"), "network"],
  ];

  for (const [label, reply, status] of cases) {
    it(`${label} → ${status}, tanpa key/ID di respons`, async () => {
      fakeFetch(reply);
      const { res, text, json } = await call();
      expect(json).toEqual({ status });
      expect(res.headers.get("cache-control")).toContain("no-store");
      expect(text).not.toContain(KEY);
      expect(text).not.toContain(ATHLETE);
    });
  }

  it("200 → ok + nama; email & data lain tidak ikut; key hanya di header Authorization ke intervals.icu", async () => {
    fakeFetch({ status: 200, body: { id: ATHLETE, name: "Atlet Contoh", email: "atlet@contoh.id", sportSettings: [{ ftp: 200 }] } });
    const { text, json } = await call();
    expect(json).toEqual({ status: "ok", athleteName: "Atlet Contoh" });
    expect(Object.keys(json).sort()).toEqual(["athleteName", "status"]);
    for (const secret of [KEY, ATHLETE, "atlet@contoh.id", "sportSettings"]) expect(text).not.toContain(secret);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://intervals.icu/api/v1/athlete/${ATHLETE}`);
    expect(calls[0].auth).toBe(`Basic ${Buffer.from(`API_KEY:${KEY}`).toString("base64")}`);
  });

  it("key kosong (atau hanya spasi) → missing tanpa memanggil intervals.icu", async () => {
    vi.stubEnv("INTERVALS_API_KEY", "   ");
    fakeFetch({ status: 200 });
    const { json, text } = await call();
    expect(json).toEqual({ status: "missing" });
    expect(calls).toHaveLength(0);
    expect(text).not.toContain(ATHLETE);
  });
});
