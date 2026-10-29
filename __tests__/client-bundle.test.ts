import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { redactPath } from "@/lib/intervals/client";
// @ts-expect-error skrip Node tanpa deklarasi tipe
import { SECRET_ENV, scanText } from "../scripts/check-client-bundle.mjs";

describe("pemeriksa bundle klien", () => {
  const secrets = { INTERVALS_API_KEY: "sentinel-intervals-key-1234", APP_PASSCODE: "sentinel-sandi-5678", SESSION_SECRET: "" };

  it("menemukan nilai rahasia dan process.env rahasia yang ter-inline", () => {
    expect(scanText('const k="sentinel-intervals-key-1234"', secrets)).toEqual(["nilai INTERVALS_API_KEY"]);
    expect(scanText("x=process.env.APP_PASSCODE", secrets)).toEqual(["process.env.APP_PASSCODE"]);
  });

  it("nama variabel sebagai teks petunjuk UI tidak dianggap bocor; nilai kosong/pendek diabaikan", () => {
    expect(scanText("Isi INTERVALS_API_KEY di .env.local", secrets)).toEqual([]);
    expect(scanText("apa saja", { SESSION_SECRET: "abc" })).toEqual([]);
  });

  it("semua rahasia server terdaftar", () => {
    expect(SECRET_ENV).toEqual(expect.arrayContaining(["INTERVALS_API_KEY", "APP_PASSCODE", "SESSION_SECRET", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"]));
  });
});

describe("log server tanpa ID", () => {
  it("ID atlet & aktivitas disamarkan", () => {
    expect(redactPath("/athlete/i123456/wellness")).toBe("/athlete/:id/wellness");
    expect(redactPath("/activity/i987/streams")).toBe("/activity/:id/streams");
    expect(redactPath("/athlete/0")).toBe("/athlete/:id");
  });
});
