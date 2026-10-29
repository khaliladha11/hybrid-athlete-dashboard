/**
 * Aturan murni service worker (0.16, docs/RELEASE-1.0.md #1). Dipakai `sw.js` lewat `importScripts` dan diuji Vitest
 * lewat `require`, jadi ditulis sebagai JavaScript biasa tanpa build.
 *
 * - `/api/*`, bukan GET, beda origin, permintaan RSC (navigasi client), `/unlock`, dan berkas SW sendiri: tidak pernah
 *   lewat cache (bypass). Data intervals.icu & sinkron hanya lewat server, API key tidak pernah di klien.
 * - Aset build (`/_next/static`), manifest, ikon: cache-first per versi. Gambar gerakan: cache-first.
 * - Halaman: network-first; salinan terakhir yang berhasil (200, HTML, bukan redirect ke /unlock) dipakai saat offline.
 * - Redirect ke /unlock atau 401 = sesi tidak berlaku → cache halaman (berisi data) dihapus.
 */
(function (root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  else root.HA_SW_RULES = rules;
})(typeof self !== "undefined" ? self : this, function () {
  const STATIC_FILES = ["/manifest.json", "/icon-192.png", "/icon-512.png", "/icon.svg", "/apple-touch-icon.png", "/favicon.svg", "/favicon-16.png", "/favicon-32.png", "/favicon.ico"];
  const SW_FILES = ["/sw.js", "/sw-rules.js"];
  /** Halaman yang disimpan sekali untuk offline bila belum pernah dibuka (mode latihan termasuk). */
  const WARM_ROUTES = ["/", "/run", "/program", "/strength", "/strength/sesi", "/setting", "/insight"];
  const OFFLINE_PAGE = "/offline";

  /**
   * Jenis permintaan: "static" | "image" | "page" | "bypass".
   * @param {{ url: string, origin: string, method: string, mode?: string, accept?: string, rsc?: boolean }} r
   */
  function classify(r) {
    let u;
    try {
      u = new URL(r.url);
    } catch (e) {
      return "bypass";
    }
    if (r.method !== "GET" || u.origin !== r.origin) return "bypass";
    const path = u.pathname;
    if (path.startsWith("/api/") || SW_FILES.includes(path)) return "bypass";
    if (r.rsc || u.searchParams.has("_rsc")) return "bypass";
    if (path.startsWith("/_next/static/") || STATIC_FILES.includes(path)) return "static";
    if (path.startsWith("/movements/")) return "image";
    const isPage = r.mode === "navigate" || (r.accept || "").includes("text/html");
    if (!isPage) return "bypass";
    if (path === "/unlock") return "bypass";
    return "page";
  }

  /** Halaman boleh disimpan: 200, HTML, tidak berakhir di /unlock. */
  function isCacheablePage(res) {
    if (!res || res.status !== 200 || res.type === "opaqueredirect") return false;
    if (!(res.contentType || "").includes("text/html")) return false;
    try {
      if (new URL(res.url).pathname === "/unlock") return false;
    } catch (e) {
      return false;
    }
    return true;
  }

  /** Redirect halaman yang sah saat sesi berlaku (next.config: /log → /strength). */
  const KNOWN_REDIRECTS = ["/log"];

  /**
   * Sesi tidak berlaku: 401, dokumen berakhir di /unlock, atau redirect halaman (navigasi memakai redirect manual, jadi
   * tujuannya tidak terlihat: `opaqueredirect`) selain redirect yang sah.
   */
  function isLockSignal(res) {
    if (!res) return false;
    if (res.status === 401) return true;
    if (res.type === "opaqueredirect") {
      try {
        return !KNOWN_REDIRECTS.includes(new URL(res.url).pathname);
      } catch (e) {
        return true;
      }
    }
    try {
      return new URL(res.url).pathname === "/unlock";
    } catch (e) {
      return false;
    }
  }

  /** Kunci cache halaman: origin + path (tanpa query), supaya `/run?src=program` tetap punya cadangan `/run`. */
  function pageKey(url) {
    const u = new URL(url);
    return u.origin + u.pathname;
  }

  /** Berkas build yang dirujuk HTML (JS, CSS, font), untuk disimpan saat menghangatkan halaman. */
  function staticUrlsFromHtml(html) {
    const out = new Set();
    const re = /\/_next\/static\/[^"'\s)<>\\]+/g;
    let m;
    while ((m = re.exec(html || ""))) out.add(m[0]);
    return Array.from(out);
  }

  /** Nama cache. Aset build per versi; gambar & halaman lintas versi (halaman berisi data, bukan kode). */
  function cacheNames(version) {
    return { static: "ha-static-" + version, images: "ha-images-v1", pages: "ha-pages-v1" };
  }

  /** Cache lama yang dihapus saat versi baru aktif. */
  function staleCaches(all, version) {
    const keep = Object.values(cacheNames(version));
    return all.filter((n) => n.startsWith("ha-") && !keep.includes(n));
  }

  return { WARM_ROUTES, OFFLINE_PAGE, STATIC_FILES, classify, isCacheablePage, isLockSignal, pageKey, staticUrlsFromHtml, cacheNames, staleCaches };
});
