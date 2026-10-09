// A 3D page-flip book. Leaf k carries face 2k (front, right-hand page) and
// face 2k+1 (back, left-hand page once flipped). On wide screens a whole
// spread is visible; on phones the camera pans to one page at a time.

import { spreadFor, canGoNext } from "../lib/book-math.js";

const MOBILE_QUERY = "(max-width: 760px)";
const PAGE_RATIO = 1.42;
const FLIP_MS = 900;
const SWIPE_MIN_PX = 50;

export function createBook(container, { faces, renderFace, isComplete, onAction, onBlocked, onFlip, onChange }) {
  const leafCount = faces.length / 2;
  const lastPosition = faces.length - 2; // the final face is the outer back cover
  const mobile = window.matchMedia(MOBILE_QUERY);
  // Every listener is tied to this book; destroy() removes them all, so a
  // re-opened book never answers a tap twice.
  const listeners = new AbortController();
  const { signal } = listeners;
  let position = 0;

  container.innerHTML = `
    <div class="book-stage">
      <div class="book">
        ${Array.from({ length: leafCount }, (_, k) => `
          <div class="leaf" data-leaf="${k}">
            <div class="face front ${k === 0 ? "is-cover" : ""}" data-face="${2 * k}"></div>
            <div class="face back" data-face="${2 * k + 1}"></div>
          </div>`).join("")}
      </div>
    </div>`;

  const book = container.querySelector(".book");
  const leaves = [...container.querySelectorAll(".leaf")];
  const faceEls = [...container.querySelectorAll(".face")];

  const visibleFaces = () => {
    const { flipped } = spreadFor(position);
    if (mobile.matches) return [position];
    return flipped === 0 ? [0] : [2 * flipped - 1, 2 * flipped];
  };

  function size() {
    const w = window.innerWidth - (mobile.matches ? 24 : 80);
    const h = window.innerHeight - (mobile.matches ? 150 : 170);
    const pw = Math.floor(Math.min(mobile.matches ? w : w / 2, h / PAGE_RATIO, 560));
    book.style.setProperty("--pw", `${pw}px`);
    book.style.setProperty("--ph", `${Math.floor(pw * PAGE_RATIO)}px`);
  }

  function layout() {
    const { flipped, side } = spreadFor(position);
    leaves.forEach((leaf, k) => {
      const isFlipped = k < flipped;
      leaf.classList.toggle("is-flipped", isFlipped);
      leaf.style.zIndex = isFlipped ? String(k + 1) : String(leafCount * 2 - k);
    });
    let shift = 0;
    if (flipped === 0) shift = -25;
    else if (mobile.matches) shift = side === "left" ? 25 : -25;
    book.style.transform = `translateX(${shift}%)`;
    book.classList.toggle("is-closed", flipped === 0);
  }

  function refresh() {
    const shown = visibleFaces();
    faceEls.forEach((el, i) => {
      el.innerHTML = renderFace(faces[i], i);
      const isVisible = shown.includes(i);
      el.classList.toggle("is-visible", isVisible);
      // Pages not on screen can't be tabbed to or read by screen readers.
      el.inert = !isVisible;
      el.setAttribute("aria-hidden", String(!isVisible));
    });
  }

  function step(direction) {
    const { flipped } = spreadFor(position);
    if (mobile.matches) return position + direction;
    if (direction > 0) return flipped === 0 ? 2 : 2 * (flipped + 1);
    return flipped <= 1 ? 0 : 2 * (flipped - 1);
  }

  function go(direction) {
    const target = Math.max(0, Math.min(lastPosition, step(direction)));
    if (target === position) return;
    if (direction > 0) {
      const blocked = visibleFaces().find((i) => !isComplete(faces[i]));
      if (!canGoNext(visibleFaces(), (i) => isComplete(faces[i]))) {
        onBlocked?.(faces[blocked], faceEls[blocked]);
        return;
      }
    }
    const before = spreadFor(position).flipped;
    const after = spreadFor(target).flipped;
    if (before !== after) {
      const moving = leaves[Math.min(before, after)];
      moving.style.zIndex = "999";
      moving.classList.add("is-turning");
      setTimeout(() => moving.classList.remove("is-turning"), FLIP_MS);
      onFlip?.();
    }
    position = target;
    layout();
    refresh();
    onChange?.();
  }

  container.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (!el || el.tagName === "FORM") return;
    if (el.dataset.action === "next") return go(1);
    onAction(el.dataset.action, el, event);
  }, { signal });
  container.addEventListener("submit", (event) => {
    event.preventDefault();
    onAction(event.target.dataset.action, event.target, event);
  }, { signal });

  let touchX = null;
  container.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true, signal });
  container.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > SWIPE_MIN_PX && !e.target.closest("input, button")) go(dx < 0 ? 1 : -1);
  }, { signal });

  const onResize = () => {
    size();
    layout();
    refresh();
  };
  window.addEventListener("resize", onResize, { signal });
  mobile.addEventListener("change", onResize, { signal });
  onResize();

  return {
    go,
    refresh,
    visible: () => visibleFaces(),
    get isAtStart() {
      return position === 0;
    },
    get isAtEnd() {
      return position >= lastPosition || (!mobile.matches && spreadFor(position).flipped >= leafCount - 1);
    },
    destroy() {
      listeners.abort();
      container.innerHTML = "";
    },
  };
}
