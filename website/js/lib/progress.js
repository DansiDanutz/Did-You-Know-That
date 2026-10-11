// Game progress: pre-watch guesses, quiz answers, collected fact cards, the points ledger and the
// explorer rank. Lives only in this browser (localStorage), attached to the local profile.
// No accounts, no tracking, no timers. Points come from answers only — never from watching.
// Pure functions + a storage wrapper that never throws, so the site works without storage.
import { award, parseLedger, balance, earnedTotal, quizEventId, guessEventId, perfectEventId, cardsEventId, POINTS } from "./ledger.js";

export const STORAGE_KEY = "dyk.progress.v2";
/** v1 held { guesses, revealed }; "revealed" came from the removed "I watched it" button. */
export const LEGACY_STORAGE_KEY = "dyk.progress.v1";
const PROBE_KEY = "dyk.probe";

/** Ranks by points. Episode 01 is worth up to 175 (8 × 10 + 25 + 50 + 20). */
export const RANKS = Object.freeze([
  { name: "Curious", min: 0 },
  { name: "Explorer", min: 30 },
  { name: "Time Traveler", min: 80 },
  { name: "Mystery Master", min: 150 },
]);

const emptyState = () => ({ guesses: {}, answers: {}, legacyRevealed: {}, ledger: [] });
const OWNER_PATTERN = /^[0-9a-f-]{36}$/;
const ANSWER_KEY = /^[a-z0-9-]+:[a-z0-9-]+$/;
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isIndex = (value) => Number.isInteger(value) && value >= 0;
const entries = (value) => Object.entries(isPlainObject(value) ? value : {});

const answerKey = (slug, questionId) => `${slug}:${questionId}`;
const questionsOf = (episode) => episode?.quiz?.questions ?? [];
export const hasQuiz = (episode) => questionsOf(episode).length > 0;

function parseAnswers(value) {
  return Object.fromEntries(
    entries(value)
      .filter(([key, a]) => ANSWER_KEY.test(key) && isPlainObject(a) && isIndex(a.first) && typeof a.solved === "boolean")
      .map(([key, a]) => [key, { first: a.first, solved: a.solved }]),
  );
}

/** Parses stored JSON defensively; anything unexpected becomes an empty state. */
export function parseState(rawValue) {
  try {
    const data = JSON.parse(rawValue ?? "null");
    if (!isPlainObject(data)) return emptyState();
    return {
      guesses: Object.fromEntries(entries(data.guesses).filter(([, v]) => isIndex(v))),
      answers: parseAnswers(data.answers),
      legacyRevealed: Object.fromEntries(entries(data.legacyRevealed).filter(([, v]) => v === true)),
      ledger: parseLedger(data.ledger),
      ...(OWNER_PATTERN.test(data.owner ?? "") ? { owner: data.owner } : {}),
    };
  } catch {
    return emptyState();
  }
}

/**
 * v1 → v2: guesses and the owner are kept; cards opened with the removed "I watched it" button stay
 * visible in the collection (legacyRevealed) but earn no points and never count toward a bonus.
 */
export function migrateV1(rawValue) {
  const v1 = parseState(rawValue);
  let legacy = {};
  try {
    legacy = Object.fromEntries(entries(JSON.parse(rawValue ?? "null")?.revealed).filter(([, v]) => v === true));
  } catch {
    legacy = {};
  }
  return { ...emptyState(), guesses: v1.guesses, legacyRevealed: legacy, ...(v1.owner ? { owner: v1.owner } : {}) };
}

/** Attaches this browser's progress to the local profile that signed in (see profile.js). */
export const attachTo = (state, playerId) => (state.owner === playerId ? state : { ...state, owner: playerId });

/** The guess must come before the quiz: once a quiz answer exists, the guess is frozen. */
export const quizStarted = (state, episode) => questionsOf(episode).some((q) => answerKey(episode.slug, q.id) in state.answers);

export function lockGuess(state, slug, optionIndex, episode = null) {
  if (episode && quizStarted(state, episode)) return state;
  if (slug in state.guesses) return state;
  return { ...state, guesses: { ...state.guesses, [slug]: optionIndex } };
}

export const answerFor = (state, slug, questionId) => state.answers[answerKey(slug, questionId)] ?? null;

/** Summary numbers for one episode's quiz. */
export function quizSummary(state, episode) {
  const questions = questionsOf(episode);
  const answers = questions.map((q) => ({ q, a: answerFor(state, episode.slug, q.id) }));
  const firstTryCorrect = answers.filter(({ q, a }) => a && a.first === q.answerIndex).length;
  const guess = state.guesses[episode.slug];
  return {
    total: questions.length,
    attempted: answers.filter(({ a }) => a).length,
    solved: answers.filter(({ a }) => a?.solved).length,
    firstTryCorrect,
    complete: questions.length > 0 && answers.every(({ a }) => a),
    perfect: questions.length > 0 && firstTryCorrect === questions.length,
    allCards: questions.length > 0 && answers.every(({ a }) => a?.solved),
    guessRight: isIndex(guess) && guess === episode.quiz.answerIndex,
  };
}

const grant = (state, awards, type, id, at) => {
  const { ledger, awarded } = award(state.ledger, { type, id, at });
  return awarded ? { state: { ...state, ledger }, awards: [...awards, awarded] } : { state, awards };
};

/** Bonuses that depend on the whole episode; each is idempotent through the ledger. */
function settleEpisode(state, episode, at) {
  const summary = quizSummary(state, episode);
  let result = { state, awards: [] };
  if (summary.complete && summary.guessRight) result = grant(result.state, result.awards, "guess", guessEventId(episode.slug), at);
  if (summary.perfect) result = grant(result.state, result.awards, "perfect", perfectEventId(episode.slug), at);
  if (summary.allCards) result = grant(result.state, result.awards, "cards", cardsEventId(episode.slug), at);
  return result;
}

/**
 * Records an answer and returns { state, correct, firstTry, awards }. 10 points only when the very
 * first attempt at a question is right; a wrong first attempt can still be solved (0 points) and
 * still unlocks the question's fact card. `at` is an ISO timestamp (the caller's clock).
 */
export function answerQuestion(state, episode, questionId, choice, at) {
  const question = questionsOf(episode).find((q) => q.id === questionId);
  if (!question || !isIndex(choice) || choice >= question.options.length) {
    return { state, correct: false, firstTry: false, awards: [] };
  }
  const key = answerKey(episode.slug, questionId);
  const previous = state.answers[key];
  const correct = choice === question.answerIndex;
  const firstTry = !previous;
  const answers = { ...state.answers, [key]: { first: previous ? previous.first : choice, solved: Boolean(previous?.solved) || correct } };
  let result = { state: { ...state, answers }, awards: [] };
  if (firstTry && correct) result = grant(result.state, result.awards, "quiz", quizEventId(episode.slug, questionId), at);
  const settled = settleEpisode(result.state, episode, at);
  return { state: settled.state, correct, firstTry, awards: [...result.awards, ...settled.awards] };
}

/** Card ids collected: solved quiz questions, plus cards a v1 player opened before the quiz existed. */
export function unlockedCardIds(state, catalog) {
  return (catalog.episodes ?? []).flatMap((episode) => {
    const legacy = episode.status === "published" && state.legacyRevealed[episode.slug];
    if (legacy) return episode.facts.map((card) => card.id);
    return questionsOf(episode).filter((q) => answerFor(state, episode.slug, q.id)?.solved).map((q) => q.card);
  });
}

export const totalCards = (catalog) => (catalog.episodes ?? []).reduce((sum, e) => sum + e.facts.length, 0);

/** Most points the published quizzes can award (daily questions come on top, from phase 3). */
export const maxPointsFor = (catalog) =>
  (catalog.episodes ?? []).filter(hasQuiz).reduce((sum, e) => sum + questionsOf(e).length * POINTS.quiz + POINTS.guess + POINTS.perfect + POINTS.cards, 0);

export const pointsOf = (state) => balance(state.ledger);

/** Points ever earned — ranks use this, not the spendable balance. */
export const earnedOf = (state) => earnedTotal(state.ledger);

/** The rank for a number of EARNED points (see earnedOf), plus the next rank to aim for (or null). */
export function rankFor(points) {
  const index = RANKS.findLastIndex((rank) => points >= rank.min);
  return { ...RANKS[index], next: RANKS[index + 1] ?? null };
}

/** localStorage wrapper: reads and writes never throw; falls back to memory for this visit. */
export function createStore(getStorage = () => globalThis.localStorage) {
  let memory = emptyState();
  let persistent = true;
  const storage = () => {
    try {
      return getStorage() ?? null;
    } catch {
      return null;
    }
  };
  return {
    load() {
      try {
        const backend = storage();
        const stored = backend?.getItem(STORAGE_KEY);
        if (stored !== null && stored !== undefined) memory = parseState(stored);
        else {
          const legacy = backend?.getItem(LEGACY_STORAGE_KEY);
          if (legacy !== null && legacy !== undefined) memory = migrateV1(legacy);
        }
      } catch {
        // Storage blocked (private mode, disabled cookies): keep the in-memory state.
      }
      return memory;
    },
    save(state) {
      memory = state;
      try {
        const backend = storage();
        if (!backend) throw new Error("no storage");
        backend.setItem(STORAGE_KEY, JSON.stringify(state));
        persistent = true;
        return true;
      } catch {
        persistent = false;
        return false;
      }
    },
    /** False once a save failed (or no storage exists): progress lasts only for this visit. */
    isPersistent() {
      if (!persistent) return false;
      try {
        const backend = storage();
        backend.setItem(PROBE_KEY, "1");
        backend.removeItem(PROBE_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}
