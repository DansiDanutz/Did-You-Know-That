// Keyboard and screen-reader boundaries for every overlay (audit finding 05).
// Watches the overlay layers; while one is open, focus moves into the
// topmost one, Tab cycles inside it, the page behind is inert, and focus
// returns to where it was when the overlay closes.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Highest first: the topmost open layer owns focus.
const LAYERS = ["#sheet-layer", "#inspect-layer", "#reveal-layer", "#listen-layer", "#start-layer", "#panel-layer", "#book-layer"];
const BACKGROUND = [".hud", "#world", ".walk-controls", "#kids-bar-host", "#adult-home"];

const FOCUS_RETRY_MS = [0, 120, 360, 700];
const isOpen = (el) => el && !el.hidden;
const focusables = (el) => [...el.querySelectorAll(FOCUSABLE)].filter((node) => !node.closest("[inert], [hidden]"));

export function setupModalFocus(doc = document) {
  const layers = LAYERS.map((sel) => doc.querySelector(sel)).filter(Boolean);
  const background = BACKGROUND.map((sel) => doc.querySelector(sel)).filter(Boolean);
  let active = null;
  let returnTo = null;

  const update = () => {
    const top = layers.find(isOpen) ?? null;
    background.forEach((el) => (el.inert = Boolean(top)));
    doc.body.classList.toggle("has-overlay", Boolean(top));
    layers.forEach((el) => (el.inert = Boolean(top) && el !== top && isOpen(el)));
    if (top === active) return;
    if (!active && top) returnTo = doc.activeElement;
    active = top;
    if (top) {
      // Layers fade in; an element can't take focus until it is visible, so
      // try again over the fade until focus is inside the layer.
      FOCUS_RETRY_MS.forEach((ms) =>
        setTimeout(() => {
          if (active === top && !top.contains(doc.activeElement)) (focusables(top)[0] ?? top).focus?.();
        }, ms),
      );
    } else if (returnTo?.isConnected) {
      returnTo.focus?.();
      returnTo = null;
    }
  };

  doc.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !active) return;
    const items = focusables(active);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || !active.contains(doc.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });

  const observer = new MutationObserver(update);
  layers.forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ["hidden"], childList: true }));
  update();
  return { update };
}
