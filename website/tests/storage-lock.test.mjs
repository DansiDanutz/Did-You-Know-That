import { test } from "node:test";
import assert from "node:assert/strict";

import { withStorageLock } from "../js/lib/storage-lock.js";

test("updates run one at a time under the named cross-tab lock when the browser has Web Locks", async () => {
  const names = [];
  let running = 0;
  let maxRunning = 0;
  let queue = Promise.resolve();
  const locks = {
    request: (name, work) => {
      names.push(name);
      queue = queue.then(async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await work();
        running -= 1;
      });
      return queue;
    },
  };
  await Promise.all([1, 2, 3].map(() => withStorageLock(() => new Promise((r) => setTimeout(r, 5)), locks)));
  assert.deepEqual(names, ["dexty-collection", "dexty-collection", "dexty-collection"]);
  assert.equal(maxRunning, 1);
});

test("without Web Locks the update still runs (single-tab safety only) and returns its result", async () => {
  assert.equal(await withStorageLock(() => 42, undefined), 42);
});
