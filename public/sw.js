/**
 * Service worker Hybrid Athlete (0.16, docs/RELEASE-1.0.md #1, docs/ARCHITECTURE.md "Offline"). Ditulis tangan,
 * tanpa library; aturan murni di `sw-rules.js` (diuji).
 *
 * - Aset build & ikon: cache-first per versi. Gambar gerakan: cache-first.
 * - Halaman: network-first (batas 4 detik bila sudah ada salinan); salinan terakhir dipakai saat offline, lalu
 *   halaman `/offline` bila belum pernah tersimpan.
 * - `/api/*`, `/unlock`, permintaan RSC: tidak pernah lewat cache.
 * - Sesi tidak berlaku (redirect ke /unlock, 401) atau pesan CLEAR_DATA ("Kunci perangkat ini"): cache halaman dihapus.
 * - Versi baru menunggu sampai pengguna memilih "Muat ulang" (pesan SKIP_WAITING); tidak ada reload paksa.
 */
importScripts("/sw-rules.js");

const R = self.HA_SW_RULES;
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const C = R.cacheNames(VERSION);
const NET_TIMEOUT_MS = 4000;

/** Simpan berkas build yang dirujuk HTML (best effort). */
async function cacheStatics(html) {
  const cache = await caches.open(C.static);
  for (const url of R.staticUrlsFromHtml(html)) {
    if (await cache.match(url)) continue;
    try {
      const res = await fetch(url);
      if (res.ok && !res.redirected) await cache.put(url, res);
    } catch (e) {
      /* offline atau gagal: dicoba lagi lain kali */
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(C.static);
      await cache.addAll(R.STATIC_FILES.filter((f) => f !== "/favicon.ico")).catch(() => {});
      try {
        const res = await fetch(R.OFFLINE_PAGE, { credentials: "same-origin" });
        if (res.ok) {
          await cache.put(R.OFFLINE_PAGE, res.clone());
          await cacheStatics(await res.text());
        }
      } catch (e) {
        /* halaman offline disimpan lain kali */
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(R.staleCaches(names, VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Hapus semua salinan halaman (berisi data), semua versi. */
async function clearPages() {
  const names = await caches.keys();
  await Promise.all(names.filter(R.isPageCache).map((n) => caches.delete(n)));
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // Redirect (mis. gambar saat terkunci → /unlock) tidak pernah disimpan.
  if (res.ok && !res.redirected) cache.put(req, res.clone());
  return res;
}

async function offlineFallback() {
  const off = await caches.match(R.OFFLINE_PAGE);
  return off || new Response("Sedang offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function pageNetworkFirst(req) {
  const cache = await caches.open(C.pages);
  const key = R.pageKey(req.url);
  const net = fetch(req).then(async (res) => {
    if (R.isLockSignal({ status: res.status, url: res.url, type: res.type })) {
      await clearPages();
    } else if (R.isCacheablePage({ status: res.status, url: res.url, type: res.type, contentType: res.headers.get("Content-Type") })) {
      await cache.put(key, res.clone());
      res
        .clone()
        .text()
        .then(cacheStatics)
        .catch(() => {});
    }
    return res;
  });
  const hit = await cache.match(key);
  if (!hit) {
    try {
      return await net;
    } catch (e) {
      return offlineFallback();
    }
  }
  // Ada salinan: tunggu jaringan maksimal 4 detik, lalu pakai salinan (jaringan tetap memperbarui cache di belakang).
  const timeout = new Promise((resolve) => setTimeout(resolve, NET_TIMEOUT_MS, null));
  const first = await Promise.race([net.catch(() => null), timeout]);
  return first || hit;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const kind = R.classify({
    url: req.url,
    origin: self.location.origin,
    method: req.method,
    mode: req.mode,
    accept: req.headers.get("Accept") || "",
    rsc: req.headers.get("RSC") === "1" || req.headers.has("Next-Router-State-Tree"),
  });
  if (kind === "bypass") return;
  if (kind === "static") event.respondWith(cacheFirst(req, C.static));
  else if (kind === "image") event.respondWith(cacheFirst(req, C.images));
  else event.respondWith(pageNetworkFirst(req));
});

/** Simpan sekali rute utama yang belum ada di cache (mode latihan termasuk), berhenti bila sesi terkunci. */
async function warm() {
  const cache = await caches.open(C.pages);
  for (const route of R.WARM_ROUTES) {
    const key = R.pageKey(new URL(route, self.location.origin).href);
    if (await cache.match(key)) continue;
    try {
      const res = await fetch(route, { credentials: "same-origin", redirect: "manual", headers: { Accept: "text/html" } });
      if (R.isLockSignal({ status: res.status, url: res.url, type: res.type })) return;
      if (!R.isCacheablePage({ status: res.status, url: res.url, type: res.type, contentType: res.headers.get("Content-Type") })) continue;
      await cache.put(key, res.clone());
      await cacheStatics(await res.text());
    } catch (e) {
      return;
    }
  }
}

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") self.skipWaiting();
  else if (type === "CLEAR_DATA") event.waitUntil(clearPages());
  else if (type === "WARM") event.waitUntil(warm());
});
