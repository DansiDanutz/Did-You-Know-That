import { test } from "node:test";
import assert from "node:assert/strict";
import { currentHouseIndex, houseStatus } from "../js/lib/journey.js";

const stories = [
  { id: "a", card: { id: "ca" } },
  { id: "b", card: { id: "cb" } },
  { id: "c", card: { id: "cc" }, comingSoon: true },
];
const progressWith = (...cardIds) => ({ gates: {}, cards: Object.fromEntries(cardIds.map((id) => [id, { rarity: "gold" }])) });

test("a new player starts at the first house", () => {
  assert.equal(currentHouseIndex(stories, progressWith()), 0);
});

test("the player stands at the first house whose card is still locked", () => {
  assert.equal(currentHouseIndex(stories, progressWith("ca")), 1);
});

test("after every playable house the player waits at the first coming-soon house", () => {
  assert.equal(currentHouseIndex(stories, progressWith("ca", "cb")), 2);
});

test("with everything done and nothing upcoming the player stays at the last house", () => {
  const done = [stories[0], stories[1]];
  assert.equal(currentHouseIndex(done, progressWith("ca", "cb")), 1);
});

test("houseStatus labels each house for the map", () => {
  const progress = progressWith("ca");
  assert.equal(houseStatus(stories, progress, 0), "done");
  assert.equal(houseStatus(stories, progress, 1), "current");
  assert.equal(houseStatus(stories, progress, 2), "soon");
  assert.equal(houseStatus([...stories.slice(0, 2), { id: "d", card: { id: "cd" } }], progressWith(), 2), "locked");
});
