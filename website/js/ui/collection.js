// Fact-card collection: unlocks cards on the episode and collection pages, shows the explorer rank,
// handles shared-card links (/collection/?card=<id>) and "forget my progress".
import { unlockedCardIds, totalCards, rankFor, parseState } from "../lib/progress.js";
import { store, saveProgress, PROGRESS_EVENT } from "../lib/progress-client.js";
import { loadCatalog } from "../lib/catalog-client.js";

const BULB_ICON =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Zm-3 18h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1Z"/></svg>';

const span = (className, text) => Object.assign(document.createElement("span"), { className, textContent: text });
const pad = (n) => String(n).padStart(2, "0");

function cardIndex(catalog) {
  return new Map(catalog.episodes.flatMap((episode) => episode.facts.map((card) => [card.id, { card, episode }])));
}

/** An unlocked card, built with DOM APIs (catalog text is never parsed as HTML). */
function unlockedCard({ card, episode }, { shareable, fresh }) {
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

function renderCards(index, unlocked, { shareable, fresh = new Set() }) {
  for (const slot of document.querySelectorAll("[data-collection-scope] [data-card-id]")) {
    const id = slot.dataset.cardId;
    if (!unlocked.has(id) || !slot.classList.contains("is-locked") || !index.has(id)) continue;
    slot.replaceWith(unlockedCard(index.get(id), { shareable, fresh: fresh.has(id) }));
  }
}

function renderRank(catalog, state, count) {
  const total = totalCards(catalog);
  const rank = rankFor(count);
  const badge = document.querySelector("[data-rank-badge]");
  if (badge) {
    const started = Object.keys(state.guesses).length > 0 || count > 0;
    badge.hidden = !started;
    badge.querySelector("[data-rank-name]").textContent = rank.name;
    badge.querySelector("[data-rank-count]").textContent = `${count}/${total}`;
    badge.setAttribute("aria-label", `Explorer rank ${rank.name}: ${count} of ${total} cards collected. Open your collection.`);
  }
  const panel = document.querySelector("[data-rank-panel]");
  if (!panel) return;
  panel.querySelector("[data-rank-name]").textContent = rank.name;
  panel.querySelector("[data-collected]").textContent = String(count);
  const meter = panel.querySelector("[data-rank-meter]");
  meter.value = count;
  meter.textContent = String(count);
  for (const step of panel.querySelectorAll("[data-rank-step]")) step.classList.toggle("is-reached", count >= Number(step.dataset.rankStep));
}

function showSharedCard(index) {
  const section = document.querySelector("[data-shared-card]");
  const id = new URLSearchParams(window.location.search).get("card");
  if (!section || !id || !index.has(id)) return;
  const entry = index.get(id);
  section.querySelector("[data-shared-slot]").replaceChildren(unlockedCard(entry, { shareable: false, fresh: true }));
  section.querySelector("[data-shared-play]").href = `/episodes/${entry.episode.slug}/`;
  section.hidden = false;
}

async function shareCard(id, entry, announce) {
  const url = `${window.location.origin}/collection/?card=${encodeURIComponent(id)}`;
  const text = `Did you know that… ${entry.card.fact}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Did You Know That?", text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    announce("Link copied — paste it anywhere.");
  } catch (error) {
    if (error?.name === "AbortError") return;
    announce(`Copy this link to share: ${url}`);
  }
}

export async function init() {
  const status = document.querySelector("[data-collection-status]");
  const announce = (message) => {
    if (status) status.textContent = message;
  };
  const onCollectionPage = Boolean(document.querySelector("[data-rank-panel]"));
  const state = store.load();
  const started = Object.keys(state.guesses).length > 0;
  if (!started && !onCollectionPage && !document.querySelector("[data-quiz]")) return; // nothing to show yet

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    console.error("Collection unavailable", error);
    announce("Your collection could not be loaded right now. Please try again later.");
    return;
  }
  const index = cardIndex(catalog);
  let unlocked = new Set(unlockedCardIds(state, catalog));
  renderCards(index, unlocked, { shareable: onCollectionPage });
  renderRank(catalog, state, unlocked.size);
  showSharedCard(index);

  document.addEventListener(PROGRESS_EVENT, (event) => {
    const next = new Set(unlockedCardIds(event.detail.state, catalog));
    const fresh = new Set([...next].filter((id) => !unlocked.has(id)));
    unlocked = next;
    renderCards(index, unlocked, { shareable: onCollectionPage, fresh });
    renderRank(catalog, event.detail.state, unlocked.size);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-share-card]");
    if (button && index.has(button.dataset.shareCard)) shareCard(button.dataset.shareCard, index.get(button.dataset.shareCard), announce);
  });

  document.querySelector("[data-forget]")?.addEventListener("click", () => {
    if (!window.confirm("Forget all your guesses and cards in this browser?")) return;
    saveProgress(parseState(null));
    window.location.reload();
  });
}
