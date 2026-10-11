// Episode game: lock a guess before you watch, then answer one question per era. Every right answer
// unlocks that era's fact card; a right FIRST answer earns 10 points. Wrong answers can be retried
// for 0 points, so learning still counts. Nothing is timed, nothing is lost, and nothing here (or
// anywhere) rewards watching the video. All points go through the idempotent ledger (ledger.js).
import { lockGuess, answerQuestion, answerFor, quizSummary, quizStarted, unlockedCardIds } from "../lib/progress.js";
import { earnedFor } from "../lib/ledger.js";
import { store, saveProgress } from "../lib/progress-client.js";
import { loadCatalog } from "../lib/catalog-client.js";
import { shuffledOrder } from "../lib/shuffle.js";
import { unlockedCard } from "./fact-card.js";

const STORAGE_NOTE = " (Your browser isn’t saving progress, so this lasts until you leave the page.)";
const AWARD_LABEL = { quiz: "Right first time", guess: "Your guess was right", perfect: "Perfect episode", cards: "Every card collected" };

const pointsText = (awards) => awards.map((a) => `${AWARD_LABEL[a.type]} +${a.pts}`).join(" · ");

function awardPop(target, pts) {
  const pop = Object.assign(document.createElement("span"), { className: "award-pop", textContent: `+${pts}` });
  pop.setAttribute("aria-hidden", "true");
  target.append(pop);
  pop.addEventListener("animationend", () => pop.remove(), { once: true });
}

function setupGuess(root) {
  const form = root.querySelector("[data-quiz-form]");
  const radios = [...form.querySelectorAll("input[name=guess]")];
  const after = root.querySelector("[data-quiz-after]");
  const status = root.querySelector("[data-quiz-status]");
  const optionText = (i) => radios[i]?.closest("label").textContent.trim() ?? "";

  const showLocked = (choice) => {
    radios.forEach((radio, i) => {
      radio.checked = i === choice;
      radio.disabled = true;
    });
    form.querySelector("[data-lock]").hidden = true;
    root.querySelector("[data-quiz-choice]").textContent = optionText(choice);
    after.hidden = false;
  };

  const stored = store.load().guesses[root.dataset.slug];
  // Ignore a stored guess that no longer matches the options (the guess may have been edited).
  if (Number.isInteger(stored) && stored < radios.length) showLocked(stored);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const choice = radios.findIndex((radio) => radio.checked);
    if (choice < 0) {
      status.textContent = "Pick one answer first.";
      radios[0].focus();
      return;
    }
    const saved = saveProgress(lockGuess(store.load(), root.dataset.slug, choice));
    showLocked(choice);
    status.textContent = `Guess locked: ${optionText(choice)}.${saved ? "" : STORAGE_NOTE}`;
    after.querySelector("button, a")?.focus();
  });
  return { optionText };
}

function createRunner(root, episode, { optionText }) {
  const $ = (selector) => root.querySelector(selector);
  const run = $("[data-quiz-run]");
  const form = $("[data-question-form]");
  const feedback = $("[data-question-feedback]");
  const verdict = $("[data-feedback-verdict]");
  const note = $("[data-feedback-note]");
  const cardSlot = $("[data-feedback-card]");
  const next = $("[data-question-next]");
  const summary = $("[data-quiz-summary]");
  const status = $("[data-quiz-announce]");
  const questions = episode.quiz.questions;
  const cards = new Map(episode.facts.map((card) => [card.id, card]));
  let index = 0;
  let replay = false;

  const firstUnsolved = (state, from = 0) => {
    const order = [...questions.keys()].map((i) => (from + i) % questions.length);
    return order.find((i) => !answerFor(state, episode.slug, questions[i].id)?.solved) ?? -1;
  };

  function showQuestion(i, { focus = true } = {}) {
    index = i;
    const q = questions[i];
    run.hidden = false;
    summary.hidden = true;
    form.hidden = false;
    feedback.hidden = true;
    $("[data-quiz-step]").textContent = `Question ${i + 1} of ${questions.length}`;
    $("[data-quiz-era]").textContent = q.era;
    $("[data-question-text]").textContent = q.question;
    const options = shuffledOrder(q.options.length).map((original) => {
      const label = Object.assign(document.createElement("label"), { className: "quiz-option" });
      const input = Object.assign(document.createElement("input"), { type: "radio", name: "answer", value: String(original), required: true });
      label.append(input, Object.assign(document.createElement("span"), { textContent: q.options[original] }));
      return label;
    });
    $("[data-question-options]").replaceChildren(...options);
    $("[data-question-check]").hidden = false;
    if (focus) $("[data-question-text]").focus();
  }

  function showFeedback({ correct, firstTry, awards }, q, choiceLabel) {
    feedback.hidden = false;
    const quizAward = awards.find((a) => a.type === "quiz");
    const bonuses = awards.filter((a) => a.type !== "quiz");
    if (!correct) {
      choiceLabel.classList.add("option-wrong");
      choiceLabel.querySelector("input").disabled = true;
      choiceLabel.querySelector("input").checked = false;
      verdict.textContent = "Not quite — try again.";
      note.textContent = firstTry && !replay
        ? "This one can’t earn points now, but a right answer still unlocks its card."
        : "Pick another answer.";
      cardSlot.replaceChildren();
      next.hidden = true;
      status.textContent = `${verdict.textContent} ${note.textContent}`;
      form.querySelector("input:not(:disabled)")?.focus();
      return;
    }
    choiceLabel.classList.add("option-answer");
    for (const input of form.querySelectorAll("input")) input.disabled = true;
    $("[data-question-check]").hidden = true;
    const message = quizAward ? "Right first time!" : "Right! (No points this time — the card is yours.)";
    verdict.textContent = message;
    if (quizAward) awardPop(verdict, quizAward.pts);
    note.textContent = bonuses.length ? `${q.reveal} Bonus: ${pointsText(bonuses)}.` : q.reveal;
    cardSlot.replaceChildren(unlockedCard({ card: cards.get(q.card), episode }, { fresh: true }));
    const done = replay ? index === questions.length - 1 : firstUnsolved(store.load(), index) < 0;
    next.textContent = done ? "See your results" : "Next question";
    next.hidden = false;
    status.textContent = `${message}${awards.length ? ` ${pointsText(awards)}.` : ""} New card: ${cards.get(q.card).year}.`;
    verdict.focus();
  }

  function showSummary({ focus = true } = {}) {
    const state = store.load();
    const s = quizSummary(state, episode);
    const collected = unlockedCardIds(state, { episodes: [episode] }).length;
    run.hidden = true;
    summary.hidden = false;
    $("[data-summary-title]").textContent = s.perfect ? "Perfect! Every answer right first time." : "Quiz complete — well done!";
    $("[data-summary-perfect]").hidden = !s.perfect;
    $("[data-summary-score]").textContent = `${s.firstTryCorrect}/${s.total}`;
    $("[data-summary-points]").textContent = `${earnedFor(state.ledger, episode.slug)} pts`;
    $("[data-summary-cards]").textContent = `${collected}/${episode.facts.length}`;
    const guess = state.guesses[episode.slug];
    $("[data-summary-guess]").textContent = Number.isInteger(guess)
      ? s.guessRight ? `Your guess was right: “${optionText(guess)}” — +25 points.` : `Your guess: “${optionText(guess)}”. Good guess — here’s what really happened.`
      : "Here’s what really happened.";
    if (focus) $("[data-summary-title]").focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const picked = form.querySelector("input[name=answer]:checked");
    if (!picked) {
      $("[data-quiz-status]").textContent = "Pick one answer first.";
      form.querySelector("input:not(:disabled)")?.focus();
      return;
    }
    $("[data-quiz-status]").textContent = "";
    const q = questions[index];
    const result = answerQuestion(store.load(), episode, q.id, Number(picked.value), new Date().toISOString());
    const saved = saveProgress(result.state, result.awards);
    showFeedback(result, q, picked.closest("label"));
    if (!saved) root.querySelector("[data-storage-note]").hidden = false;
  });

  next.addEventListener("click", () => {
    const following = replay ? (index + 1 < questions.length ? index + 1 : -1) : firstUnsolved(store.load(), index);
    if (following < 0) showSummary();
    else showQuestion(following);
  });

  $("[data-quiz-replay]").addEventListener("click", () => {
    replay = true;
    showQuestion(0);
  });

  return {
    start({ focus = true } = {}) {
      const state = store.load();
      const i = firstUnsolved(state);
      if (i < 0) showSummary({ focus });
      else showQuestion(i, { focus });
    },
    resumeIfStarted() {
      if (quizStarted(store.load(), episode)) this.start({ focus: false });
    },
  };
}

export async function init() {
  const root = document.querySelector("[data-quiz]");
  if (!store.isPersistent()) root.querySelector("[data-storage-note]").hidden = false;
  const guess = setupGuess(root);
  const startButton = root.querySelector("[data-quiz-start]");
  if (!startButton) return; // quiz coming soon

  let episode;
  try {
    const catalog = await loadCatalog();
    episode = catalog.episodes.find((e) => e.slug === root.dataset.slug);
    if (!episode?.quiz?.questions?.length) throw new Error(`no quiz for ${root.dataset.slug}`);
  } catch (error) {
    console.error("Quiz unavailable", error);
    startButton.disabled = true;
    root.querySelector("[data-quiz-status]").textContent = "The quiz could not be loaded right now. Please try again later.";
    return;
  }
  const runner = createRunner(root, episode, guess);
  startButton.addEventListener("click", () => {
    startButton.hidden = true;
    runner.start();
  });
  if (quizStarted(store.load(), episode)) startButton.hidden = true;
  runner.resumeIfStarted();
}
