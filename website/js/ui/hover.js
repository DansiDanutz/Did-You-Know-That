// Hover light for cards and buttons: a glow follows the pointer across the surface and cards lean
// toward it in 3D. The look lives in css/site.css (--mx, --my, --tilt-x, --tilt-y); this only feeds
// it the pointer position. Mouse and trackpad only, and nothing under prefers-reduced-motion.
const SURFACES = ".card-link, .next-tile, .continue, .how-step, .ep-nav-link, .btn, .chip, .rung-btn";
const TILTS = ".card-link, .next-tile, .continue";
const MAX_TILT_DEG = 6;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const round = (v) => Math.round(v * 100) / 100 + 0; // + 0 turns -0 into 0

/** Where the pointer sits on a box (0–100 %) and how far the box should lean toward it (degrees). */
export function pointerGlow(box, clientX, clientY, maxTilt) {
  const fx = clamp01((clientX - box.left) / box.width);
  const fy = clamp01((clientY - box.top) / box.height);
  return { x: round(fx * 100), y: round(fy * 100), tiltX: round((fx * 2 - 1) * maxTilt), tiltY: round((1 - fy * 2) * maxTilt) };
}

export function init() {
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canHover || reduced) return;
  let pending = null;
  let frame = 0;
  const paint = () => {
    frame = 0;
    if (!pending) return;
    const { el, clientX, clientY } = pending;
    const tilt = el.matches(TILTS) ? MAX_TILT_DEG : 0;
    const glow = pointerGlow(el.getBoundingClientRect(), clientX, clientY, tilt);
    el.style.setProperty("--mx", `${glow.x}%`);
    el.style.setProperty("--my", `${glow.y}%`);
    el.style.setProperty("--tilt-x", `${glow.tiltX}deg`);
    el.style.setProperty("--tilt-y", `${glow.tiltY}deg`);
  };
  document.addEventListener("pointermove", (event) => {
    const el = event.target instanceof Element ? event.target.closest(SURFACES) : null;
    if (!el) return;
    pending = { el, clientX: event.clientX, clientY: event.clientY };
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  // Settle back flat when the pointer leaves (the CSS transition eases it).
  document.addEventListener("pointerout", (event) => {
    const el = event.target instanceof Element ? event.target.closest(TILTS) : null;
    if (!el || (event.relatedTarget instanceof Node && el.contains(event.relatedTarget))) return;
    if (pending?.el === el) pending = null;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  });
}
