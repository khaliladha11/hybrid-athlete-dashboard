import { afterEach, describe, expect, it, vi } from "vitest";
import { rangeDays, MAX_RANGE_DAYS } from "@/lib/program/range";

vi.mock("server-only", () => ({}));

describe("rentang aktivitas program", () => {
  it("menghitung hari inklusif; menolak format salah, masa depan, dan lebih dari 200 hari", () => {
    expect(rangeDays("2026-01-12", "2026-01-12")).toBe(1);
    expect(rangeDays("2025-12-06", "2026-01-12")).toBe(38);
    for (const bad of [null, "", "2026-1-5", "kemarin", "2026-01-13", "2026-02-30x"]) expect(rangeDays(bad, "2026-01-12"), String(bad)).toBeNull();
    expect(rangeDays("2025-06-27", "2026-01-12")).toBe(MAX_RANGE_DAYS);
    expect(rangeDays("2025-06-26", "2026-01-12")).toBeNull();
  });
});

describe("route /api/activities", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Demo Mode: aktivitas dummy tanpa key; private cache 5 menit", async () => {
    vi.stubEnv("INTERVALS_API_KEY", "");
    const { GET } = await import("@/app/api/activities/route");
    const res = await GET(new Request("https://app.example.test/api/activities?oldest=" + new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10)));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, max-age=300");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, source: "demo" });
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("rentang tidak valid → 400 dengan pesan singkat, tanpa memanggil intervals.icu", async () => {
    vi.stubEnv("INTERVALS_API_KEY", "key-uji");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { GET } = await import("@/app/api/activities/route");
    const res = await GET(new Request("https://app.example.test/api/activities?oldest=2000-01-01"));
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Rentang tidak valid");
    expect(text).not.toContain("key-uji");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
