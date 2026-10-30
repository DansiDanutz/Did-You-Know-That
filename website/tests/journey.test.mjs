// The guided episode journey (Guess → Watch → Quiz → Cards → Next), "continue where you left off",
// rank-up moments, the "how we saw it" ladder data and the v1 → v2 migration of episode 02 answers.
import { test } from "node:test";
import assert from "node:assert/strict";

import { journeyState, continueTarget, episodeProgress, JOURNEY_STEPS, STEP_ANCHORS } from "../js/lib/journey.js";
import { parseState, lockGuess, answerQuestion, rankUp, quizSummary, unlockedCardIds, earnedOf, pointsOf } from "../js/lib/progress.js";
import { validateCatalog, validateLadder, RUNG_MAX_LENGTH } from "../tools/lib/catalog.mjs";
import { loadCatalog, loadDraftCatalog } from "./fixtures.mjs";

const catalog = loadCatalog();
const ep1 = catalog.episodes.find((e) => e.slug === "time-compressed");
const sun = catalog.episodes.find((e) => e.slug === "the-sun");
const school = catalog.episodes.find((e) => e.slug === "school");
const money = catalog.episodes.find((e) => e.slug === "money");
const food = catalog.episodes.find((e) => e.slug === "food");
const medicine = catalog.episodes.find((e) => e.slug === "medicine");
const light = catalog.episodes.find((e) => e.slug === "light");
const weight = catalog.episodes.find((e) => e.slug === "weight");
const diabetes = catalog.episodes.find((e) => e.slug === "diabetes");
const AT = "2026-10-12T09:00:00.000Z";
const empty = () => parseState(null);
const statuses = (state, episode) => Object.fromEntries(journeyState(state, episode).steps.map((s) => [s.id, s.status]));
const answerAll = (state, episode, { wrongFirst = false } = {}) =>
  episode.quiz.questions.reduce((s, q) => {
    const first = wrongFirst ? answerQuestion(s, episode, q.id, (q.answerIndex + 1) % q.options.length, AT).state : s;
    return answerQuestion(first, episode, q.id, q.answerIndex, AT).state;
  }, state);

test("a fresh visitor starts at Guess; every step has an anchor on the page", () => {
  assert.deepEqual(statuses(empty(), sun), { guess: "current", watch: "todo", quiz: "todo", cards: "todo", next: "todo" });
  assert.deepEqual(JOURNEY_STEPS.map((s) => s.id), Object.keys(STEP_ANCHORS));
});

test("after the guess, Watch is current; it counts as passed only once the quiz starts (never detected)", () => {
  const guessed = lockGuess(empty(), sun.slug, 1, sun);
  assert.deepEqual(statuses(guessed, sun), { guess: "done", watch: "current", quiz: "todo", cards: "todo", next: "todo" });
  const started = answerQuestion(guessed, sun, sun.quiz.questions[0].id, 0, AT).state;
  assert.deepEqual(statuses(started, sun), { guess: "done", watch: "done", quiz: "current", cards: "todo", next: "todo" });
});

test("finishing the quiz with every card collected leads to Next", () => {
  const done = answerAll(lockGuess(empty(), sun.slug, 1, sun), sun);
  assert.deepEqual(statuses(done, sun), { guess: "done", watch: "done", quiz: "done", cards: "done", next: "current" });
  assert.equal(journeyState(done, sun).current, "next");
});

test("episode progress counts cards, answers and points for one episode only", () => {
  const state = answerAll(lockGuess(empty(), sun.slug, 1, sun), sun);
  assert.deepEqual(episodeProgress(state, sun), { cards: 8, totalCards: 8, points: 175, answered: 8, totalQuestions: 8 });
  assert.deepEqual(episodeProgress(state, ep1), { cards: 0, totalCards: 8, points: 0, answered: 0, totalQuestions: 8 });
});

test("continue where you left off: nothing for first visits; the started episode; then the next untouched one", () => {
  assert.equal(continueTarget(empty(), catalog), null);
  const midway = answerQuestion(lockGuess(empty(), ep1.slug, 1, ep1), ep1, ep1.quiz.questions[0].id, 0, AT).state;
  const target = continueTarget(midway, catalog);
  assert.deepEqual([target.kind, target.episode.slug, target.step], ["continue", "time-compressed", "quiz"]);
  const finished = answerAll(lockGuess(empty(), ep1.slug, 1, ep1), ep1);
  const next = continueTarget(finished, catalog);
  assert.deepEqual([next.kind, next.episode.slug, next.step], ["new", "diabetes", "guess"], "the newest untouched episode comes first (Medicine 2, same day as Medicine 1)");
  const diabetesDone = answerAll(finished, diabetes);
  assert.deepEqual([continueTarget(diabetesDone, catalog).kind, continueTarget(diabetesDone, catalog).episode.slug], ["new", "weight"]);
  const weightDone = answerAll(diabetesDone, weight);
  assert.deepEqual([continueTarget(weightDone, catalog).kind, continueTarget(weightDone, catalog).episode.slug], ["new", "light"]);
  const lightDone = answerAll(weightDone, light);
  assert.deepEqual([continueTarget(lightDone, catalog).kind, continueTarget(lightDone, catalog).episode.slug], ["new", "medicine"]);
  const medicineDone = answerAll(lightDone, medicine);
  assert.deepEqual([continueTarget(medicineDone, catalog).kind, continueTarget(medicineDone, catalog).episode.slug], ["new", "food"]);
  const foodDone = answerAll(medicineDone, food);
  assert.deepEqual([continueTarget(foodDone, catalog).kind, continueTarget(foodDone, catalog).episode.slug], ["new", "money"]);
  const moneyDone = answerAll(foodDone, money);
  assert.deepEqual([continueTarget(moneyDone, catalog).kind, continueTarget(moneyDone, catalog).episode.slug], ["new", "school"]);
  const twoDone = answerAll(moneyDone, school);
  assert.deepEqual([continueTarget(twoDone, catalog).kind, continueTarget(twoDone, catalog).episode.slug], ["new", "the-sun"]);
  const everything = answerAll(twoDone, sun);
  assert.equal(continueTarget(everything, catalog), null);
  assert.equal(continueTarget(midway, loadDraftCatalog()), null, "drafts are never suggested");
});

test("rank-up moments fire only when a rank threshold is crossed, never downwards", () => {
  assert.equal(rankUp(0, 20), null);
  assert.equal(rankUp(20, 30).name, "Explorer");
  assert.equal(rankUp(70, 160).name, "Mystery Master");
  assert.equal(rankUp(160, 100), null);
  assert.equal(rankUp(200, 210), null);
});

test("both episodes ship a complete 7-rung ladder with 2100 labelled a prediction", () => {
  assert.deepEqual(sun.eras.map((e) => e.year), ["1500", "1610", "1779", "1800", "1928", "Today", "2100"]);
  assert.deepEqual(sun.eras.map((e) => e.rung), ["Day and night", "Something to watch", "Something to explain", "Something to measure", "Every meal", "Power", "The next rung?"]);
  assert.deepEqual(ep1.eras.map((e) => e.year), ["1500", "1652", "1760", "1883", "1914", "Today", "2100"]);
  assert.deepEqual(ep1.eras.map((e) => e.rung), ["Sun and bells", "Clocks you can trust", "Hours you sell", "One time for a continent", "The working day", "Every minute filled", "Time given back?"]);
  for (const episode of [sun, ep1]) {
    assert.ok(episode.eras.every((e) => e.saw.length > 10), `${episode.slug}: every rung has its sentence`);
    assert.ok(episode.eras.every((e) => e.rung.length <= RUNG_MAX_LENGTH), `${episode.slug}: rungs stay short`);
    assert.deepEqual(episode.eras.filter((e) => e.prediction).map((e) => e.year), ["2100"], `${episode.slug}: only 2100 is a prediction`);
    assert.ok(!episode.quiz.questions.some((q) => q.era === "2100"), `${episode.slug}: 2100 is never quizzed`);
    assert.deepEqual(validateLadder(episode.eras, episode.slug), []);
  }
});

test("ladder validation: once one era has a rung, every era needs a short rung and its sentence", () => {
  const eras = sun.eras.map((e) => ({ ...e }));
  const missing = eras.map((e, i) => (i === 2 ? { ...e, rung: undefined } : e));
  assert.ok(validateLadder(missing, "x").some((m) => m.includes("1779") && m.includes("rung is required")));
  const long = eras.map((e, i) => (i === 0 ? { ...e, rung: "x".repeat(RUNG_MAX_LENGTH + 1) } : e));
  assert.ok(validateLadder(long, "x").some((m) => m.includes(`at most ${RUNG_MAX_LENGTH}`)));
  const noSaw = eras.map((e, i) => (i === 4 ? { ...e, saw: " " } : e));
  assert.ok(validateLadder(noSaw, "x").some((m) => m.includes("saw")));
  const broken = { ...catalog, episodes: catalog.episodes.map((e) => (e.slug === "the-sun" ? { ...e, eras: missing } : e)) };
  assert.ok(validateCatalog(broken).some((m) => m.includes("rung is required")), "the build refuses it");
  const twoNext = { ...catalog, requested: catalog.requested.map((r) => ({ ...r, status: "next" })) };
  assert.ok(validateCatalog(twoNext).some((m) => m.includes(`only one requested subject can be "next"`)));
});

test("episode 02 v2: sources trace to RESEARCH F/A numbers, the guess question is unchanged, 2100 is never quizzed", () => {
  assert.deepEqual(sun.quiz.questions.map((q) => [q.id, q.source]), [["q1500", "F2"], ["q1610", "F3"], ["q1779", "A3"], ["q1800", "F6"], ["q1893", "A4"], ["q1928", "F8"], ["qsolar", "A1"], ["qanswer", "F17"]]);
  assert.equal(sun.quiz.question, "How old is the sunlight hitting your eyes right now?");
  assert.equal(sun.quiz.answerIndex, 1, "a guess locked against v1 stays valid");
  assert.ok(!sun.quiz.questions.some((q) => q.era === "2100"));
  assert.match(sun.facts.find((f) => f.id === "sun-1928").fact, /probably a myth/, "hedged where the episode hedges");
  assert.match(sun.facts.find((f) => f.id === "sun-answer").fact, /NASA estimates/);
  assert.match(sun.facts.find((f) => f.id === "sun-1893").fact, /usually credited/);
});

test("a player who answered v1 episode 02 questions keeps their points; removed questions simply don't count", () => {
  const v1 = JSON.stringify({
    guesses: { "the-sun": 1 },
    answers: { "the-sun:q1500": { first: 0, solved: true }, "the-sun:q1752": { first: 0, solved: true }, "the-sun:q1954": { first: 1, solved: true }, "the-sun:qtoday": { first: 0, solved: true } },
    ledger: ["q1500", "q1752", "q1954", "qtoday"].map((id) => ({ id: `quiz:the-sun:${id}`, type: "quiz", pts: 10, at: AT })),
  });
  const state = parseState(v1);
  assert.equal(earnedOf(state), 40, "points already earned are kept");
  const summary = quizSummary(state, sun);
  assert.deepEqual([summary.attempted, summary.solved, summary.complete], [1, 1, false], "only q1500 still exists");
  assert.deepEqual(unlockedCardIds(state, catalog), ["sun-1500"]);
  assert.deepEqual(statuses(state, sun), { guess: "done", watch: "done", quiz: "current", cards: "todo", next: "todo" });
  const after = answerQuestion(state, sun, "q1779", 0, AT);
  assert.equal(after.awards[0].id, "quiz:the-sun:q1779");
  assert.equal(pointsOf(after.state), 50);
});
