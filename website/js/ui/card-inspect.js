// Card selection animation: the tapped card flies out of its slot to the
// centre, spins 720° (back, then face), lands with a shockwave and a burst,
// then floats with live holo foil. Closing flies it back to its slot.

import { enableTilt, burst } from "./card.js";

const FLY_IN_MS = 1100;
const FLY_OUT_MS = 550;
const RESTORE_FOCUS_MS = 60;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function offsetFrom(sourceRect, targetEl) {
  const target = targetEl.getBoundingClientRect();
  return {
    dx: sourceRect.left + sourceRect.width / 2 - (target.left + target.width / 2),
    dy: sourceRect.top + sourceRect.height / 2 - (target.top + target.height / 2),
    scale: sourceRect.width / target.width,
  };
}

export function inspectCard(sourceCard, { actionsHtml, closeLabel = "Close", onSettled, onAction }) {
  const returnFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "card-inspect";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", sourceCard.querySelector(".dyk-card-name")?.textContent ?? "Card");
  overlay.innerHTML = `
    <div class="inspect-backdrop" data-dismiss></div>
    <button class="inspect-close" type="button" data-dismiss aria-label="${closeLabel}">✕</button>
    <div class="inspect-stage">
      <span class="inspect-glow" aria-hidden="true"></span>
      <span class="inspect-shock" aria-hidden="true"></span>
      <div class="inspect-flip">
        <div class="inspect-back"><img src="assets/logo.png" alt="" /></div>
        <div class="inspect-front">${sourceCard.outerHTML}</div>
      </div>
      <div class="inspect-actions">${actionsHtml}</div>
    </div>`;
  // Lives in #inspect-layer, a layer the shared modal manager (modal-focus.js)
  // knows: it locks everything behind, keeps Tab inside and focuses this card.
  const host = document.querySelector("#inspect-layer") ?? document.body;
  host.appendChild(overlay);
  if (host.id === "inspect-layer") host.hidden = false;

  const stage = overlay.querySelector(".inspect-stage");
  const flip = overlay.querySelector(".inspect-flip");
  const clone = overlay.querySelector(".inspect-front .dyk-card");
  ["--rx", "--ry", "--mx", "--my"].forEach((prop) => clone.style.removeProperty(prop));
  enableTilt(clone);

  const sourceRect = sourceCard.getBoundingClientRect();
  const { dx, dy, scale } = offsetFrom(sourceRect, flip);
  sourceCard.classList.add("is-lifted");
  const duration = reducedMotion() ? 1 : FLY_IN_MS;

  flip.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotateY(0deg)` },
      { transform: "translate(0, -30px) scale(1.12) rotateY(540deg)", offset: 0.72 },
      { transform: "translate(0, 0) scale(1) rotateY(720deg)" },
    ],
    { duration, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" },
  ).finished.then(() => {
    overlay.classList.add("is-settled");
    burst(stage);
    onSettled?.();
  });
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  let closing = false;
  function close() {
    if (closing) return;
    closing = true;
    overlay.classList.remove("is-settled", "is-open");
    document.removeEventListener("keydown", onKey);
    const back = offsetFrom(sourceCard.getBoundingClientRect(), flip);
    flip
      .animate(
        [
          { transform: "translate(0, 0) scale(1) rotateY(0deg)" },
          { transform: `translate(${back.dx}px, ${back.dy}px) scale(${back.scale}) rotateY(-360deg)` },
        ],
        { duration: reducedMotion() ? 1 : FLY_OUT_MS, easing: "cubic-bezier(.5,0,.3,1)", fill: "both" },
      )
      .finished.then(() => {
        sourceCard.classList.remove("is-lifted");
        overlay.remove();
        if (host.id === "inspect-layer") host.hidden = true;
        // The modal manager unlocks the library on its next update; focus the
        // card after that (an inert element cannot take focus).
        setTimeout(() => {
          if (returnFocus?.isConnected) returnFocus.focus();
        }, RESTORE_FOCUS_MS);
      });
  }

  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-dismiss]")) return close();
    const action = event.target.closest("[data-watch], [data-read], [data-share]");
    if (action) {
      close();
      onAction(action);
    }
  });
  return { close };
}
