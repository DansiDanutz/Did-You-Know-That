// Home first screen: the newest episode's guess. One tap locks it (the same progress store the episode
// page reads) and lands on that episode's Watch step; a guess already locked shows as chosen.
import { lockGuess } from "../lib/progress.js";
import { store, saveProgress } from "../lib/progress-client.js";

/** The locked option for this episode, or null when there is none or it no longer fits the options. */
export function lockedChoice(state, slug, optionCount) {
  const choice = state.guesses?.[slug];
  return Number.isInteger(choice) && choice >= 0 && choice < optionCount ? choice : null;
}

export const watchHref = (episodePath) => `${episodePath}#player`;

function showLocked(form, buttons, choice) {
  buttons.forEach((button, i) => {
    button.classList.toggle("is-picked", i === choice);
    button.setAttribute("aria-pressed", String(i === choice));
  });
  const note = form.querySelector("[data-hero-guess-note]");
  note.textContent = "";
  note.append("Guess locked. ", Object.assign(document.createElement("a"), { href: watchHref(form.getAttribute("action")), textContent: "Watch to find out →" }));
}

function setup(form) {
  const buttons = [...form.querySelectorAll("button[name=guess]")];
  const locked = lockedChoice(store.load(), form.dataset.slug, buttons.length);
  if (locked !== null) showLocked(form, buttons, locked);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const choice = buttons.indexOf(event.submitter);
    if (choice < 0) return;
    // lockGuess keeps an earlier guess, so tapping again never changes a locked answer.
    const state = lockGuess(store.load(), form.dataset.slug, choice);
    saveProgress(state);
    showLocked(form, buttons, lockedChoice(state, form.dataset.slug, buttons.length));
    window.location.assign(watchHref(form.getAttribute("action")));
  });
}

export function init() {
  document.querySelectorAll("[data-hero-guess]").forEach(setup);
}
