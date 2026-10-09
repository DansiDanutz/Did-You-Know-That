// Service worker: installable app + offline for returning visitors.
// - Installs the whole versioned app shell (precache.js, generated) up front.
// - Network first, so online players always get the newest version.
// - Offline: pages fall back to the cached game; scripts, styles and images
//   only ever come from their own cached copy (never an HTML page in their
//   place); narration audio, API calls and videos are not cached and fail
//   honestly, so the app can say what's unavailable.
importScripts("/precache.js");

const { version, files } = self.DYK_PRECACHE;
const CACHE = `dyk-shell-${version}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(files)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

const cacheable = (url) => url.origin === self.location.origin && !url.pathname.startsWith("/api/") && !url.pathname.includes("/narration/") && !url.pathname.includes("/voice/");

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !cacheable(url)) return;
  const isPage = event.request.mode === "navigate";
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(event.request, { ignoreSearch: isPage });
        if (hit) return hit;
        if (isPage) return (await caches.match("/index.html")) ?? Response.error();
        return Response.error();
      }),
  );
});
