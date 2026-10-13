// Small, healthy celebrations: a toast when earning points lifts the player to a new rank.
// It never blocks, never counts down, and never says anything was lost. The glow is CSS-only and
// switched off under prefers-reduced-motion. The text is announced through a live region that is
// always in the page (a region that appears together with its text is often not read out).
import { rankUp, earnedOf } from "../lib/progress.js";
import { PROGRESS_EVENT } from "../lib/progress-client.js";

const SHOW_MS = 5200;

export function init() {
  const toast = document.querySelector("[data-toast]");
  const live = document.querySelector("[data-toast-live]");
  if (!toast) return;
  let timer = 0;

  const show = (title, text) => {
    window.clearTimeout(timer);
    const close = Object.assign(document.createElement("button"), { type: "button", className: "toast-close", textContent: "×" });
    close.setAttribute("aria-label", "Dismiss");
    close.tabIndex = -1; // the visual toast is aria-hidden and closes itself; the live region carries the message
    close.addEventListener("click", () => {
      toast.hidden = true;
    });
    const body = Object.assign(document.createElement("div"), { className: "toast-body" });
    body.append(Object.assign(document.createElement("strong"), { className: "toast-title", textContent: title }), Object.assign(document.createElement("span"), { textContent: text }));
    const star = Object.assign(document.createElement("span"), { className: "toast-star", textContent: "★" });
    star.setAttribute("aria-hidden", "true");
    toast.replaceChildren(star, body, close);
    if (live) live.textContent = `${title} ${text}`;
    toast.hidden = false;
    toast.classList.remove("is-in");
    void toast.offsetWidth; // restart the entrance animation
    toast.classList.add("is-in");
    timer = window.setTimeout(() => {
      toast.hidden = true;
    }, SHOW_MS);
  };

  document.addEventListener(PROGRESS_EVENT, (event) => {
    const earned = (event.detail?.awards ?? []).reduce((sum, earnedEvent) => sum + earnedEvent.pts, 0);
    if (!earned) return;
    const after = earnedOf(event.detail.state);
    const reached = rankUp(after - earned, after);
    if (reached) show(`Rank up: ${reached.name}!`, reached.next ? `${after} points earned. Next rank: ${reached.next.name} at ${reached.next.min}.` : `${after} points earned — the top rank. Amazing.`);
  });
}
