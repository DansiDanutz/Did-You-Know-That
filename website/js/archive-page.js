// Curiosity Archive page: one prediction with reasoned feedback, a free save,
// a private takeaway and a share link. Everything stays on this device.

import { ARCHIVE_KEY, normalizeArchive, saveDiscovery, markInvestigated, setTakeaway, discoveryStatus } from "./lib/archive.js";
import { withStorageLock } from "./lib/storage-lock.js";

const NOTE_SAVE_DELAY_MS = 600;

// Feedback explains the evidence for every choice; there is no score.
const FEEDBACK = {
  reread:
    "That is what most people expect, and what the re-readers themselves believed. At five minutes you would be right (83% against 71%). After a week the order reversed: 40% for four readings, 61% for one reading and three recall attempts.",
  recall:
    "That is what happened. After a week the recall group remembered 61% against 40%, even though they had read the text about 3.4 times instead of 14. One caution: three recall attempts were not reliably better than one (61% against 56%).",
  same:
    "Partly right. One recall attempt and three were not reliably different after a week (56% against 61%). But both beat four readings (40%), a large gap. At five minutes the re-readers were ahead.",
};

const main = document.querySelector("main[data-discovery]");
const id = main.dataset.discovery;
const status = main.querySelector(".ar-status");
const saveButton = main.querySelector("[data-save]");
const note = main.querySelector("#takeaway");
const nowIso = () => new Date().toISOString();

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function load() {
  try {
    return normalizeArchive(JSON.parse(storage()?.getItem(ARCHIVE_KEY) ?? "null"));
  } catch {
    return normalizeArchive(null);
  }
}

// Read-modify-write under the shared cross-tab lock; reports whether the
// browser really kept it.
async function update(change) {
  return withStorageLock(() => {
    const next = change(load());
    try {
      storage()?.setItem(ARCHIVE_KEY, JSON.stringify(next));
      return { state: next, persisted: Boolean(storage()) };
    } catch {
      return { state: next, persisted: false };
    }
  });
}

const BLOCKED = "This browser isn't keeping data here (private window or storage blocked). Try a normal window.";

function showSaved() {
  saveButton.textContent = "✓ Saved to your archive";
  saveButton.disabled = true;
}

const initial = load();
if (initial.entries[id]?.savedAt) showSaved();
note.value = initial.entries[id]?.takeaway ?? "";
if (discoveryStatus(initial, id) === "revisited") status.textContent = "Welcome back to this case file.";

main.querySelectorAll("[data-choice]").forEach((button) =>
  button.addEventListener("click", async () => {
    main.querySelectorAll("[data-choice]").forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
    main.querySelector(".ar-reveal").hidden = false;
    main.querySelector(".ar-feedback").textContent = FEEDBACK[button.dataset.choice];
    await update((state) => markInvestigated(state, id, nowIso()));
  }),
);

saveButton.addEventListener("click", async () => {
  const { persisted } = await update((state) => saveDiscovery(state, id, nowIso()));
  if (!persisted) {
    status.textContent = BLOCKED;
    return;
  }
  showSaved();
  status.textContent = "Saved. It stays on this device.";
});

let noteTimer;
note.addEventListener("input", () => {
  clearTimeout(noteTimer);
  noteTimer = setTimeout(async () => {
    const { persisted } = await update((state) => setTakeaway(state, id, note.value));
    status.textContent = persisted ? "Takeaway kept on this device only." : BLOCKED;
  }, NOTE_SAVE_DELAY_MS);
});

// Shares the public page only: the private takeaway is never included.
main.querySelector("[data-share]").addEventListener("click", async () => {
  const url = location.origin + location.pathname;
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    status.textContent = "Link copied.";
  } catch (error) {
    if (error?.name === "AbortError") return;
    status.textContent = `Copy this link: ${url}`;
  }
});
