// The daily "Did you know?" question: deterministic per date, 5 points once per day for a right
// first answer, skipping costs nothing, storage stays bounded.
import { test } from "node:test";
import assert from "node:assert/strict";

import { dailyPool, dailyFor, answerDaily, skipDaily, dailyStatus, parseDaily, dayNumber, strideFor, localIsoDate, DAILY_HISTORY_DAYS } from "../js/lib/daily.js";
import { parseState, pointsOf } from "../js/lib/progress.js";
import { POINTS } from "../js/lib/ledger.js";
import { loadCatalog, loadDraftCatalog } from "./fixtures.mjs";

const catalog = loadCatalog();
const AT = "2026-10-12T09:00:00.000Z";
const empty = () => parseState(null);
const DAY = "2026-10-12";
const rightChoice = (date) => dailyFor(catalog, date).question.answerIndex;
const wrongChoice = (date) => (rightChoice(date) + 1) % dailyFor(catalog, date).question.options.length;
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

test("the pool holds every published episode's questions, in a stable order; drafts never take part", () => {
  const pool = dailyPool(catalog);
  assert.equal(pool.length, 16);
  assert.deepEqual([...new Set(pool.map((p) => p.slug))], ["time-compressed", "the-sun"]);
  assert.ok(pool.every((p) => p.card && p.card.id === p.question.card), "every daily question shows its fact card");
  assert.deepEqual(dailyPool(loadDraftCatalog()), []);
  assert.equal(dailyFor(loadDraftCatalog(), DAY), null);
});

test("the same date always gives the same question, and 16 days in a row cover all 16 without repeats", () => {
  assert.deepEqual(dailyFor(catalog, DAY), dailyFor(catalog, DAY));
  const ids = Array.from({ length: 16 }, (_, i) => {
    const pick = dailyFor(catalog, addDays(DAY, i));
    return `${pick.slug}:${pick.question.id}`;
  });
  assert.equal(new Set(ids).size, 16);
});

test("date helpers: day numbers ignore time zones, strides are coprime, local dates are YYYY-MM-DD", () => {
  assert.equal(dayNumber("1970-01-02"), 1);
  assert.equal(dayNumber("2026-10-13") - dayNumber("2026-10-12"), 1);
  assert.throws(() => dayNumber("12/10/2026"), /YYYY-MM-DD/);
  assert.equal(strideFor(16), 7);
  assert.equal(strideFor(14), 9);
  assert.equal(strideFor(1), 7);
  assert.equal(localIsoDate(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
});

test("a right first answer earns 5 points once per day — refreshing or answering again never adds more", () => {
  const first = answerDaily(empty(), catalog, DAY, rightChoice(DAY), AT);
  assert.equal(first.correct, true);
  assert.deepEqual(first.awards.map((a) => [a.id, a.pts]), [[`daily:${DAY}`, POINTS.daily]]);
  assert.equal(pointsOf(first.state), 5);
  const again = answerDaily(first.state, catalog, DAY, rightChoice(DAY), AT);
  assert.deepEqual(again.awards, []);
  assert.equal(pointsOf(again.state), 5);
  assert.equal(dailyStatus(again.state, DAY), "done");
  const tomorrow = addDays(DAY, 1);
  const next = answerDaily(again.state, catalog, tomorrow, rightChoice(tomorrow), AT);
  assert.equal(pointsOf(next.state), 10, "a new day, a new question");
});

test("a wrong first answer earns nothing, can be retried for 0 points, and is never punished", () => {
  const wrong = answerDaily(empty(), catalog, DAY, wrongChoice(DAY), AT);
  assert.equal(wrong.correct, false);
  assert.equal(dailyStatus(wrong.state, DAY), "retry");
  const solved = answerDaily(wrong.state, catalog, DAY, rightChoice(DAY), AT);
  assert.equal(solved.correct, true);
  assert.deepEqual(solved.awards, []);
  assert.equal(pointsOf(solved.state), 0);
  assert.equal(dailyStatus(solved.state, DAY), "done");
});

test("skipping shows the fact, costs nothing, and the day can no longer earn points", () => {
  const skipped = skipDaily(empty(), DAY);
  assert.equal(dailyStatus(skipped, DAY), "done");
  assert.equal(pointsOf(skipped), 0);
  const after = answerDaily(skipped, catalog, DAY, rightChoice(DAY), AT);
  assert.deepEqual(after.awards, [], "no points after the fact was shown");
  assert.equal(skipDaily(after.state, DAY), after.state, "skipping an answered day changes nothing");
});

test("after a wrong first try, \"just show me the fact\" still works and the day is done", () => {
  const wrong = answerDaily(empty(), catalog, DAY, wrongChoice(DAY), AT).state;
  const skipped = skipDaily(wrong, DAY);
  assert.equal(dailyStatus(skipped, DAY), "done");
  assert.deepEqual(skipped.daily[DAY], { first: wrongChoice(DAY), solved: false, skipped: true });
  assert.deepEqual(parseDaily(skipped.daily), skipped.daily, "the stored shape survives a reload");
  assert.equal(pointsOf(skipped), 0);
});

test("bad input never changes progress", () => {
  const state = empty();
  assert.equal(answerDaily(state, catalog, "not-a-date", 0, AT).state, state);
  assert.equal(answerDaily(state, catalog, DAY, 9, AT).state, state);
  assert.equal(answerDaily(state, catalog, DAY, -1, AT).state, state);
  assert.equal(answerDaily(state, loadDraftCatalog(), DAY, 0, AT).state, state);
  assert.equal(skipDaily(state, "yesterday"), state);
});

test("stored attempts are validated and capped, and survive a save/load round trip", () => {
  const stored = { "2026-10-12": { first: 1, solved: true }, "2026-10-11": { first: null, solved: false, skipped: true }, bad: { first: 0, solved: true }, "2026-10-10": { first: -2, solved: true }, "2026-10-09": { first: 0 } };
  assert.deepEqual(parseDaily(stored), { "2026-10-11": { first: null, solved: false, skipped: true }, "2026-10-12": { first: 1, solved: true } });
  assert.deepEqual(parseDaily("nope"), {});
  const many = Object.fromEntries(Array.from({ length: DAILY_HISTORY_DAYS + 20 }, (_, i) => [addDays("2026-01-01", i), { first: 0, solved: true }]));
  const kept = Object.keys(parseDaily(many));
  assert.equal(kept.length, DAILY_HISTORY_DAYS);
  assert.equal(kept.at(-1), addDays("2026-01-01", DAILY_HISTORY_DAYS + 19), "the newest days are kept");
  const { state } = answerDaily(empty(), catalog, DAY, rightChoice(DAY), AT);
  const reloaded = parseState(JSON.stringify(state));
  assert.deepEqual(reloaded.daily, state.daily);
  assert.equal(pointsOf(reloaded), 5);
});
