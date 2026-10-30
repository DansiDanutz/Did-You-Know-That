// Challenge a friend: once a guess is locked, share a link that carries it (?vs=<option>). The friend
// lands on the guess step with a banner, locks their own guess, then sees whether the two matched.
// Read-only on progress: it never locks, saves or awards anything.
import { store, PROGRESS_EVENT } from "../lib/progress-client.js";

/** The link a player shares: their locked option, opening the friend on the guess step. */
export const challengeLink = (origin, episodePath, choice) => `${origin}${episodePath}?vs=${choice}#guess`;

/** The sender's option from `?vs=`, or null when it is missing or not a valid option index. */
export function parseChallenge(search, optionCount) {
  const raw = new URLSearchParams(search).get("vs");
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const choice = Number(raw);
  return choice < optionCount ? choice : null;
}

/** What the friend sees once their own guess is locked. */
export function challengeResult(mine, theirs, options) {
  return mine === theirs
    ? "You picked the same answer as your friend. Watch to see if you’re both right."
    : `Your friend picked “${options[theirs]}”. Only one of you can be right — watch to find out.`;
}

export const shareText = (title) => `I locked my guess for “${title}” on Did You Know That? Lock yours and see if we match.`;

async function share(box, link) {
  const status = box.querySelector("[data-challenge-status]");
  const text = shareText(box.dataset.title);
  try {
    if (navigator.share) {
      await navigator.share({ title: `Did You Know That? — ${box.dataset.title}`, text, url: link });
      status.textContent = "Challenge sent.";
      return;
    }
    await navigator.clipboard.writeText(`${text} ${link}`);
    status.textContent = "Link copied — paste it to a friend.";
  } catch (error) {
    if (error?.name === "AbortError") return; // the player closed the share sheet
    status.textContent = `Copy this link to challenge a friend: ${link}`;
  }
}

function setup(root) {
  const box = root.querySelector("[data-challenge]");
  const options = [...root.querySelectorAll("input[name=guess]")].map((input) => input.closest("label").textContent.trim());
  const theirs = parseChallenge(window.location.search, options.length);
  if (theirs !== null) root.querySelector("[data-challenge-banner]").hidden = false;

  const render = (state) => {
    const mine = state.guesses?.[root.dataset.slug];
    if (!Number.isInteger(mine) || mine >= options.length) return;
    box.hidden = false;
    box.querySelector("[data-challenge-share]").onclick = () => share(box, challengeLink(window.location.origin, window.location.pathname, mine));
    if (theirs === null) return;
    const result = box.querySelector("[data-challenge-result]");
    result.textContent = challengeResult(mine, theirs, options);
    result.hidden = false;
  };

  render(store.load());
  document.addEventListener(PROGRESS_EVENT, (event) => render(event.detail.state));
}

export function init() {
  document.querySelectorAll("[data-quiz]").forEach((root) => {
    if (root.querySelector("[data-challenge]")) setup(root);
  });
}
