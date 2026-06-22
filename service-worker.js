// Tribe service worker — makes the hosted app load instantly & work offline.
// App shell = index.html. Network-first so online users always get the latest;
// offline falls back to the cached copy. CDN/Supabase calls pass straight to the network.
const CACHE = "tribe-shell-v1";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                      // never intercept writes
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // CDN / Supabase → straight to network

  // app shell (the page itself): network-first, fall back to cached shell when offline
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // other same-origin GETs: cache-first
  e.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
