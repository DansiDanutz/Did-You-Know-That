// Entry point: loads only the behaviour a page actually uses. Every feature is optional —
// the pages are complete, readable HTML without JavaScript.
const features = [
  ["[data-dust]", () => import("./ui/hero.js")],
  ["[data-search]", () => import("./ui/search-ui.js")],
  ["[data-facade]", () => import("./ui/player.js")],
  ["[data-quiz]", () => import("./ui/quiz.js")],
  ["[data-special-card]", () => import("./ui/vault.js")],
  ["[data-collection-scope], [data-rank-badge]", () => import("./ui/collection.js")],
  ["[data-not-found]", () => import("./ui/not-found.js")],
  ["[data-surprise]", () => import("./ui/surprise.js")],
  ["[data-profile-open]", () => import("./ui/profile.js")],
  ["[data-install]", () => import("./ui/install.js")],
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  load()
    .then((module) => module.init())
    .catch((error) => console.error(`Feature for ${selector} failed to start`, error));
}

// YouTube does not always have a maxres thumbnail: fall back to hqdefault once, then hide the
// broken image (the card keeps its neon background). Also catches errors that fired before this ran.
function useThumbnailFallback(img) {
  const fail = () => {
    if (img.dataset.thumbFallback && img.src !== img.dataset.thumbFallback) {
      img.src = img.dataset.thumbFallback;
    } else {
      img.classList.add("is-broken");
      img.removeEventListener("error", fail);
    }
  };
  img.addEventListener("error", fail);
  if (img.complete && img.naturalWidth === 0) fail();
}
document.querySelectorAll("img[data-thumb-fallback]").forEach(useThumbnailFallback);

// Installable app: the service worker caches the app shell and serves a branded offline page.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker registration failed", error));
  });
}
