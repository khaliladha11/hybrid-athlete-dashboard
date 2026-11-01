import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ABOUT_LINKS, compareSemver, formatReleaseDate, isNewer, parseLatestRelease, RELEASE_DATE, releaseUrl, UPSTREAM_SLUG } from "@/lib/app-info";
import { APP_VERSION, fetchLatestRelease } from "@/lib/app-release";
// @ts-expect-error skrip Node tanpa deklarasi tipe
import { changelogSection, compareSemver as scriptCompare } from "../scripts/release-notes.mjs";

vi.mock("server-only", () => ({}));

describe("sumber versi (Setting › Tentang & versi)", () => {
  it("versi = package.json; tanggal rilis = heading CHANGELOG untuk versi itu", () => {
    expect(APP_VERSION).toBe(JSON.parse(readFileSync("package.json", "utf-8")).version);
    const section = changelogSection(readFileSync("CHANGELOG.md", "utf-8"), APP_VERSION);
    expect(section, `CHANGELOG tanpa [${APP_VERSION}]`).not.toBeNull();
    expect(section.heading).toContain(`· ${RELEASE_DATE} ·`);
  });

  it("tautan menunjuk repo upstream; tanggal ditulis lengkap", () => {
    expect(UPSTREAM_SLUG).toBe("khaliladha11/hybrid-athlete-dashboard");
    expect(ABOUT_LINKS.map((l) => l.href).every((h) => h.startsWith(`https://github.com/${UPSTREAM_SLUG}`))).toBe(true);
    expect(ABOUT_LINKS.some((l) => l.href.endsWith("/LICENSE"))).toBe(true);
    expect(releaseUrl("v1.0.0")).toBe(`https://github.com/${UPSTREAM_SLUG}/releases/tag/v1.0.0`);
    expect(formatReleaseDate("2026-11-01")).toBe("1 November 2026");
    expect(formatReleaseDate("rusak")).toBe("·");
  });
});

describe("semver sama dengan skrip rilis", () => {
  const pairs: [string, string][] = [
    ["1.0.0-rc.1", "1.0.0"],
    ["1.0.0-rc.2", "1.0.0-rc.10"],
    ["0.17.0", "1.0.0-rc.1"],
    ["v1.0.1", "1.0.0"],
    ["1.0.0", "v1.0.0"],
    ["1.0.0-alpha", "1.0.0-alpha.1"],
    ["1.0.0-beta", "1.0.0-alpha"],
    ["x", "1.0.0"],
  ];
  it.each(pairs)("%s vs %s", (a, b) => {
    expect(compareSemver(a, b)).toBe(scriptCompare(a, b));
  });

  it("versi baru hanya bila lebih tinggi dan valid", () => {
    expect(isNewer("v1.0.0", "1.0.0-rc.1")).toBe(true);
    expect(isNewer("v1.0.0", "1.0.0")).toBe(false);
    expect(isNewer("v0.17.0", "1.0.0-rc.1")).toBe(false);
    expect(isNewer(undefined, "1.0.0")).toBe(false);
    expect(isNewer("terbaru", "1.0.0")).toBe(false);
  });
});

describe("cek rilis GitHub (gagal tanpa suara)", () => {
  const res = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;

  it("rilis stabil → tag; draft, prarilis, atau tag aneh → tidak ada", () => {
    expect(parseLatestRelease({ tag_name: "v1.0.0" })).toBe("v1.0.0");
    expect(parseLatestRelease({ tag_name: "v1.1.0", prerelease: true })).toBeUndefined();
    expect(parseLatestRelease({ tag_name: "v1.1.0", draft: true })).toBeUndefined();
    expect(parseLatestRelease({ tag_name: "rilis-baru" })).toBeUndefined();
    expect(parseLatestRelease(null)).toBeUndefined();
  });

  it("tanpa token, ke repo upstream, di-cache; 404, error jaringan, dan JSON rusak → undefined", async () => {
    const calls: [string, RequestInit][] = [];
    const ok = (async (url: string, init: RequestInit) => (calls.push([url, init]), res(200, { tag_name: "v1.0.0" }))) as unknown as typeof fetch;
    expect(await fetchLatestRelease(ok)).toBe("v1.0.0");
    expect(calls[0][0]).toBe(`https://api.github.com/repos/${UPSTREAM_SLUG}/releases/latest`);
    expect(JSON.stringify(calls[0][1].headers)).not.toMatch(/authorization/i);
    expect((calls[0][1] as { next?: { revalidate?: number } }).next?.revalidate).toBe(21600);
    expect(await fetchLatestRelease((async () => res(404, { message: "Not Found" })) as unknown as typeof fetch)).toBeUndefined();
    expect(await fetchLatestRelease((async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).toBeUndefined();
    expect(await fetchLatestRelease((async () => ({ ok: true, json: async () => Promise.reject(new SyntaxError("x")) })) as unknown as typeof fetch)).toBeUndefined();
  });
});
