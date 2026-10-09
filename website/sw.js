// Service worker: makes the game installable and opens it offline.
// Network first, so players always get the newest version when online; the
// cached copy is only a fallback. Narration audio and YouTube are never cached.
const CACHE = "dyk-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/assets/logo.png", "/assets/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

const cacheable = (url) => url.origin === self.location.origin && !url.pathname.startsWith("/api/") && !url.pathname.includes("/narration/");

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !cacheable(url)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((hit) => hit ?? caches.match("/index.html"))),
  );
});
