// Discovery page actions: save this episode's card into the same on-device
// collection the game uses, and share the public page (Web Share or copy).

import { createStore } from "./lib/storage.js";
import { saveCard, isSaved } from "./lib/collection.js";

const main = document.querySelector("main.ep");
const message = main.querySelector(".ep-msg");
const saveButton = main.querySelector("[data-save]");
const { card, audience, url, title } = main.dataset;

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const store = createStore(safeStorage());
const { collection } = store.loadCollection(new Date().toISOString());

function showSaved() {
  saveButton.textContent = "✓ Saved";
  saveButton.disabled = true;
  message.innerHTML = 'Saved to your backpack. <a href="/">Open your collection</a>';
}

if (isSaved(collection, audience, card)) showSaved();

saveButton.addEventListener("click", () => {
  if (!safeStorage()) {
    message.textContent = "This browser is blocking storage, so the card can't be kept here. Try a normal (not private) window.";
    return;
  }
  store.saveCollection(saveCard(collection, audience, card, new Date().toISOString()));
  showSaved();
});

main.querySelector("[data-share]").addEventListener("click", async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    message.textContent = "Link copied! Paste it anywhere to share this discovery.";
  } catch (error) {
    if (error?.name === "AbortError") return;
    message.textContent = `Couldn't share automatically. Copy this link: ${url}`;
  }
});
