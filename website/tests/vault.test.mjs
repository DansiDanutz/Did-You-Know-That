import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { spend, balance, parseLedger, award, spendEventId } from "../js/lib/ledger.js";
import { validateSpecialCards, cardStatus, unlockSpecialCard, conditionLabel, PLACEHOLDER_VIDEO_IDS } from "../js/lib/vault.js";
import { parseState, answerQuestion, pointsOf } from "../js/lib/progress.js";

const SITE = new URL("../", import.meta.url);
const special = JSON.parse(readFileSync(new URL("data/special-cards.json", SITE), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("data/episodes.json", SITE), "utf8"));
const episode = catalog.episodes[0];
const AT = "2026-10-11T10:00:00.000Z";
const byId = (id) => special.cards.find((c) => c.id === id);

/** A ledger holding `pts` points from quiz awards (10 each). */
function ledgerWith(pts) {
  return episode.quiz.questions.slice(0, pts / 10).reduce((ledger, q) => award(ledger, { type: "quiz", id: `quiz:${episode.slug}:${q.id}`, at: AT }).ledger, []);
}

test("the committed catalogue is valid, self-hosted and has no video yet", () => {
  assert.deepEqual(validateSpecialCards(special, { episodeSlugs: catalog.episodes.map((e) => e.slug) }), []);
  assert.equal(special.cards.length, 3);
  for (const card of special.cards) {
    assert.ok(existsSync(new URL(card.art.slice(1), SITE)), `${card.art} exists`);
    assert.equal(card.video.youtubeId, null, "special videos are not made yet: never a placeholder id");
  }
  const totalCost = special.cards.reduce((sum, c) => sum + c.cost, 0);
  assert.ok(totalCost <= 175, "a perfect Episode 01 player can open every card");
});

test("catalogue validation rejects bad cards, placeholder videos and unknown conditions", () => {
  const [card] = special.cards;
  const check = (patch) => validateSpecialCards({ cards: [{ ...card, ...patch }] }, { episodeSlugs: ["time-compressed"] });
  assert.ok(check({ id: "Bad Id" }).some((e) => e.includes("kebab")));
  assert.ok(check({ cost: 0 }).some((e) => e.includes("cost")));
  assert.ok(check({ cost: 2.5 }).some((e) => e.includes("cost")));
  assert.ok(check({ art: "https://example.com/a.png" }).some((e) => e.includes("self-hosted")));
  assert.ok(check({ title: "" }).some((e) => e.includes("title is required")));
  assert.ok(check({ accent: "pink" }).some((e) => e.includes("accent")));
  assert.ok(check({ condition: "watch:time-compressed" }).some((e) => e.includes("earnable event id")));
  assert.ok(check({ condition: "perfect:no-such-episode" }).some((e) => e.includes("unknown episode")));
  assert.deepEqual(check({ condition: "daily:2026-10-11" }), []);
  assert.ok(check({ video: { youtubeId: "short" } }).some((e) => e.includes("11-character")));
  assert.ok(check({ video: null }).some((e) => e.includes("video must be")));
  for (const id of PLACEHOLDER_VIDEO_IDS) assert.ok(check({ video: { youtubeId: id } }).some((e) => e.includes("placeholder")), id);
  assert.deepEqual(check({ video: { youtubeId: "AbCdEfGhIjK" } }), []);
  assert.ok(validateSpecialCards({ cards: [card, card] }).some((e) => e.includes("duplicate")));
  assert.deepEqual(validateSpecialCards(null), ["special-cards.json must be an object with a cards array"]);
});

test("spend: buys once, is idempotent, and never overspends", () => {
  const ledger = ledgerWith(50);
  const first = spend(ledger, { cardId: "night-slept-twice", cost: 40, at: AT });
  assert.equal(first.error, null);
  assert.deepEqual(first.spent, { id: "spend:card:night-slept-twice", type: "spend", pts: 40, at: AT });
  assert.equal(balance(first.ledger), 10);
  assert.equal(ledger.length, 5, "original ledger untouched");
  const again = spend(first.ledger, { cardId: "night-slept-twice", cost: 40, at: AT });
  assert.equal(again.ledger, first.ledger);
  assert.equal(again.spent, null);
  const tooMuch = spend(first.ledger, { cardId: "watch-crossed-atlantic", cost: 80, at: AT });
  assert.equal(tooMuch.error, "insufficient");
  assert.equal(tooMuch.ledger, first.ledger);
  assert.equal(balance(tooMuch.ledger), 10);
  assert.throws(() => spend([], { cardId: "Bad Id", cost: 1, at: AT }), /not a card id/);
  assert.throws(() => spend([], { cardId: "x", cost: 0, at: AT }), /positive cost/);
  assert.throws(() => spend([], { cardId: "x", cost: 1, at: "now" }), /timestamp/);
});

test("a stored ledger can never show a negative balance (forged spends are dropped)", () => {
  const forged = parseLedger([
    { id: "quiz:time-compressed:q1500", type: "quiz", pts: 10, at: AT },
    { id: "spend:card:watch-crossed-atlantic", type: "spend", pts: 80, at: AT },
    { id: "quiz:time-compressed:q1652", type: "quiz", pts: 10, at: AT },
  ]);
  assert.deepEqual(forged.map((e) => e.id), ["quiz:time-compressed:q1500", "quiz:time-compressed:q1652"]);
  assert.equal(balance(forged), 20);
});

test("cardStatus reports owned, affordability, condition and missing points", () => {
  const night = byId("night-slept-twice");
  assert.deepEqual({ ...cardStatus(ledgerWith(30), night) }, { owned: false, conditionMet: true, affordable: false, canUnlock: false, shortBy: 10, points: 30 });
  assert.equal(cardStatus(ledgerWith(40), night).canUnlock, true);
});

test("condition gating: Keynes needs a perfect Episode 01 as well as points", () => {
  const keynes = byId("keynes-missing-hours");
  assert.equal(keynes.condition, "perfect:time-compressed");
  const rich = { ...parseState(null), ledger: ledgerWith(80) };
  const blocked = unlockSpecialCard(rich, keynes, AT);
  assert.deepEqual({ ok: blocked.ok, reason: blocked.reason }, { ok: false, reason: "condition" });
  assert.equal(blocked.state, rich);
  // Play the whole quiz perfectly: the condition is met through the ledger.
  const perfect = episode.quiz.questions.reduce((state, q) => answerQuestion(state, episode, q.id, q.answerIndex, AT).state, parseState(null));
  assert.ok(perfect.ledger.some((e) => e.id === "perfect:time-compressed"));
  const bought = unlockSpecialCard(perfect, keynes, AT);
  assert.equal(bought.ok, true);
  assert.equal(pointsOf(bought.state), pointsOf(perfect) - keynes.cost);
  assert.ok(cardStatus(bought.state.ledger, keynes).owned);
});

test("unlocking twice spends once; not enough points spends nothing; ownership survives a reload", () => {
  const watch = byId("watch-crossed-atlantic");
  const poor = { ...parseState(null), ledger: ledgerWith(70) };
  const refused = unlockSpecialCard(poor, watch, AT);
  assert.deepEqual({ ok: refused.ok, reason: refused.reason }, { ok: false, reason: "insufficient" });
  assert.equal(pointsOf(refused.state), 70);
  const rich = { ...parseState(null), ledger: ledgerWith(80) };
  const once = unlockSpecialCard(rich, watch, AT);
  const twice = unlockSpecialCard(once.state, watch, AT);
  assert.deepEqual({ ok: twice.ok, reason: twice.reason }, { ok: true, reason: "owned" });
  assert.equal(twice.state, once.state);
  assert.equal(pointsOf(twice.state), 0);
  const reloaded = parseState(JSON.stringify(twice.state));
  assert.ok(reloaded.ledger.some((e) => e.id === spendEventId(watch.id)));
  assert.ok(cardStatus(reloaded.ledger, watch).owned);
});

test("condition labels read as plain language", () => {
  assert.equal(conditionLabel("perfect:time-compressed", { "time-compressed": "Time, Compressed" }), "Get every answer right first time in “Time, Compressed”");
  assert.equal(conditionLabel("cards:x"), "Collect every card of “x”");
  assert.equal(conditionLabel("daily:2026-10-11"), "Answer that day’s question");
  assert.equal(conditionLabel("odd"), "odd");
});
