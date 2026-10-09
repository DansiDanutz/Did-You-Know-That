import { test } from "node:test";
import assert from "node:assert/strict";

import { COINS_PER_RARITY, coinsOnRoad, withCoinCollected, coinTotal } from "../js/lib/coins.js";
import { nearestStop, clampRoad } from "../js/lib/journey.js";
import { emptyProgress, normalizeProgress } from "../js/lib/storage.js";

const stories = [{ id: "a", card: { id: "ca" } }, { id: "b", card: { id: "cb" } }, { id: "c", card: { id: "cc" }, comingSoon: true }];
const cards = { ca: { rarity: "gold" }, cb: { rarity: "silver" } };

test("each earned card drops coins by rarity: silver 5, gold 10, legendary 20", () => {
  assert.deepEqual(COINS_PER_RARITY, { silver: 5, gold: 10, legendary: 20 });
  const coins = coinsOnRoad(stories, cards, []);
  assert.equal(coins.filter((c) => c.house === 0).length, 10);
  assert.equal(coins.filter((c) => c.house === 1).length, 5);
});

test("coins sit on the road after their house, evenly spread, with stable ids", () => {
  const coins = coinsOnRoad(stories, cards, []).filter((c) => c.house === 0);
  assert.equal(coins[0].id, "a:0");
  assert.ok(coins.every((c) => c.t > 0 && c.t < 1));
  assert.ok(coins.every((c, i, all) => i === 0 || c.t > all[i - 1].t), "ordered along the road");
});

test("collected coins disappear from the road", () => {
  const coins = coinsOnRoad(stories, cards, ["a:0", "a:1"]);
  assert.ok(!coins.some((c) => c.id === "a:0" || c.id === "a:1"));
  assert.equal(coins.length, 13);
});

test("collecting is immutable, idempotent and counted", () => {
  const p0 = emptyProgress();
  const p1 = withCoinCollected(p0, "a:3");
  assert.deepEqual(p0.coins, []);
  assert.deepEqual(p1.coins, ["a:3"]);
  assert.equal(withCoinCollected(p1, "a:3"), p1);
  assert.equal(coinTotal(p1), 1);
});

test("stored progress keeps coins and repairs a missing list", () => {
  assert.deepEqual(normalizeProgress({ cards: { kids: {}, adults: {} }, gates: {}, coins: ["x:1"] }).coins, ["x:1"]);
  assert.deepEqual(normalizeProgress({ cards: { kids: {}, adults: {} }, gates: {} }).coins, []);
  assert.deepEqual(normalizeProgress({ cards: {}, gates: {}, coins: "lots" }).coins, []);
});

test("nearestStop finds a house within reach, otherwise none", () => {
  const stops = [100, 900, 1700];
  assert.equal(nearestStop(130, stops, 80), 0);
  assert.equal(nearestStop(500, stops, 80), -1);
  assert.equal(nearestStop(1650, stops, 80), 2);
});

test("clampRoad keeps Daxter between the start sign and the last house", () => {
  assert.equal(clampRoad(-50, 20, 1700), 20);
  assert.equal(clampRoad(5000, 20, 1700), 1700);
  assert.equal(clampRoad(600, 20, 1700), 600);
});
