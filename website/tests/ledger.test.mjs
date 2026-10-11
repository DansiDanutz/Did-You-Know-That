import { test } from "node:test";
import assert from "node:assert/strict";

import {
  POINTS, award, balance, parseLedger, earnedFor, quizEventId, guessEventId, perfectEventId, cardsEventId, dailyEventId, isValidEventId,
} from "../js/lib/ledger.js";

const AT = "2026-10-11T10:00:00.000Z";

test("point values match the approved v3 plan", () => {
  assert.deepEqual({ ...POINTS }, { quiz: 10, guess: 25, perfect: 50, cards: 20, daily: 5 });
  assert.ok(Object.isFrozen(POINTS));
});

test("event ids say what was earned and where", () => {
  assert.equal(quizEventId("time-compressed", "q1500"), "quiz:time-compressed:q1500");
  assert.equal(guessEventId("time-compressed"), "guess:time-compressed");
  assert.equal(perfectEventId("time-compressed"), "perfect:time-compressed");
  assert.equal(cardsEventId("time-compressed"), "cards:time-compressed");
  assert.equal(dailyEventId("2026-10-11"), "daily:2026-10-11");
  assert.ok(isValidEventId("daily", "daily:2026-10-11"));
  assert.ok(!isValidEventId("daily", "daily:2026-13-45x"));
  assert.ok(!isValidEventId("quiz", "guess:time-compressed"));
  assert.ok(!isValidEventId("quiz", "quiz:Time Compressed:q1"));
});

test("award appends one event with the plan's points, without mutating the ledger", () => {
  // Arrange
  const start = [];
  // Act
  const { ledger, awarded } = award(start, { type: "quiz", id: quizEventId("time-compressed", "q1500"), at: AT });
  // Assert
  assert.deepEqual(start, [], "original ledger untouched");
  assert.deepEqual(awarded, { id: "quiz:time-compressed:q1500", type: "quiz", pts: 10, at: AT });
  assert.deepEqual(ledger, [awarded]);
  assert.equal(balance(ledger), 10);
});

test("awards are idempotent by event id: replaying or refreshing never double-counts", () => {
  const once = award([], { type: "perfect", id: perfectEventId("time-compressed"), at: AT }).ledger;
  const again = award(once, { type: "perfect", id: perfectEventId("time-compressed"), at: "2027-01-01T00:00:00.000Z" });
  assert.equal(again.ledger, once, "same ledger object comes back");
  assert.equal(again.awarded, null);
  assert.equal(balance(again.ledger), 50);
  // A reload parses the stored ledger and still refuses the duplicate.
  const reloaded = parseLedger(JSON.parse(JSON.stringify(once)));
  assert.equal(award(reloaded, { type: "perfect", id: perfectEventId("time-compressed"), at: AT }).awarded, null);
});

test("only known award types with matching ids can earn points — nothing exists for watching", () => {
  for (const type of ["watch", "watched", "view", "play", "click", "like", "subscribe", "spend"]) {
    assert.throws(() => award([], { type, id: `${type}:time-compressed`, at: AT }), /unknown award type/, type);
  }
  assert.throws(() => award([], { type: "quiz", id: "guess:time-compressed", at: AT }), /does not match/);
  assert.throws(() => award([], { type: "quiz", id: quizEventId("time-compressed", "q1"), at: "yesterday" }), /timestamp/);
  assert.throws(() => award([], { type: "quiz", id: quizEventId("time-compressed", "q1"), at: AT, pts: 999 }), /points are fixed/);
});

test("the daily event is reserved for phase 3 and already awards 5 points once per date", () => {
  const first = award([], { type: "daily", id: dailyEventId("2026-10-11"), at: AT }).ledger;
  const second = award(first, { type: "daily", id: dailyEventId("2026-10-12"), at: AT }).ledger;
  assert.equal(balance(award(second, { type: "daily", id: dailyEventId("2026-10-12"), at: AT }).ledger), 10);
});

test("balance subtracts spends (reserved for the phase 2 Card Vault)", () => {
  const ledger = parseLedger([
    { id: "quiz:time-compressed:q1500", type: "quiz", pts: 10, at: AT },
    { id: "guess:time-compressed", type: "guess", pts: 25, at: AT },
    { id: "spend:card:watch-h4", type: "spend", pts: 30, at: AT },
  ]);
  assert.equal(ledger.length, 3);
  assert.equal(balance(ledger), 5);
});

test("parseLedger drops forged, malformed and duplicate events", () => {
  const ledger = parseLedger([
    { id: "quiz:time-compressed:q1500", type: "quiz", pts: 10, at: AT },
    { id: "quiz:time-compressed:q1500", type: "quiz", pts: 10, at: AT },
    { id: "quiz:time-compressed:q1652", type: "quiz", pts: 1000, at: AT },
    { id: "watch:time-compressed", type: "watch", pts: 10, at: AT },
    { id: "guess:time-compressed", type: "guess", pts: 25, at: "not a date" },
    { id: "spend:card:x", type: "spend", pts: -5, at: AT },
    null,
    "quiz",
  ]);
  assert.deepEqual(ledger.map((e) => e.id), ["quiz:time-compressed:q1500"]);
  assert.deepEqual(parseLedger("nope"), []);
  assert.deepEqual(parseLedger(undefined), []);
});

test("earnedFor sums an episode's awards only", () => {
  const ledger = parseLedger([
    { id: "quiz:time-compressed:q1500", type: "quiz", pts: 10, at: AT },
    { id: "perfect:time-compressed", type: "perfect", pts: 50, at: AT },
    { id: "quiz:the-sun:q1500", type: "quiz", pts: 10, at: AT },
    { id: "daily:2026-10-11", type: "daily", pts: 5, at: AT },
  ]);
  assert.equal(earnedFor(ledger, "time-compressed"), 60);
  assert.equal(earnedFor(ledger, "the-sun"), 10);
  assert.equal(earnedFor(ledger, "time"), 0, "slug match is exact");
});
