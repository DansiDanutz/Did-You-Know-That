import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// /sw.js replaces the old game's caching service worker: it must delete every cache,
// unregister itself and reload open tabs so returning visitors get the new site.
test("the retirement service worker clears caches, unregisters and reloads clients", async () => {
  // Arrange
  const listeners = {};
  const deleted = [];
  const navigated = [];
  let unregistered = false;
  let skipped = false;
  const sandbox = {
    caches: { keys: async () => ["dyk-shell-abc", "other"], delete: async (key) => deleted.push(key) },
    self: {
      addEventListener: (type, fn) => (listeners[type] = fn),
      skipWaiting: () => (skipped = true),
      registration: { unregister: async () => (unregistered = true) },
      clients: { matchAll: async () => [{ url: "https://dexty.live/", navigate: async (url) => navigated.push(url) }] },
    },
  };
  vm.runInNewContext(readFileSync(new URL("../sw.js", import.meta.url), "utf8"), sandbox);

  // Act
  listeners.install();
  let work;
  listeners.activate({ waitUntil: (promise) => (work = promise) });
  await work;

  // Assert
  assert.equal(skipped, true);
  assert.deepEqual(deleted, ["dyk-shell-abc", "other"]);
  assert.equal(unregistered, true);
  assert.deepEqual(navigated, ["https://dexty.live/"]);
  assert.equal(listeners.fetch, undefined, "it must not intercept requests");
});
