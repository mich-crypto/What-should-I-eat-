// Minimal offline shell so the installed Home Screen app opens instantly
// even with a flaky connection. Recipe photos and any AI calls still need
// the network; only the app shell is cached.
//
// CACHE_VERSION must match js/version.js's VERSION on every deploy. Bumping
// it is what makes an update "count": the browser only ever re-fetches
// sw.js itself (served with Cache-Control: no-cache, see _headers), and a
// byte-for-byte-identical sw.js is treated as no update at all — a new
// version string is the change that makes it register as one. That then
// triggers install -> activate -> old cache dropped -> the already-open
// page's controllerchange listener (in index.html) reloads it once, so a
// push reaches anyone with the app already open without them doing
// anything.
const CACHE_VERSION = "1.7.0";
const CACHE = `wsie-shell-v${CACHE_VERSION}`;
const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/storage.js",
  "./js/data.js",
  "./js/nutrition.js",
  "./js/planner.js",
  "./js/shopping.js",
  "./js/ai.js",
  "./js/mealdb.js",
  "./js/spoonacular.js",
  "./js/version.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first, not cache-first: as long as there's a connection, always
// serve the live file and refresh the cache from it, so a deploy reaches
// this device the very next load — no waiting on the service-worker
// update lifecycle to notice a change first. The cache exists purely as
// an offline fallback (used only when the network request itself fails).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // let recipe photos / API calls pass through

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
