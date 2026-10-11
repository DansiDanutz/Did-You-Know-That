// Card Vault page: shows each Special Card as locked / affordable / owned from this browser's
// ledger, unlocks with a confirm step (a ledger spend), plays a neon reveal (instant under
// prefers-reduced-motion) and opens the special video facade or its coming-soon note.
import { cardStatus, unlockSpecialCard } from "../lib/vault.js";
import { pointsOf } from "../lib/progress.js";
import { store, saveProgress, PROGRESS_EVENT } from "../lib/progress-client.js";

const REVEAL_MS = 1200;

const cardFrom = (el) => ({
  id: el.dataset.id,
  title: el.dataset.title,
  cost: Number(el.dataset.cost),
  ...(el.dataset.condition ? { condition: el.dataset.condition } : {}),
});

function render(el, ledger) {
  const card = cardFrom(el);
  const status = cardStatus(ledger, card);
  el.classList.toggle("is-locked", !status.owned);
  el.classList.toggle("is-owned", status.owned);
  el.classList.toggle("is-ready", status.canUnlock);
  el.querySelector("[data-vault-locked]").hidden = status.owned;
  el.querySelector("[data-vault-open]").hidden = !status.owned;
  el.querySelector("[data-vault-state]").lastChild.textContent = status.owned ? " Your Special Card" : status.canUnlock ? " Ready to unlock" : " Locked Special Card";
  if (status.owned) return;
  const progress = el.querySelector("[data-vault-progress]");
  progress.value = Math.min(status.points, card.cost);
  progress.textContent = `${Math.min(status.points, card.cost)} of ${card.cost}`;
  const condition = el.querySelector("[data-vault-condition]");
  condition?.classList.toggle("is-met", status.conditionMet);
  const text = el.querySelector("[data-vault-progress-text]");
  if (!status.conditionMet) text.textContent = status.affordable ? "You have the points — complete the requirement above to unlock." : `${status.shortBy} more points, and the requirement above.`;
  else text.textContent = status.affordable ? "You have enough points." : `${status.shortBy} more points to go — play an episode quiz to earn them.`;
  el.querySelector("[data-unlock]").disabled = !status.canUnlock;
}

async function share(card, announce) {
  const url = `${window.location.origin}/vault/?card=${encodeURIComponent(card.id)}`;
  const text = `A Special Card in the Did You Know That? Card Vault: “${card.title}”`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Did You Know That? — Card Vault", text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    announce("Link copied — paste it anywhere.");
  } catch (error) {
    if (error?.name === "AbortError") return;
    announce(`Copy this link to share: ${url}`);
  }
}

function showShared() {
  const id = new URLSearchParams(window.location.search).get("card");
  const el = id && document.getElementById(`card-${id}`);
  if (!el) return;
  el.classList.add("is-shared");
  document.querySelector("[data-vault-shared]").hidden = false;
  el.scrollIntoView({ block: "center" });
}

export function init() {
  const cards = [...document.querySelectorAll("[data-special-card]")];
  const dialog = document.querySelector("[data-unlock-dialog]");
  const status = document.querySelector("[data-vault-status]");
  const announce = (message) => {
    status.textContent = message;
  };
  let pending = null;

  const renderAll = () => {
    const state = store.load();
    document.querySelector("[data-vault-points]").textContent = String(pointsOf(state));
    for (const el of cards) render(el, state.ledger);
  };

  const confirmUnlock = () => {
    const el = pending;
    pending = null;
    dialog.close();
    if (!el) return;
    const card = cardFrom(el);
    const result = unlockSpecialCard(store.load(), card, new Date().toISOString());
    if (!result.ok) {
      announce(result.reason === "condition" ? "This card needs its requirement first." : "Not enough points yet.");
      renderAll();
      return;
    }
    const saved = saveProgress(result.state);
    if (!saved) document.querySelector("[data-storage-note]").hidden = false;
    el.classList.add("is-revealing");
    renderAll();
    announce(`Unlocked: ${card.title}! ${result.spent ? `${result.spent.pts} points spent.` : ""}`);
    window.setTimeout(() => el.classList.remove("is-revealing"), REVEAL_MS);
    el.querySelector("[data-vault-open] button, [data-vault-open] a")?.focus();
  };

  for (const el of cards) {
    el.querySelector("[data-unlock]").addEventListener("click", () => {
      const card = cardFrom(el);
      const points = pointsOf(store.load());
      pending = el;
      dialog.querySelector("[data-unlock-title]").textContent = `Unlock “${card.title}”?`;
      dialog.querySelector("[data-unlock-text]").textContent = `This spends ${card.cost} of your ${points} points — you’ll have ${points - card.cost} left. Cards stay unlocked for good.`;
      dialog.showModal();
      dialog.querySelector("[data-unlock-confirm]").focus();
    });
    el.querySelector("[data-share-special]").addEventListener("click", () => share(cardFrom(el), announce));
  }
  dialog.querySelector("[data-unlock-confirm]").addEventListener("click", confirmUnlock);
  for (const cancel of dialog.querySelectorAll("[data-unlock-cancel]")) cancel.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (pending) pending.querySelector("[data-unlock]").focus();
    pending = null;
  });
  document.addEventListener(PROGRESS_EVENT, renderAll);

  if (!store.isPersistent()) document.querySelector("[data-storage-note]").hidden = false;
  renderAll();
  showShared();
}
