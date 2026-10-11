// An unlocked "Did you know that…" card, built with DOM APIs (catalog text is never parsed as HTML).
const BULB_ICON =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Zm-3 18h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1Z"/></svg>';

const span = (className, text) => Object.assign(document.createElement("span"), { className, textContent: text });
const pad = (n) => String(n).padStart(2, "0");

export function unlockedCard({ card, episode }, { shareable = false, fresh = false } = {}) {
  const item = document.createElement("li");
  item.className = `fact-card${fresh ? " is-new" : ""}`;
  item.dataset.cardId = card.id;
  const head = span("fact-head", " Did you know that…");
  head.insertAdjacentHTML("afterbegin", BULB_ICON);
  const foot = span("fact-foot", `No. ${pad(episode.number)} · ${episode.subject} · `);
  foot.append(span("fact-source", card.source));
  item.append(head, span("fact-year", card.year), span("fact-text", card.fact), foot);
  if (shareable) {
    const share = Object.assign(document.createElement("button"), { type: "button", className: "btn btn-ghost btn-small", textContent: "Share this card" });
    share.dataset.shareCard = card.id;
    item.append(share);
  }
  return item;
}
