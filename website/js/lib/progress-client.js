// One progress store per page, plus a DOM event so every widget can refresh after a change.
import { createStore } from "./progress.js";

export const PROGRESS_EVENT = "dyk:progress";
export const store = createStore();

export function saveProgress(state) {
  const saved = store.save(state);
  document.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { state, saved } }));
  return saved;
}
