// Retirement service worker. The old companion game installed a caching service worker at /sw.js;
// browsers that still have it will fetch this file, install it, and it removes itself and every
// cache so returning visitors see the new site. The new site registers no service worker.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.all(clients.map((client) => client.navigate(client.url).catch(() => undefined)));
    })(),
  );
});
