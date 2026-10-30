import { test } from "node:test";
import assert from "node:assert/strict";
import { lockedChoice, watchHref } from "../js/ui/hero-guess.js";

test("the home guess shows a guess already locked for that episode, and ignores one that no longer fits the options", () => {
  const state = { guesses: { weight: 2, light: 5 } };
  assert.equal(lockedChoice(state, "weight", 3), 2);
  assert.equal(lockedChoice(state, "light", 3), null, "an index past the options is stale");
  assert.equal(lockedChoice(state, "food", 3), null, "no guess yet");
  assert.equal(lockedChoice({ guesses: {} }, "weight", 3), null);
});

test("after the guess, the visitor lands on the episode's Watch step", () => {
  assert.equal(watchHref("/episodes/weight/"), "/episodes/weight/#player");
});
