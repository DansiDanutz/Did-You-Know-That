import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog, loadDraftCatalog } from "./fixtures.mjs";

import {
  parseState, migrateV1, lockGuess, answerQuestion, quizSummary, quizStarted, unlockedCardIds, totalCards, maxPointsFor, pointsOf,
  rankFor, hasQuiz, createStore, STORAGE_KEY, LEGACY_STORAGE_KEY, RANKS,
} from "../js/lib/progress.js";
import { shuffledOrder } from "../js/lib/shuffle.js";

const catalog = loadCatalog();
const draftCatalog = loadDraftCatalog();
const episode = catalog.episodes.find((e) => e.slug === "time-compressed");
const questions = episode.quiz.questions;
const AT = "2026-10-11T10:00:00.000Z";
const empty = () => parseState(null);
const wrongChoice = (q) => (q.answerIndex + 1) % q.options.length;

/** Answers every question; `wrongFirst` lists question ids answered wrong first, then right. */
function playAll(start, { wrongFirst = [] } = {}) {
  let state = start;
  const awards = [];
  for (const q of questions) {
    if (wrongFirst.includes(q.id)) {
      const miss = answerQuestion(state, episode, q.id, wrongChoice(q), AT);
      state = miss.state;
      awards.push(...miss.awards);
    }
    const hit = answerQuestion(state, episode, q.id, q.answerIndex, AT);
    state = hit.state;
    awards.push(...hit.awards);
  }
  return { state, awards };
}

test("parseState survives garbage and keeps only valid entries", () => {
  const blank = { guesses: {}, answers: {}, legacyRevealed: {}, ledger: [] };
  assert.deepEqual(parseState(null), blank);
  assert.deepEqual(parseState("{not json"), blank);
  assert.deepEqual(parseState("[1,2]"), blank);
  const parsed = parseState(JSON.stringify({
    guesses: { a: 1, b: -1, c: "x" },
    answers: { "time-compressed:q1500": { first: 0, solved: true }, "bad key": { first: 0, solved: true }, "x:y": { first: -1, solved: true } },
    ledger: [{ id: "quiz:time-compressed:q1500", type: "quiz", pts: 10, at: AT }, { id: "watch:x", type: "watch", pts: 10, at: AT }],
  }));
  assert.deepEqual(parsed.guesses, { a: 1 });
  assert.deepEqual(parsed.answers, { "time-compressed:q1500": { first: 0, solved: true } });
  assert.equal(parsed.ledger.length, 1);
});

test("episode 01 has an 8-question quiz; episode 02 has none yet", () => {
  assert.equal(questions.length, 8);
  assert.ok(hasQuiz(episode));
  assert.equal(hasQuiz(catalog.episodes.find((e) => e.slug === "the-sun")), false);
  assert.equal(maxPointsFor(catalog), 8 * 10 + 25 + 50 + 20);
});

test("a correct first attempt earns 10 points and unlocks that era's card (immutably)", () => {
  // Arrange
  const start = lockGuess(empty(), episode.slug, 1, episode);
  const [q] = questions;
  // Act
  const result = answerQuestion(start, episode, q.id, q.answerIndex, AT);
  // Assert
  assert.equal(result.correct, true);
  assert.equal(result.firstTry, true);
  assert.deepEqual(result.awards.map((a) => [a.id, a.pts]), [[`quiz:${episode.slug}:${q.id}`, 10]]);
  assert.equal(pointsOf(result.state), 10);
  assert.deepEqual(unlockedCardIds(result.state, catalog), [q.card]);
  assert.deepEqual(start.answers, {}, "start state untouched");
  assert.equal(start.ledger.length, 0);
});

test("first-try rule: a wrong first attempt can still be solved for 0 points and still unlocks the card", () => {
  const [q] = questions;
  const miss = answerQuestion(empty(), episode, q.id, wrongChoice(q), AT);
  assert.equal(miss.correct, false);
  assert.deepEqual(miss.awards, []);
  assert.deepEqual(unlockedCardIds(miss.state, catalog), []);
  const retry = answerQuestion(miss.state, episode, q.id, q.answerIndex, AT);
  assert.equal(retry.correct, true);
  assert.equal(retry.firstTry, false);
  assert.deepEqual(retry.awards, []);
  assert.equal(pointsOf(retry.state), 0);
  assert.deepEqual(unlockedCardIds(retry.state, catalog), [q.card]);
});

test("replaying a solved question, or answering after a refresh, never double-awards", () => {
  const [q] = questions;
  const once = answerQuestion(empty(), episode, q.id, q.answerIndex, AT).state;
  const again = answerQuestion(once, episode, q.id, q.answerIndex, AT);
  assert.deepEqual(again.awards, []);
  const reloaded = parseState(JSON.stringify(again.state));
  assert.deepEqual(answerQuestion(reloaded, episode, q.id, q.answerIndex, AT).awards, []);
  assert.equal(pointsOf(reloaded), 10);
});

test("perfect episode: all first-try correct earns the 50 + 20 bonuses, and the right guess earns 25", () => {
  const guessed = lockGuess(empty(), episode.slug, episode.quiz.answerIndex, episode);
  const { state, awards } = playAll(guessed);
  assert.deepEqual(awards.map((a) => a.type).sort(), ["cards", "guess", "perfect", ...Array(8).fill("quiz")].sort());
  assert.equal(pointsOf(state), 175);
  const summary = quizSummary(state, episode);
  assert.deepEqual({ ...summary }, { total: 8, attempted: 8, solved: 8, firstTryCorrect: 8, complete: true, perfect: true, allCards: true, guessRight: true });
  assert.equal(unlockedCardIds(state, catalog).length, episode.facts.length);
  // Playing the whole quiz again adds nothing.
  assert.equal(pointsOf(playAll(state).state), 175);
  assert.deepEqual(playAll(state).awards, []);
});

test("one miss: no perfect bonus, cards bonus once every card is solved, wrong guess earns nothing", () => {
  const guessed = lockGuess(empty(), episode.slug, wrongChoice(episode.quiz), episode);
  const { state, awards } = playAll(guessed, { wrongFirst: ["q1760"] });
  assert.deepEqual(awards.map((a) => a.type).filter((t) => t !== "quiz"), ["cards"]);
  assert.equal(pointsOf(state), 7 * 10 + 20);
  assert.equal(quizSummary(state, episode).perfect, false);
});

test("the guess bonus is checked only when the quiz is complete", () => {
  const guessed = lockGuess(empty(), episode.slug, episode.quiz.answerIndex, episode);
  const [q] = questions;
  const partial = answerQuestion(guessed, episode, q.id, q.answerIndex, AT).state;
  assert.ok(!partial.ledger.some((e) => e.type === "guess"));
});

test("the guess locks before the quiz: it cannot be changed or placed after a quiz answer", () => {
  const locked = lockGuess(empty(), episode.slug, 0, episode);
  assert.equal(lockGuess(locked, episode.slug, 1, episode), locked, "a locked guess is final");
  const [q] = questions;
  const started = answerQuestion(empty(), episode, q.id, q.answerIndex, AT).state;
  assert.ok(quizStarted(started, episode));
  assert.equal(lockGuess(started, episode.slug, 1, episode), started);
});

test("unknown questions and out-of-range choices change nothing", () => {
  const state = empty();
  assert.equal(answerQuestion(state, episode, "nope", 0, AT).state, state);
  assert.equal(answerQuestion(state, episode, questions[0].id, 9, AT).state, state);
  assert.equal(answerQuestion(state, episode, questions[0].id, -1, AT).state, state);
});

test("migration from v1 keeps guesses and old cards but awards no points for the removed watch path", () => {
  const owner = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const v1 = JSON.stringify({ guesses: { "time-compressed": 1, "the-sun": 2 }, revealed: { "time-compressed": true }, owner });
  const migrated = migrateV1(v1);
  assert.deepEqual(migrated.guesses, { "time-compressed": 1, "the-sun": 2 });
  assert.equal(migrated.owner, owner);
  assert.deepEqual(migrated.ledger, [], "no retroactive points");
  assert.deepEqual(migrated.answers, {});
  // Old reveals only show cards for published episodes, and never count toward the cards bonus.
  assert.deepEqual(unlockedCardIds(migrated, draftCatalog), []);
  const published = { ...draftCatalog, episodes: draftCatalog.episodes.map((e) => (e.slug === "time-compressed" ? { ...e, status: "published" } : e)) };
  assert.equal(unlockedCardIds(migrated, published).length, episode.facts.length);
  assert.equal(pointsOf(migrated), 0);
  assert.deepEqual(migrateV1("{broken").guesses, {});
});

test("ranks climb with points and name the next goal", () => {
  assert.deepEqual(RANKS.map((r) => r.name), ["Curious", "Explorer", "Time Traveler", "Mystery Master"]);
  assert.equal(rankFor(0).name, "Curious");
  assert.equal(rankFor(0).next.name, "Explorer");
  assert.equal(rankFor(30).name, "Explorer");
  assert.equal(rankFor(79).name, "Explorer");
  assert.equal(rankFor(80).name, "Time Traveler");
  assert.equal(rankFor(150).name, "Mystery Master");
  assert.equal(rankFor(175).next, null);
  assert.ok(RANKS.at(-1).min <= maxPointsFor(catalog), "the top rank is reachable from episode 01 alone");
  assert.equal(totalCards(catalog), 14);
});

test("store falls back to memory when storage throws, and reports it", () => {
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const store = createStore(() => throwing);
  assert.deepEqual(store.load(), empty());
  assert.equal(store.isPersistent(), false);
  const next = lockGuess(store.load(), "x", 0);
  assert.equal(store.save(next), false);
  assert.deepEqual(store.load(), next, "memory keeps the progress for this visit");
  const noStorage = createStore(() => { throw new Error("SecurityError"); });
  assert.deepEqual(noStorage.load(), empty());
  assert.equal(noStorage.isPersistent(), false);
  assert.equal(noStorage.save(next), false);
});

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}

test("store round-trips through a working storage and migrates the v1 key", () => {
  const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify({ guesses: { "time-compressed": 2 }, revealed: {} }) });
  const store = createStore(() => storage);
  assert.ok(store.isPersistent());
  assert.deepEqual(store.load().guesses, { "time-compressed": 2 }, "v1 guesses picked up");
  const [q] = questions;
  const answered = answerQuestion(store.load(), episode, q.id, q.answerIndex, AT).state;
  assert.equal(store.save(answered), true);
  assert.equal(JSON.parse(storage.data.get(STORAGE_KEY)).ledger.length, 1);
  assert.equal(pointsOf(createStore(() => storage).load()), 10);
});

test("shuffledOrder is a permutation and uses the given random source", () => {
  const order = shuffledOrder(4, () => 0);
  assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
  assert.deepEqual(shuffledOrder(4, () => 0.999), [0, 1, 2, 3]);
  assert.deepEqual(shuffledOrder(0), []);
});
