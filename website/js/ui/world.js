// The journey map: a long winding road through a parallax night landscape.
// All geometry is authored in design units (height 820) and scaled to fit
// the viewport height; the map scrolls horizontally.

import { houseSvg } from "./houses.js";
import { createDaxter } from "./character.js";
import { houseStatus, nearestStop, clampRoad } from "../lib/journey.js";

const DESIGN_H = 820;
const START_PAD = 420;
const HOUSE_GAP = 780;
const END_PAD = 560;
const ROAD_Y = 650;
const STOP_OFFSET = 120; // where Daxter stands, right of each door
const WALK_SPEED = 230; // design units per second
const STEP_EVERY = 0.3; // seconds between dust puffs
const DAXTER_W = 150;
const DAXTER_FEET = 200; // feet offset inside the scaled character box

const houseX = (i) => START_PAD + i * HOUSE_GAP;

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Catmull-Rom through the points, emitted as cubic Bézier path data.
function smoothPath(points) {
  const d = [`M${points[0][0]} ${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [p0, p1, p2, p3] = [points[i - 1] ?? points[i], points[i], points[i + 1], points[i + 2] ?? points[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d.push(`C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`);
  }
  return d.join(" ");
}

function roadPoints(count, width) {
  const points = [[0, ROAD_Y + 20], [START_PAD - 260, ROAD_Y + 10]];
  for (let i = 0; i < count; i += 1) {
    points.push([houseX(i) + STOP_OFFSET - 60, ROAD_Y], [houseX(i) + STOP_OFFSET + 60, ROAD_Y]);
    if (i < count - 1) points.push([houseX(i) + HOUSE_GAP / 2 + 60, i % 2 ? ROAD_Y - 70 : ROAD_Y + 80]);
  }
  points.push([width, ROAD_Y + 30]);
  return points;
}

function ridge(width, baseY, amp, step, seed, fill) {
  const rand = seeded(seed);
  let d = `M0 ${DESIGN_H} L0 ${baseY}`;
  for (let x = 0; x <= width + step; x += step) d += ` L${x} ${baseY - rand() * amp}`;
  return `<path d="${d} L${width + step} ${DESIGN_H}Z" fill="${fill}"/>`;
}

function decor(width, count) {
  const rand = seeded(99);
  const items = [];
  for (let x = 160; x < width - 100; x += 150 + rand() * 120) {
    const nearHouse = Array.from({ length: count }, (_, i) => houseX(i)).some((hx) => Math.abs(x - hx) < 230);
    if (nearHouse) continue;
    const kind = rand();
    if (kind < 0.45) {
      items.push(`<g class="tree" transform="translate(${x} ${ROAD_Y - 70 - rand() * 30})">
        <rect x="-6" y="30" width="12" height="44" rx="5" fill="#4a2a14"/>
        <circle cx="0" cy="10" r="34" fill="#2f8a52"/><circle cx="-18" cy="24" r="22" fill="#256f43"/><circle cx="18" cy="22" r="24" fill="#3aa362"/>
        <circle cx="-8" cy="0" r="10" fill="#5fd08a" opacity=".5"/></g>`);
    } else if (kind < 0.75) {
      items.push(`<g class="lamp" transform="translate(${x} ${ROAD_Y - 40})">
        <circle cx="0" cy="-58" r="34" fill="url(#lampGlow)"/>
        <rect x="-3" y="-50" width="6" height="74" fill="#2a1f4a"/>
        <rect x="-10" y="-68" width="20" height="20" rx="4" fill="#ffe27a"/></g>`);
    } else {
      items.push(`<g transform="translate(${x} ${ROAD_Y + 70 + rand() * 40})">
        <circle r="6" fill="#ff7ac0"/><circle cx="14" cy="4" r="5" fill="#ffd44d"/><circle cx="-12" cy="6" r="5" fill="#7fd0ff"/></g>`);
    }
  }
  return items.join("");
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function houseMarkup(story, index, status, t) {
  const label = status === "soon" ? t("house.soon") : t("house.episode", { n: story.episode });
  return `
    <button class="house is-${status}" data-house="${index}" style="left:${houseX(index) - 150}px;top:${ROAD_Y - 296}px"
      aria-label="${label}: ${escapeHtml(story.title)}">
      ${houseSvg(story.house)}
      <span class="house-book" aria-hidden="true">📖<span class="house-ping">!</span></span>
      <span class="house-check" aria-hidden="true">✓</span>
      <span class="house-lock" aria-hidden="true">🔒</span>
      <span class="house-sign"><b>${label}</b>${escapeHtml(story.title)}</span>
    </button>`;
}

const FREE_WALK_SPEED = 260; // design units per second while a move key is held
const NEAR_HOUSE = 110; // how close Daxter must be to enter a house
const COIN_REACH = 28;
const COIN_HOVER = 46; // coins float this high above the road

export function createWorld(wrap, { stories, onHouse, onStep, onCoin, onDaxterTap, onArrive, onEdge }) {
  const width = houseX(stories.length - 1) + END_PAD;
  const pathData = smoothPath(roadPoints(stories.length, width));

  wrap.innerHTML = `
    <div class="sky" aria-hidden="true"><div class="moon"></div><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div></div>
    <div class="world-size">
      <div class="world" style="width:${width}px;height:${DESIGN_H}px">
        <svg class="parallax far" width="${width}" height="${DESIGN_H}" aria-hidden="true">${ridge(width, 470, 150, 120, 7, "#241a5c")}</svg>
        <svg class="parallax mid" width="${width}" height="${DESIGN_H}" aria-hidden="true">${ridge(width, 560, 90, 90, 13, "#2f2370")}</svg>
        <svg class="ground" width="${width}" height="${DESIGN_H}" aria-hidden="true">
          <defs>
            <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a7a5a"/><stop offset="1" stop-color="#123a3a"/></linearGradient>
            <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffe27a" stop-opacity=".7"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
          </defs>
          ${ridge(width, 600, 26, 70, 21, "url(#grass)")}
          <path d="${pathData}" class="road-edge"/>
          <path d="${pathData}" class="road"/>
          <path d="${pathData}" class="road-dash"/>
          <path d="${pathData}" class="road-trail" id="roadTrail"/>
          ${decor(width, stories.length)}
          <g transform="translate(140 ${ROAD_Y - 100})">
            <rect x="-4" y="0" width="8" height="100" fill="#5a3418"/>
            <rect x="-90" y="6" width="180" height="46" rx="8" fill="#b8702f" stroke="#5a3418" stroke-width="4"/>
            <text x="0" y="36" text-anchor="middle" class="sign-text">Road of Wonders →</text>
          </g>
        </svg>
        <div class="houses"></div>
        <div class="coins-layer"></div>
        <div class="actors"></div>
      </div>
    </div>`;

  const sizer = wrap.querySelector(".world-size");
  const world = wrap.querySelector(".world");
  const road = wrap.querySelector(".road-trail");
  const farLayer = wrap.querySelector(".parallax.far");
  const midLayer = wrap.querySelector(".parallax.mid");
  const housesEl = wrap.querySelector(".houses");
  const daxter = createDaxter(wrap.querySelector(".actors"));
  const totalLength = road.getTotalLength();
  let scale = 1;
  let distance = 0;

  // x along the road is monotonic, so a binary search finds the stop length.
  const lengthAtX = (x) => {
    let lo = 0;
    let hi = totalLength;
    for (let i = 0; i < 30; i += 1) {
      const mid = (lo + hi) / 2;
      if (road.getPointAtLength(mid).x < x) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const stops = stories.map((_, i) => lengthAtX(houseX(i) + STOP_OFFSET));

  function layout() {
    scale = Math.max(0.55, Math.min(1.25, wrap.clientHeight / DESIGN_H));
    world.style.transform = `scale(${scale})`;
    sizer.style.width = `${width * scale}px`;
    sizer.style.height = `${DESIGN_H * scale}px`;
  }

  function onScroll() {
    const x = wrap.scrollLeft / scale;
    farLayer.style.transform = `translateX(${x * 0.55}px)`;
    midLayer.style.transform = `translateX(${x * 0.3}px)`;
  }

  let farthest = 0;
  let coins = [];

  // Coins are only collected when the player walks Daxter (not on auto-walks).
  function placeAt(len, { collect = false } = {}) {
    distance = len;
    farthest = Math.max(farthest, len);
    const p = road.getPointAtLength(len);
    daxter.el.style.transform = `translate(${p.x - DAXTER_W / 2}px, ${p.y - DAXTER_FEET}px)`;
    road.style.strokeDashoffset = `${totalLength - farthest}`;
    if (collect) collectCoinsAt(len);
    return p;
  }

  function collectCoinsAt(len) {
    const reached = coins.filter((coin) => Math.abs(coin.len - len) < COIN_REACH);
    if (!reached.length) return;
    coins = coins.filter((coin) => !reached.includes(coin));
    reached.forEach((coin) => {
      coin.el.classList.add("is-collected");
      coin.el.addEventListener("animationend", () => coin.el.remove(), { once: true });
      onCoin?.(coin.id);
    });
  }

  // coinList: [{ id, house, t }] from lib/coins.js
  function setCoins(coinList) {
    const layer = world.querySelector(".coins-layer");
    layer.innerHTML = "";
    const roadEnd = lengthAtX(width - 120);
    coins = coinList.map((coin) => {
      const from = stops[coin.house];
      const to = stops[coin.house + 1] ?? Math.min(roadEnd, from + 520);
      const len = from + (to - from) * coin.t;
      const p = road.getPointAtLength(len);
      const el = document.createElement("span");
      el.className = "road-coin";
      el.style.left = `${p.x - 18}px`;
      el.style.top = `${p.y - COIN_HOVER}px`;
      el.style.animationDelay = `${(coin.t * 1.6).toFixed(2)}s`;
      layer.appendChild(el);
      return { ...coin, len, el };
    });
  }

  // Free walking with the ◀ ▶ controls or arrow keys.
  let moveDir = 0;
  let moveFrame = 0;
  const roadMin = () => lengthAtX(150);
  const roadMax = () => stops[stops.length - 1];

  function startMove(dir) {
    if (moveDir === dir) return;
    moveDir = dir;
    daxter.face(dir);
    daxter.setState("walking");
    daxter.hush();
    cancelAnimationFrame(moveFrame);
    let last = 0;
    let lastStep = 0;
    const frame = (now) => {
      if (!moveDir) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const next = clampRoad(distance + moveDir * FREE_WALK_SPEED * dt, roadMin(), roadMax());
      const blocked = next === distance && dt > 0;
      const p = placeAt(next, { collect: true });
      centerOn(p.x);
      onScroll();
      if (now - lastStep > STEP_EVERY * 1000 && !blocked) {
        lastStep = now;
        spawnDust(p);
        onStep?.();
      }
      if (blocked) {
        stopMove();
        onEdge?.(dir);
        return;
      }
      moveFrame = requestAnimationFrame(frame);
    };
    moveFrame = requestAnimationFrame(frame);
  }

  function stopMove() {
    if (!moveDir) return;
    moveDir = 0;
    cancelAnimationFrame(moveFrame);
    daxter.setState("idle");
    onArrive?.(nearestStop(distance, stops, NEAR_HOUSE));
  }

  function centerOn(x, smooth = false) {
    wrap.scrollTo({ left: x * scale - wrap.clientWidth / 2, behavior: smooth ? "smooth" : "auto" });
  }

  function spawnDust(p) {
    const puff = document.createElement("span");
    puff.className = "dust";
    puff.style.left = `${p.x - 10}px`;
    puff.style.top = `${p.y - 12}px`;
    world.querySelector(".actors").appendChild(puff);
    puff.addEventListener("animationend", () => puff.remove(), { once: true });
  }

  function walkTo(index) {
    const from = distance;
    const to = stops[index];
    const span = Math.abs(to - from);
    if (span < 1) return Promise.resolve();
    const seconds = Math.max(1.2, span / WALK_SPEED);
    daxter.face(Math.sign(to - from));
    daxter.setState("walking");
    daxter.hush();
    return new Promise((resolve) => {
      let start = 0;
      let lastStep = 0;
      const frame = (now) => {
        start ||= now;
        const t = Math.min(1, (now - start) / 1000 / seconds);
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const p = placeAt(from + (to - from) * eased);
        centerOn(p.x);
        if (now - lastStep > STEP_EVERY * 1000 && t < 0.97) {
          lastStep = now;
          spawnDust(p);
          onStep?.();
        }
        if (t < 1) requestAnimationFrame(frame);
        else {
          daxter.setState("idle");
          daxter.face(1);
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  // `view` is { cards } for the active audience; `localized` carries the texts.
  function render(view, localized, t) {
    housesEl.innerHTML = localized.map((story, i) => houseMarkup(story, i, houseStatus(localized, view, i), t)).join("");
  }

  housesEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-house]");
    if (button) onHouse(Number(button.dataset.house));
  });
  daxter.el.addEventListener("click", () => onDaxterTap?.());
  wrap.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    layout();
    centerOn(road.getPointAtLength(distance).x);
  });
  road.style.strokeDasharray = `${totalLength}`;
  layout();

  return {
    daxter,
    render,
    walkTo,
    setCoins,
    startMove,
    stopMove,
    nearestHouse: () => nearestStop(distance, stops, NEAR_HOUSE),
    placeAtHouse(index) {
      const p = placeAt(stops[index]);
      centerOn(p.x);
      onScroll();
    },
    placeAtStart() {
      const p = placeAt(lengthAtX(150));
      centerOn(p.x);
      onScroll();
    },
    houseEl: (index) => housesEl.querySelector(`[data-house="${index}"]`),
  };
}
