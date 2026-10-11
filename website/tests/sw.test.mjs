import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SOURCE = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const ORIGIN = "https://dexty.live";

/** A tiny Cache Storage + fetch fake, enough to drive the worker's handlers. */
function harness({ online = true, existingCaches = [] } = {}) {
  const stores = new Map(existingCaches.map((name) => [name, new Map()]));
  const listeners = {};
  const navigated = [];
  const fetched = [];
  const fetchModes = [];
  const state = { skipped: false, claimed: false, online };
  const keyOf = (request) => (typeof request === "string" ? new URL(request, ORIGIN).href : request.url);
  const cacheApi = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      match: async (request) => store.get(keyOf(request)),
      put: async (request, response) => void store.set(keyOf(request), response),
      addAll: async (requests) => requests.forEach((request) => store.set(keyOf(request), response(`precached ${keyOf(request)}`))),
      keys: async () => [...store.keys()],
      delete: async (key) => store.delete(key),
    };
  };
  const response = (body, { ok = true, type = "basic" } = {}) => ({ body, ok, type, clone() { return response(body, { ok, type }); } });
  const sandbox = {
    URL,
    Request: class { constructor(url, init) { this.url = new URL(url, ORIGIN).href; this.init = init; } },
    Response: { error: () => response("network error", { ok: false, type: "error" }) },
    fetch: async (request, init) => {
      fetched.push(keyOf(request));
      fetchModes.push(init?.cache);
      if (!state.online) throw new TypeError("offline");
      return response(`network ${keyOf(request)}`);
    },
    caches: {
      open: async (name) => cacheApi(name),
      keys: async () => [...stores.keys()],
      delete: async (name) => stores.delete(name),
      match: async (request) => {
        for (const store of stores.values()) if (store.has(keyOf(request))) return store.get(keyOf(request));
        return undefined;
      },
    },
    self: {
      location: new URL(ORIGIN),
      addEventListener: (type, fn) => (listeners[type] = fn),
      skipWaiting: () => (state.skipped = true),
      clients: {
        claim: async () => (state.claimed = true),
        matchAll: async () => [{ url: `${ORIGIN}/`, navigate: async (url) => navigated.push(url) }],
      },
    },
  };
  vm.runInNewContext(SOURCE, sandbox);
  const run = async (type, event) => {
    let work;
    listeners[type]({ ...event, waitUntil: (promise) => (work = promise) });
    await work;
  };
  const request = (path, { method = "GET", mode = "cors", headers = {} } = {}) => ({ url: new URL(path, ORIGIN).href, method, mode, headers: { has: (name) => name in headers } });
  const fetchEvent = async (req) => {
    let responded = null;
    const pending = [];
    listeners.fetch({ request: req, respondWith: (promise) => (responded = promise), waitUntil: (p) => pending.push(p) });
    const result = responded ? await responded : null;
    await Promise.all(pending);
    return result;
  };
  return { run, request, fetchEvent, stores, state, navigated, fetched, fetchModes, response };
}

test("the shell list is stamped by the build: versioned, and every file exists", () => {
  const version = /const VERSION = "([0-9a-f]{12})";/.exec(SOURCE)?.[1];
  assert.ok(version, "build-stamped version");
  const precache = JSON.parse(/const PRECACHE = (\[[\s\S]*?\]);/.exec(SOURCE)[1]);
  for (const url of ["/", "/offline/", "/css/site.css", "/js/site.js", "/manifest.webmanifest", "/assets/brand/avatar-192.webp"]) assert.ok(precache.includes(url), url);
  assert.ok(precache.some((url) => url.startsWith("/fonts/")));
  assert.ok(precache.every((url) => !/^https?:/.test(url)), "only our own files");
});

test("install precaches the shell; activate deletes old caches (the game's too) and reloads its tabs", async () => {
  const h = harness({ existingCaches: ["dyk-shell-abc", "dexty-shell-old", "dexty-runtime-v1"] });
  await h.run("install", {});
  assert.equal(h.state.skipped, true);
  const shell = [...h.stores.keys()].find((name) => /^dexty-shell-[0-9a-f]{12}$/.test(name));
  assert.ok(h.stores.get(shell).has(`${ORIGIN}/offline/`));
  await h.run("activate", {});
  assert.deepEqual([...h.stores.keys()].sort(), ["dexty-runtime-v1", shell].sort());
  assert.equal(h.state.claimed, true);
  assert.deepEqual(h.navigated, [`${ORIGIN}/`], "tabs served by the old game reload");
});

test("an update of our own shell does not reload open tabs", async () => {
  const h = harness({ existingCaches: ["dexty-shell-old"] });
  await h.run("install", {});
  await h.run("activate", {});
  assert.deepEqual(h.navigated, []);
});

test("pages are network-first, then the cached copy, then the offline page", async () => {
  const h = harness();
  await h.run("install", {});
  const page = h.request("/episodes/the-sun/", { mode: "navigate" });
  assert.equal((await h.fetchEvent(page)).body, `network ${ORIGIN}/episodes/the-sun/`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  h.state.online = false;
  assert.equal((await h.fetchEvent(page)).body, `network ${ORIGIN}/episodes/the-sun/`, "cached copy offline");
  assert.equal((await h.fetchEvent(h.request("/subject/water/", { mode: "navigate" }))).body, `precached ${ORIGIN}/offline/`);
});

test("episodes.json and artwork are stale-while-revalidate", async () => {
  const h = harness();
  await h.run("install", {});
  const data = h.request("/data/episodes.json");
  assert.equal((await h.fetchEvent(data)).body, `precached ${ORIGIN}/data/episodes.json`, "answers from cache at once");
  assert.ok(h.fetched.includes(`${ORIGIN}/data/episodes.json`), "and refreshes in the background");
  assert.equal((await h.fetchEvent(data)).body, `network ${ORIGIN}/data/episodes.json`, "next time: the refreshed copy");
  const art = h.request("/assets/episodes/time-compressed/thumb.webp");
  assert.equal((await h.fetchEvent(art)).body, `network ${ORIGIN}/assets/episodes/time-compressed/thumb.webp`);
});

test("third-party, non-GET and range requests are never intercepted or cached", async () => {
  const h = harness();
  for (const req of [
    h.request("https://www.youtube-nocookie.com/embed/x"),
    h.request("https://i.ytimg.com/vi/x/hqdefault.jpg"),
    h.request("https://buttondown.com/api/emails/embed-subscribe/x", { method: "POST" }),
    h.request("/assets/narration/a.mp3", { headers: { range: "bytes=0-" } }),
    h.request("/sw.js"),
  ]) assert.equal(await h.fetchEvent(req), null, req.url);
  assert.deepEqual(h.fetched, []);
});

test("after a deploy, the first load runs the new scripts and styles, not the previous build's", async () => {
  const h = harness();
  await h.run("install", {});
  for (const path of ["/js/ui/collection.js", "/js/lib/ledger.js", "/css/site.css"]) {
    assert.equal((await h.fetchEvent(h.request(path))).body, `network ${ORIGIN}${path}`, path);
  }
  assert.deepEqual(h.fetchModes, ["no-cache", "no-cache", "no-cache"], "revalidated even if the HTTP cache thinks its copy is fresh");
});

test("scripts and styles fall back to the freshest cached copy offline, never to the offline page", async () => {
  const h = harness();
  await h.run("install", {});
  const script = h.request("/js/ui/collection.js");
  await h.fetchEvent(script);
  h.state.online = false;
  assert.equal((await h.fetchEvent(script)).body, `network ${ORIGIN}/js/ui/collection.js`, "copy refreshed by the last online load");
  assert.equal((await h.fetchEvent(h.request("/js/lib/ledger.js"))).body, `precached ${ORIGIN}/js/lib/ledger.js`);
  const missing = await h.fetchEvent(h.request("/js/ui/not-shipped.js"));
  assert.equal(missing.ok, false, "a script request never receives HTML");
});

test("fonts and icons stay cache-first", async () => {
  const h = harness();
  await h.run("install", {});
  assert.equal((await h.fetchEvent(h.request("/fonts/inter-latin-400-normal.woff2"))).body, `precached ${ORIGIN}/fonts/inter-latin-400-normal.woff2`);
  assert.deepEqual(h.fetched, [], "served without touching the network");
});
