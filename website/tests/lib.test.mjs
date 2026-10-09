import { test } from "node:test";
import assert from "node:assert/strict";

import { quizPoints, rarityFor, maxSparks, RARITY } from "../js/lib/scoring.js";
import { emptyProgress, withGateUnlocked, createStore } from "../js/lib/storage.js";
import { spreadFor, pageCountPadded, canGoNext } from "../js/lib/book-math.js";

// ---------------------------------------------------------------- watch tracker

test("quizPoints rewards first tries most", () => {
  assert.equal(quizPoints(1), 2);
  assert.equal(quizPoints(2), 1);
  assert.equal(quizPoints(3), 0);
});

test("maxSparks counts hidden sparks plus 2 per quiz", () => {
  const pages = [{ type: "story", spark: {} }, { type: "quiz" }, { type: "story" }, { type: "quiz" }];
  assert.equal(maxSparks(pages), 5);
});

test("rarityFor maps the share of sparks to a rarity tier", () => {
  assert.equal(rarityFor(10, 10), RARITY.LEGENDARY);
  assert.equal(rarityFor(9, 10), RARITY.LEGENDARY);
  assert.equal(rarityFor(6, 10), RARITY.GOLD);
  assert.equal(rarityFor(2, 10), RARITY.SILVER);
  assert.equal(rarityFor(0, 0), RARITY.SILVER);
});

// ---------------------------------------------------------------- storage

test("withGateUnlocked records the story without mutating", () => {
  const base = emptyProgress();
  const next = withGateUnlocked(base, "honey");
  assert.equal(next.gates.honey, true);
  assert.equal(base.gates.honey, undefined);
});

test("createStore round-trips and survives broken or missing storage", () => {
  const memory = new Map();
  const backend = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const store = createStore(backend);
  store.save(withGateUnlocked(emptyProgress(), "x"));
  assert.equal(store.load().gates.x, true);

  memory.set("dykt-progress-v1", "{not json");
  assert.deepEqual(store.load(), emptyProgress());

  const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  const safe = createStore(throwing);
  assert.deepEqual(safe.load(), emptyProgress());
  assert.doesNotThrow(() => safe.save(emptyProgress()));
  assert.deepEqual(createStore(null).load(), emptyProgress());
});

// ---------------------------------------------------------------- book math

test("pageCountPadded pads to an even number of faces", () => {
  assert.equal(pageCountPadded(5), 6);
  assert.equal(pageCountPadded(6), 6);
});

test("spreadFor maps a single-page position to flipped leaves and side", () => {
  assert.deepEqual(spreadFor(0), { flipped: 0, side: "right" });
  assert.deepEqual(spreadFor(1), { flipped: 1, side: "left" });
  assert.deepEqual(spreadFor(2), { flipped: 1, side: "right" });
  assert.deepEqual(spreadFor(3), { flipped: 2, side: "left" });
});

test("canGoNext requires every visible page to be complete", () => {
  const done = (i) => i !== 4;
  assert.equal(canGoNext([2, 3], done), true);
  assert.equal(canGoNext([3, 4], done), false);
});

