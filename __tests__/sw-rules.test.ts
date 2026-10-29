import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type Kind = "static" | "image" | "page" | "bypass";
interface Rules {
  WARM_ROUTES: string[];
  OFFLINE_PAGE: string;
  classify(r: { url: string; origin: string; method: string; mode?: string; accept?: string; rsc?: boolean }): Kind;
  isCacheablePage(r: { status: number; url: string; contentType?: string; type?: string } | null): boolean;
  isLockSignal(r: { status: number; url: string; type?: string } | null): boolean;
  pageKey(url: string): string;
  staticUrlsFromHtml(html: string): string[];
  cacheNames(v: string): { static: string; images: string; pages: string };
  staleCaches(all: string[], v: string): string[];
}
const rules = createRequire(import.meta.url)("../public/sw-rules.js") as Rules;

const O = "https://ha.example.test";
const nav = (path: string, extra: Partial<Parameters<Rules["classify"]>[0]> = {}) => rules.classify({ url: O + path, origin: O, method: "GET", mode: "navigate", accept: "text/html", ...extra });

describe("klasifikasi permintaan", () => {
  it("API tidak pernah lewat cache (termasuk sinkron, kunci, dan jalur intervals.icu)", () => {
    for (const p of ["/api/sync", "/api/unlock", "/api/lock", "/api/status", "/api/connection", "/api/activities?oldest=2026-01-01", "/api/sync/restore"]) {
      expect(rules.classify({ url: O + p, origin: O, method: "GET", accept: "*/*" })).toBe("bypass");
    }
  });

  it("bukan GET, beda origin, RSC, /unlock, dan berkas SW: bypass", () => {
    expect(rules.classify({ url: O + "/", origin: O, method: "POST", mode: "navigate" })).toBe("bypass");
    expect(rules.classify({ url: "https://intervals.icu/api/v1/athlete/0", origin: O, method: "GET" })).toBe("bypass");
    expect(nav("/run", { mode: "cors", accept: "*/*", rsc: true })).toBe("bypass");
    expect(nav("/run?_rsc=abc", { mode: "cors", accept: "*/*" })).toBe("bypass");
    expect(nav("/unlock")).toBe("bypass");
    expect(rules.classify({ url: O + "/sw.js?v=1", origin: O, method: "GET" })).toBe("bypass");
    expect(rules.classify({ url: "bukan url", origin: O, method: "GET" })).toBe("bypass");
  });

  it("aset build & ikon: static; gambar gerakan: image; dokumen: page", () => {
    expect(rules.classify({ url: O + "/_next/static/chunks/app-123.js", origin: O, method: "GET" })).toBe("static");
    expect(rules.classify({ url: O + "/manifest.json", origin: O, method: "GET" })).toBe("static");
    expect(rules.classify({ url: O + "/icon-192.png", origin: O, method: "GET" })).toBe("static");
    expect(rules.classify({ url: O + "/movements/push-up/0.webp", origin: O, method: "GET" })).toBe("image");
    for (const p of ["/", "/run", "/program", "/strength", "/strength/sesi", "/setting", "/insight", "/activity/abc", "/offline"]) expect(nav(p)).toBe("page");
    expect(rules.classify({ url: O + "/run", origin: O, method: "GET", accept: "application/json" })).toBe("bypass");
  });
});

describe("halaman yang boleh disimpan & sinyal kunci", () => {
  it("hanya 200 HTML yang tidak berakhir di /unlock", () => {
    expect(rules.isCacheablePage({ status: 200, url: O + "/run", contentType: "text/html; charset=utf-8" })).toBe(true);
    expect(rules.isCacheablePage({ status: 200, url: O + "/unlock", contentType: "text/html" })).toBe(false);
    expect(rules.isCacheablePage({ status: 500, url: O + "/run", contentType: "text/html" })).toBe(false);
    expect(rules.isCacheablePage({ status: 200, url: O + "/run", contentType: "application/json" })).toBe(false);
    expect(rules.isCacheablePage({ status: 0, url: O + "/run", type: "opaqueredirect" })).toBe(false);
    expect(rules.isCacheablePage(null)).toBe(false);
  });

  it("401 atau redirect ke /unlock = sesi tidak berlaku", () => {
    expect(rules.isLockSignal({ status: 401, url: O + "/api/sync" })).toBe(true);
    expect(rules.isLockSignal({ status: 200, url: O + "/unlock?next=%2Frun" })).toBe(true);
    expect(rules.isLockSignal({ status: 200, url: O + "/run" })).toBe(false);
    expect(rules.isLockSignal(null)).toBe(false);
    // Navigasi memakai redirect manual: tujuan tidak terlihat, jadi redirect selain /log dianggap kunci.
    expect(rules.isLockSignal({ status: 0, url: O + "/run", type: "opaqueredirect" })).toBe(true);
    expect(rules.isLockSignal({ status: 0, url: O + "/log", type: "opaqueredirect" })).toBe(false);
  });
});

describe("kunci, ekstraksi, dan nama cache", () => {
  it("kunci halaman tanpa query", () => {
    expect(rules.pageKey(O + "/run?src=program&w=3")).toBe(O + "/run");
  });

  it("berkas build yang dirujuk HTML, unik", () => {
    const html = `<link rel="stylesheet" href="/_next/static/css/a1.css"/><script src="/_next/static/chunks/main-9.js" async></script>
      <script>self.__next_f.push([1,"\\"/_next/static/chunks/app/run/page-7.js\\""])</script><script src="/_next/static/chunks/main-9.js"></script>`;
    expect(rules.staticUrlsFromHtml(html).sort()).toEqual(["/_next/static/chunks/app/run/page-7.js", "/_next/static/chunks/main-9.js", "/_next/static/css/a1.css"]);
    expect(rules.staticUrlsFromHtml("")).toEqual([]);
  });

  it("aset per versi, halaman & gambar lintas versi; cache lama dibersihkan", () => {
    expect(rules.cacheNames("abc")).toEqual({ static: "ha-static-abc", images: "ha-images-v1", pages: "ha-pages-v1" });
    expect(rules.staleCaches(["ha-static-old", "ha-static-abc", "ha-pages-v1", "ha-images-v1", "lain"], "abc")).toEqual(["ha-static-old"]);
  });

  it("rute yang dihangatkan mencakup semua tab dan mode latihan", () => {
    expect(rules.WARM_ROUTES).toEqual(["/", "/run", "/program", "/strength", "/strength/sesi", "/setting", "/insight"]);
    expect(rules.OFFLINE_PAGE).toBe("/offline");
  });
});
