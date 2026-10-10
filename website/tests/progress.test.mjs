import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseState, lockGuess, revealAnswer, unlockedCardIds, totalCards, rankFor, createStore, STORAGE_KEY } from "../js/lib/progress.js";

const catalog = JSON.parse(readFileSync(new URL("../data/episodes.json", import.meta.url), "utf8"));
const publishedCatalog = {
  ...catalog,
  episodes: catalog.episodes.map((e, i) => (i === 0 ? { ...e, status: "published", youtubeId: "TESTID00001", publishedAt: "2026-10-12" } : e)),
};

test("parseState survives garbage and keeps only valid entries", () => {
  assert.deepEqual(parseState(null), { guesses: {}, revealed: {} });
  assert.deepEqual(parseState("{not json"), { guesses: {}, revealed: {} });
  assert.deepEqual(parseState("[1,2]"), { guesses: {}, revealed: {} });
  assert.deepEqual(parseState(JSON.stringify({ guesses: { a: 1, b: -1, c: "x" }, revealed: { a: true, b: "yes" } })), {
    guesses: { a: 1 },
    revealed: { a: true },
  });
});

test("guess, then reveal, unlocks the episode's fact cards (immutably)", () => {
  // Arrange
  const start = parseState(null);
  // Act
  const guessed = lockGuess(start, "time-compressed", 1);
  const revealed = revealAnswer(guessed, "time-compressed");
  // Assert
  assert.deepEqual(start, { guesses: {}, revealed: {} }, "start state untouched");
  assert.deepEqual(unlockedCardIds(guessed, publishedCatalog), []);
  assert.equal(unlockedCardIds(revealed, publishedCatalog).length, 6);
  assert.ok(unlockedCardIds(revealed, publishedCatalog).includes("time-1500"));
});

test("revealing without a locked guess changes nothing", () => {
  const state = parseState(null);
  assert.equal(revealAnswer(state, "time-compressed"), state);
});

test("draft episodes never unlock cards, even with a stored reveal", () => {
  const state = { guesses: { "the-sun": 1 }, revealed: { "the-sun": true } };
  assert.deepEqual(unlockedCardIds(state, catalog), []);
});

test("ranks climb with collected cards and name the next goal", () => {
  assert.equal(rankFor(0).name, "Curious");
  assert.equal(rankFor(0).next.name, "Explorer");
  assert.equal(rankFor(3).name, "Explorer");
  assert.equal(rankFor(6).name, "Explorer");
  assert.equal(rankFor(9).name, "Time Traveler");
  assert.equal(rankFor(18).name, "Mystery Master");
  assert.equal(rankFor(40).next, null);
  assert.equal(totalCards(catalog), 12);
});

test("store falls back to memory when storage throws", () => {
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const store = createStore(() => throwing);
  assert.deepEqual(store.load(), { guesses: {}, revealed: {} });
  const next = lockGuess(store.load(), "x", 0);
  assert.equal(store.save(next), false);
  assert.deepEqual(store.load(), next, "memory keeps the progress for this visit");
  const noStorage = createStore(() => { throw new Error("SecurityError"); });
  assert.deepEqual(noStorage.load(), { guesses: {}, revealed: {} });
});

test("store round-trips through a working storage", () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const store = createStore(() => storage);
  assert.equal(store.save(lockGuess(store.load(), "time-compressed", 2)), true);
  assert.equal(JSON.parse(data.get(STORAGE_KEY)).guesses["time-compressed"], 2);
  assert.deepEqual(createStore(() => storage).load().guesses, { "time-compressed": 2 });
});
