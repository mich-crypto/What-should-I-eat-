// Minimal offline shell so the installed Home Screen app opens instantly
// even with a flaky connection. Recipe photos and any AI calls still need
// the network; only the app shell is cached.
const CACHE = "wsie-shell-v1";
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // let recipe photos / API calls pass through

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
            return res;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});
