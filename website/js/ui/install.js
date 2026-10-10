// "Install the app": Android/desktop Chrome get the one-tap system dialog (beforeinstallprompt);
// iPhone/iPad Safari get the two Add to Home Screen steps. Dismissal is remembered in this browser.
import { installMode } from "../lib/install.js";

const DISMISS_KEY = "dyk.install.dismissed.v1";
// Never over the first screen: the suggestion waits until the visitor scrolls past it.
const SCROLL_FRACTION = 0.9;

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};
const remember = () => {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* storage blocked: the suggestion may come back next visit */
  }
};
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

export function init() {
  const bar = document.querySelector("[data-install]");
  if (!bar) return;
  const go = bar.querySelector("[data-install-go]");
  const text = bar.querySelector("[data-install-text]");
  let deferred = null;
  let ready = false;

  const render = () => {
    if (!ready || readDismissed()) return void (bar.hidden = true);
    const mode = installMode({ standalone: isStandalone(), hasPrompt: Boolean(deferred), userAgent: navigator.userAgent });
    bar.dataset.mode = mode;
    go.hidden = mode !== "prompt";
    if (mode === "ios") text.textContent = "Tap the Share button, then “Add to Home Screen”.";
    bar.hidden = mode === "hidden";
  };
  const dismiss = () => {
    remember();
    bar.hidden = true;
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    render();
  });
  window.addEventListener("appinstalled", dismiss);
  go.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === "accepted") dismiss();
    else render();
  });
  bar.querySelector("[data-install-dismiss]").addEventListener("click", dismiss);
  const onScroll = () => {
    if (window.scrollY < window.innerHeight * SCROLL_FRACTION) return;
    ready = true;
    window.removeEventListener("scroll", onScroll);
    render();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}
