import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSendBody } from "@/lib/intervals/calendar";
import { retryAfterSec } from "@/lib/intervals/client";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

// Nilai fiktif khusus test: bukan key atau atlet siapa pun.
const KEY = "sentinel-intervals-key-uji-7f3a";
const ATHLETE = "i000777";

interface Remote {
  id: number;
  external_id?: string;
  start_date_local: string;
  name: string;
  description: string;
}

/** intervals.icu palsu: menyimpan event di memori dan mencatat permintaan. */
function fakeIntervals(opts: { status?: number; headers?: Record<string, string>; throws?: Error } = {}) {
  const events: Remote[] = [];
  const calls: { method: string; url: string; auth: string | null; body?: unknown }[] = [];
  let nextId = 100;
  const fetchFn = vi.fn(async (input: URL | string, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url: url.pathname + url.search, auth: new Headers(init?.headers).get("authorization"), body });
    if (opts.throws) throw opts.throws;
    if (opts.status) return new Response("{}", { status: opts.status, headers: opts.headers });
    const m = url.pathname.match(/\/events(?:\/(\d+))?$/);
    if (method === "GET") {
      const [lo, hi] = [url.searchParams.get("oldest")!, url.searchParams.get("newest")!];
      return Response.json(events.filter((e) => e.start_date_local.slice(0, 10) >= lo && e.start_date_local.slice(0, 10) <= hi));
    }
    if (method === "POST") {
      const e = { ...body, id: nextId++ };
      events.push(e);
      return Response.json(e);
    }
    const i = events.findIndex((e) => e.id === Number(m?.[1]));
    if (i < 0) return new Response("{}", { status: 404 });
    if (method === "PUT") {
      events[i] = { ...events[i], ...body };
      return Response.json(events[i]);
    }
    events.splice(i, 1);
    return new Response("", { status: 200 });
  });
  vi.stubGlobal("fetch", fetchFn);
  return { events, calls };
}

const workout = (over: Record<string, unknown> = {}) => ({
  action: "upsert",
  externalId: "ha:s:hm-2026-01-05:1:selasa:easy",
  date: "2026-11-03",
  event: { category: "WORKOUT", name: "Easy Z2 Continuous 35' · Easy 45'", description: "Warmup\n- Jalan 5m 13:00-10:00/km Pace", movingTimeSec: 2700 },
  ...over,
});

const post = (body: unknown) =>
  new Request("https://app.example.test/api/intervals/workout", { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });

async function send(body: unknown) {
  const { POST } = await import("@/app/api/intervals/workout/route");
  const res = await POST(post(body));
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) };
}

let logs: string[] = [];
beforeEach(() => {
  vi.stubEnv("APP_PASSCODE", "");
  vi.stubEnv("INTERVALS_API_KEY", KEY);
  vi.stubEnv("INTERVALS_ATHLETE_ID", ATHLETE);
  logs = [];
  for (const level of ["log", "error", "warn", "info"] as const) vi.spyOn(console, level).mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(" ")));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Respons & log tidak pernah memuat key, atlet, atau id event. */
function clean(text: string) {
  expect(text).not.toContain(KEY);
  expect(text).not.toContain(Buffer.from("API_KEY:" + KEY).toString("base64"));
  expect(text).not.toContain(ATHLETE);
  for (const l of logs) {
    expect(l).not.toContain(KEY);
    expect(l).not.toContain(ATHLETE);
  }
}

describe("rute kirim ke kalender intervals.icu", () => {
  it("kirim pertama = buat; kirim ulang = perbarui event yang sama (tanpa duplikat)", async () => {
    const fake = fakeIntervals();
    const a = await send(workout());
    expect(a).toMatchObject({ status: 200, json: { status: "created" } });
    clean(a.text);
    expect(fake.events).toHaveLength(1);
    expect(fake.events[0]).toMatchObject({ category: "WORKOUT", type: "Run", start_date_local: "2026-11-03T00:00:00", moving_time: 2700, external_id: "ha:s:hm-2026-01-05:1:selasa:easy" });
    const post1 = fake.calls.find((c) => c.method === "POST")!;
    expect(post1.url).toBe(`/api/v1/athlete/${ATHLETE}/events?upsertOnUid=false`);
    expect(post1.auth).toBe(`Basic ${Buffer.from("API_KEY:" + KEY).toString("base64")}`);

    const b = await send(workout({ event: { ...workout().event, description: "Warmup\n- Jalan 10m 13:00-10:00/km Pace" } }));
    expect(b.json).toEqual({ status: "updated" });
    clean(b.text);
    expect(fake.events).toHaveLength(1);
    expect(fake.events[0].description).toContain("10m");
    // Jawaban hanya status: tanpa id event atau isi dari intervals.icu.
    expect(Object.keys(b.json)).toEqual(["status"]);
  });

  it("event yang digeser di kalender (±14 hari) tetap diperbarui; duplikat lama dirapikan", async () => {
    const fake = fakeIntervals();
    fake.events.push(
      { id: 1, external_id: "ha:g:2026-11-03", start_date_local: "2026-11-05T00:00:00", name: "lama", description: "x" },
      { id: 2, external_id: "ha:g:2026-11-03", start_date_local: "2026-11-03T00:00:00", name: "dobel", description: "x" },
      { id: 3, external_id: "milik-lain", start_date_local: "2026-11-03T00:00:00", name: "lain", description: "x" },
    );
    const r = await send(workout({ externalId: "ha:g:2026-11-03" }));
    expect(r.json).toEqual({ status: "updated" });
    expect(fake.events.map((e) => e.id).sort()).toEqual([1, 3]);
    expect(fake.events.find((e) => e.id === 1)).toMatchObject({ start_date_local: "2026-11-03T00:00:00" });
  });

  it("hapus: event hilang; hapus lagi = absent", async () => {
    const fake = fakeIntervals();
    await send(workout());
    expect((await send({ action: "delete", externalId: workout().externalId, date: "2026-11-03" })).json).toEqual({ status: "deleted" });
    expect(fake.events).toHaveLength(0);
    expect((await send({ action: "delete", externalId: workout().externalId, date: "2026-11-03" })).json).toEqual({ status: "absent" });
  });

  it("catatan ST = NOTE tanpa type", async () => {
    const fake = fakeIntervals();
    const r = await send({ action: "upsert", externalId: "ha:st:2026-11-02", date: "2026-11-02", event: { category: "NOTE", name: "ST Lower 45 menit", description: "Sesi strength.", movingTimeSec: 2700 } });
    expect(r.json).toEqual({ status: "created" });
    expect(fake.events[0]).toMatchObject({ category: "NOTE", name: "ST Lower 45 menit" });
    expect(fake.events[0]).not.toHaveProperty("type");
  });

  it.each([
    [401, "UNAUTHORIZED", 502],
    [403, "FORBIDDEN", 502],
    [404, "NOT_FOUND", 502],
    [500, "SERVER_ERROR", 502],
    [418, "UNKNOWN", 502],
  ])("intervals.icu %i → kode %s", async (status, code, http) => {
    fakeIntervals({ status });
    const r = await send(workout());
    expect(r.status).toBe(http);
    expect(r.json).toEqual({ status: "error", code });
    clean(r.text);
  });

  it("429 → RATE_LIMITED dengan retryAfterSec", async () => {
    fakeIntervals({ status: 429, headers: { "Retry-After": "120" } });
    const r = await send(workout());
    expect(r.status).toBe(429);
    expect(r.json).toEqual({ status: "error", code: "RATE_LIMITED", retryAfterSec: 120 });
  });

  it("jaringan/timeout → NETWORK; log tanpa key/atlet", async () => {
    fakeIntervals({ throws: Object.assign(new Error(`connect failed ${KEY}`.replace(KEY, "x")), { name: "TimeoutError" }) });
    const r = await send(workout());
    expect(r.json).toEqual({ status: "error", code: "NETWORK" });
    expect(logs.some((l) => l.includes("/athlete/:id/events"))).toBe(true);
    clean(r.text);
  });

  it("tanpa key (Demo Mode) → demo, tanpa panggilan keluar", async () => {
    vi.stubEnv("INTERVALS_API_KEY", "");
    const fake = fakeIntervals();
    expect((await send(workout())).json).toEqual({ status: "demo" });
    expect(fake.calls).toHaveLength(0);
  });

  it("sandi aktif tanpa sesi → 401, intervals.icu tidak dipanggil", async () => {
    vi.stubEnv("APP_PASSCODE", "kunci-uji-123");
    vi.stubEnv("SESSION_SECRET", "s".repeat(40));
    const fake = fakeIntervals();
    const r = await send(workout());
    expect(r.status).toBe(401);
    expect(r.json).toEqual({ status: "error", code: "LOCKED" });
    expect(fake.calls).toHaveLength(0);
  });

  it("body tidak valid → 400; terlalu besar → 413", async () => {
    const fake = fakeIntervals();
    expect((await send("{bukan json")).status).toBe(400);
    expect((await send(workout({ externalId: "evil" }))).status).toBe(400);
    expect((await send({ ...workout(), event: { ...workout().event, description: "x".repeat(20_000) } })).status).toBe(413);
    expect(fake.calls).toHaveLength(0);
  });
});

describe("validasi body", () => {
  it("menolak id, tanggal, kategori, dan isi yang salah", () => {
    expect(parseSendBody(workout())).not.toBeNull();
    expect(parseSendBody(workout({ date: "2026-02-30" }))).toBeNull();
    expect(parseSendBody(workout({ date: "3 Nov" }))).toBeNull();
    expect(parseSendBody(workout({ action: "drop" }))).toBeNull();
    expect(parseSendBody(workout({ externalId: "ha:s:../x y" }))).toBeNull();
    expect(parseSendBody(workout({ externalId: "ha:st:2026-11-03" }))).toBeNull(); // NOTE wajib untuk ha:st
    expect(parseSendBody(workout({ event: { ...workout().event, movingTimeSec: 10 } }))).toBeNull();
    expect(parseSendBody(workout({ event: { ...workout().event, name: "" } }))).toBeNull();
    expect(parseSendBody({ action: "delete", externalId: "ha:g:2026-11-03", date: "2026-11-03" })).toEqual({ action: "delete", externalId: "ha:g:2026-11-03", date: "2026-11-03" });
    expect(parseSendBody(null)).toBeNull();
  });

  it("Retry-After: detik atau tanggal HTTP", () => {
    expect(retryAfterSec("30")).toBe(30);
    expect(retryAfterSec(new Date(10_000 + 90_000).toUTCString(), 10_000)).toBe(90);
    expect(retryAfterSec("nanti")).toBeUndefined();
    expect(retryAfterSec(null)).toBeUndefined();
  });
});
