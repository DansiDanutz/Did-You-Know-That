// Audit (9 Oct 2026, stage 1): saves from two tabs must both survive, failed
// writes must be reported, and a corrupt learning record must not cost cards.
import { test } from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../js/lib/storage.js";
import { saveCard } from "../js/lib/collection.js";

const AT = "2026-10-09T12:00:00.000Z";
const memory = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test("two tabs saving different cards keep both", () => {
  const shared = memory();
  const tabA = createStore(shared);
  const tabB = createStore(shared);
  tabA.loadCollection(AT);
  tabB.loadCollection(AT); // tab B now holds a stale snapshot
  tabA.updateCollection((c) => saveCard(c, "kids", "card-a", AT), AT);
  tabB.updateCollection((c) => saveCard(c, "kids", "card-b", AT), AT);
  const saved = Object.keys(createStore(shared).loadCollection(AT).collection.saved.kids).sort();
  assert.deepEqual(saved, ["card-a", "card-b"]);
});

test("a failed write is reported, never claimed as saved", () => {
  const blocked = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
  const result = createStore(blocked).updateCollection((c) => saveCard(c, "kids", "card-a", AT), AT);
  assert.equal(result.persisted, false);
  assert.ok(result.collection.saved.kids["card-a"], "still usable for this visit");
  assert.equal(createStore(null).updateCollection((c) => c, AT).persisted, false, "no storage at all");
});

test("a corrupt learning record does not discard saved cards", () => {
  const shared = memory({
    "dexty-collection-v1": JSON.stringify({ saved: { kids: { "card-a": { savedAt: AT } }, adults: {} }, coins: [] }),
    "dexty-learning-v1": "{not json",
  });
  const { collection, learning } = createStore(shared).loadCollection(AT);
  assert.ok(collection.saved.kids["card-a"]);
  assert.deepEqual(learning, {});
});

test("learning updates merge with what another tab wrote", () => {
  const shared = memory();
  const tabA = createStore(shared);
  const tabB = createStore(shared);
  tabA.updateLearning((l) => ({ ...l, a: { readAt: AT } }));
  tabB.updateLearning((l) => ({ ...l, b: { readAt: AT } }));
  assert.deepEqual(Object.keys(createStore(shared).loadCollection(AT).learning).sort(), ["a", "b"]);
});
