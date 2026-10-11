// Fact-card collection: unlocks cards on the episode and collection pages, shows the explorer rank,
// handles shared-card links (/collection/?card=<id>) and "forget my progress".
import { unlockedCardIds, totalCards, rankFor, parseState, pointsOf, earnedOf } from "../lib/progress.js";
import { unlockedCard } from "./fact-card.js";
import { store, saveProgress, PROGRESS_EVENT } from "../lib/progress-client.js";
import { loadCatalog } from "../lib/catalog-client.js";

function cardIndex(catalog) {
  return new Map(catalog.episodes.flatMap((episode) => episode.facts.map((card) => [card.id, { card, episode }])));
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
  const points = earnedOf(state);
  const spendable = pointsOf(state);
  const rank = rankFor(points);
  const badge = document.querySelector("[data-rank-badge]");
  if (badge) {
    const started = Object.keys(state.guesses).length > 0 || count > 0 || points > 0;
    badge.hidden = !started;
    badge.querySelector("[data-rank-name]").textContent = rank.name;
    badge.setAttribute("aria-label", `Rank ${rank.name}: ${points} points earned, ${count} of ${total} cards collected. Open your collection.`);
  }
  const panel = document.querySelector("[data-rank-panel]");
  if (!panel) return;
  panel.querySelector("[data-rank-name]").textContent = rank.name;
  panel.querySelector("[data-collected]").textContent = String(count);
  panel.querySelector("[data-points]").textContent = String(points);
  const balanceSlot = panel.querySelector("[data-balance]");
  if (balanceSlot) balanceSlot.textContent = String(spendable);
  const meter = panel.querySelector("[data-rank-meter]");
  meter.value = Math.min(points, meter.max);
  meter.textContent = String(points);
  for (const step of panel.querySelectorAll("[data-rank-step]")) step.classList.toggle("is-reached", points >= Number(step.dataset.rankStep));
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
    if (!window.confirm("Forget all your guesses, cards and points in this browser?")) return;
    saveProgress(parseState(null));
    window.location.reload();
  });
}
