// "Guess before you watch": lock a guess, watch, then reveal the answer and unlock the fact cards.
// Nothing here is timed and nothing is lost: a guess can be checked whenever the visitor likes.
import { lockGuess, revealAnswer } from "../lib/progress.js";
import { store, saveProgress } from "../lib/progress-client.js";

const VERDICT_RIGHT = "You were right!";
const VERDICT_OTHER = "Good guess — here’s what really happened.";
const STORAGE_NOTE = " (Your browser isn’t saving progress, so this lasts until you leave the page.)";

export function init() {
  const root = document.querySelector("[data-quiz]");
  const { slug } = root.dataset;
  const answer = Number(root.dataset.answer);
  const published = root.dataset.published === "true";
  const form = root.querySelector("[data-quiz-form]");
  const radios = [...form.querySelectorAll("input[name=guess]")];
  const after = root.querySelector("[data-quiz-after]");
  const reveal = root.querySelector("[data-quiz-reveal]");
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

  const showReveal = (choice) => {
    radios[answer]?.closest("label").classList.add("option-answer");
    root.querySelector("[data-quiz-verdict]").textContent = choice === answer ? VERDICT_RIGHT : VERDICT_OTHER;
    after.querySelector("[data-reveal]")?.setAttribute("hidden", "");
    reveal.hidden = false;
  };

  const state = store.load();
  const storedGuess = state.guesses[slug];
  // Ignore a stored guess that no longer matches the options (the quiz may have been edited).
  if (Number.isInteger(storedGuess) && storedGuess < radios.length) {
    showLocked(state.guesses[slug]);
    if (published && state.revealed[slug]) showReveal(state.guesses[slug]);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const choice = radios.findIndex((radio) => radio.checked);
    if (choice < 0) {
      status.textContent = "Pick one answer first.";
      radios[0].focus();
      return;
    }
    const saved = saveProgress(lockGuess(store.load(), slug, choice));
    showLocked(choice);
    status.textContent = `Guess locked: ${optionText(choice)}.${saved ? "" : STORAGE_NOTE}`;
    after.querySelector("a, button")?.focus();
  });

  after.querySelector("[data-reveal]")?.addEventListener("click", () => {
    const current = store.load();
    const choice = current.guesses[slug];
    if (!Number.isInteger(choice) || choice >= radios.length) return;
    saveProgress(revealAnswer(current, slug));
    showReveal(choice);
    status.textContent = `${choice === answer ? VERDICT_RIGHT : VERDICT_OTHER} New fact cards added to your collection.`;
    reveal.setAttribute("tabindex", "-1");
    reveal.focus();
  });
}
