// The episode page as a guided journey: Guess → Watch → Quiz → Cards → Next. Pure functions that turn
// stored progress into what the step indicator, the "continue where you left off" card and the
// per-episode meters show. "Watch" is never detected or rewarded: it simply counts as passed once
// the player moves on to the quiz (nothing here, or anywhere, observes the video).
import { quizSummary, hasQuiz, unlockedCardIds } from "./progress.js";
import { earnedFor } from "./ledger.js";
import { newestFirst } from "./episodes.js";

export const JOURNEY_STEPS = Object.freeze([
  { id: "guess", label: "Guess" },
  { id: "watch", label: "Watch" },
  { id: "quiz", label: "Quiz" },
  { id: "cards", label: "Cards" },
  { id: "next", label: "Next" },
]);

const isIndex = (value) => Number.isInteger(value) && value >= 0;
const isPublished = (episode) => episode?.status === "published" && Boolean(episode.youtubeId);

/** Each step's status ("done" | "current" | "todo") plus the current step id and the quiz summary. */
export function journeyState(state, episode) {
  const summary = quizSummary(state, episode);
  const started = summary.attempted > 0;
  const done = {
    guess: isIndex(state.guesses?.[episode.slug]) || started,
    watch: started,
    quiz: summary.complete,
    cards: summary.allCards,
    next: false,
  };
  const current = JOURNEY_STEPS.find((step) => !done[step.id])?.id ?? "next";
  const steps = JOURNEY_STEPS.map((step) => ({ ...step, status: done[step.id] ? "done" : step.id === current ? "current" : "todo" }));
  return { steps, current, summary };
}

/** Cards and points one episode has given this player. */
export function episodeProgress(state, episode) {
  return {
    cards: unlockedCardIds(state, { episodes: [episode] }).length,
    totalCards: episode.facts.length,
    points: earnedFor(state.ledger ?? [], episode.slug),
    answered: quizSummary(state, episode).attempted,
    totalQuestions: episode.quiz?.questions?.length ?? 0,
  };
}

const touched = (state, episode) => isIndex(state.guesses?.[episode.slug]) || quizSummary(state, episode).attempted > 0;

/**
 * Where a returning player should pick up: the newest episode they started but have not finished
 * (kind "continue"), else the newest published episode they have not touched yet (kind "new").
 * Null for a first-time visitor or when everything is finished.
 */
export function continueTarget(state, catalog) {
  const playable = newestFirst(catalog, (catalog?.episodes ?? []).filter((e) => isPublished(e) && hasQuiz(e)));
  if (!playable.some((episode) => touched(state, episode))) return null;
  const inProgress = playable.find((episode) => touched(state, episode) && !quizSummary(state, episode).allCards);
  if (inProgress) return { kind: "continue", episode: inProgress, step: journeyState(state, inProgress).current, progress: episodeProgress(state, inProgress) };
  const fresh = playable.find((episode) => !touched(state, episode));
  return fresh ? { kind: "new", episode: fresh, step: "guess", progress: episodeProgress(state, fresh) } : null;
}

/** Anchor on the episode page for each step. */
export const STEP_ANCHORS = Object.freeze({ guess: "#guess", watch: "#player", quiz: "#quiz", cards: "#cards", next: "#next" });
