// Builds index.html + timeline.json for "The Little Things That Make a Family"
// (Episode 1 film, 2D pilot): six acted scenes from David's screenplay, title
// and closing credits, four recorded voices, music bed. Timing follows the
// recorded dialogue (assets/vo/*.mp3). Standalone cut: no game overlays.
//   node build.mjs → python3 ../../tools/make_bed.py video/ep01-family
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { character, actor } from "./rig.mjs";

const { lines } = JSON.parse(readFileSync("vo-lines.json", "utf8"));
const dur = (path) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString());
const vo = Object.fromEntries(lines.map((l) => [l.id, { ...l, len: dur(`assets/vo/${l.id}.mp3`) }]));
const f = (n) => Number(n).toFixed(2);

// ---------------------------------------------------------------- backgrounds (original vector art)
const KITCHEN = (light = "morning") => {
  const wall = light === "morning" ? "#fff1c9" : light === "afternoon" ? "#ffe8d1" : "#f1d9ff";
  const sky = light === "morning" ? "#bfe6ff" : light === "afternoon" ? "#ffd27a" : "#2a1a7a";
  return `<rect width="1920" height="1080" fill="${wall}"/><rect y="780" width="1920" height="300" fill="#c98a3a"/><rect y="780" width="1920" height="14" fill="#8a5a2b"/>
  <rect x="1260" y="120" width="420" height="320" rx="16" fill="${sky}" stroke="#8a5a2b" stroke-width="14"/>${light === "evening" ? `<circle cx="1560" cy="200" r="34" fill="#fff5c2"/><circle cx="1380" cy="170" r="4" fill="#fff"/><circle cx="1470" cy="300" r="4" fill="#fff"/>` : `<circle cx="1560" cy="200" r="54" fill="#ffe36b"/>`}<path d="M1270 400 l60 -70 l50 40 l70 -90 l110 120Z" fill="#7ccf6a"/>
  <rect x="80" y="520" width="700" height="260" rx="10" fill="#e9dcc4" stroke="#8a5a2b" stroke-width="10"/><rect x="80" y="520" width="700" height="24" fill="#8a5a2b"/>
  <rect x="120" y="300" width="160" height="200" rx="10" fill="#fff" stroke="#8a5a2b" stroke-width="10"/><rect x="300" y="300" width="300" height="200" rx="10" fill="#fff" stroke="#8a5a2b" stroke-width="10"/>
  <rect x="820" y="700" width="1000" height="40" rx="10" fill="#8a5a2b"/><rect x="870" y="740" width="40" height="260" fill="#8a5a2b"/><rect x="1730" y="740" width="40" height="260" fill="#8a5a2b"/>
  <g class="prop-paper"><rect x="1080" y="630" width="300" height="70" rx="8" fill="#fff" stroke="#3a2412" stroke-width="5" transform="skewX(-20)"/><path d="M1100 672 q40 -36 80 0 q40 36 80 0 q30 -26 60 0" stroke="#ff3fa4" stroke-width="7" fill="none"/></g>
  <g class="prop-pencils"><rect x="1420" y="640" width="16" height="56" rx="3" fill="#ff3fa4" transform="rotate(-20 1428 668)"/><rect x="1450" y="640" width="16" height="56" rx="3" fill="#3d7bff" transform="rotate(-8 1458 668)"/><rect x="1480" y="640" width="16" height="56" rx="3" fill="#3ee07a" transform="rotate(10 1488 668)"/></g>
  <g class="prop-glass" style="transform-box: fill-box; transform-origin: 50% 100%;"><rect x="1560" y="610" width="64" height="90" rx="8" fill="#bfe6ff" stroke="#3a2412" stroke-width="5"/><rect x="1566" y="646" width="52" height="48" fill="#4fc3ff"/></g>
  <ellipse class="prop-puddle" cx="1240" cy="700" rx="0" ry="0" fill="#4fc3ff" opacity=".7"/>`;
};
const LIVING = `<rect width="1920" height="1080" fill="#f1d9ff"/><rect y="800" width="1920" height="280" fill="#c98a3a"/><rect y="800" width="1920" height="14" fill="#8a5a2b"/>
  <rect x="1240" y="120" width="420" height="300" rx="16" fill="#2a1a7a" stroke="#8a5a2b" stroke-width="14"/><circle cx="1540" cy="200" r="34" fill="#fff5c2"/><circle cx="1360" cy="180" r="4" fill="#fff"/><circle cx="1450" cy="320" r="4" fill="#fff"/><circle cx="1600" cy="340" r="3" fill="#fff"/>
  <rect x="300" y="420" width="1300" height="410" rx="60" fill="#ff8fc7" stroke="#3a2412" stroke-width="10"/><rect x="340" y="460" width="1220" height="200" rx="40" fill="#ffb3d9"/><rect x="260" y="560" width="90" height="280" rx="40" fill="#ff8fc7" stroke="#3a2412" stroke-width="10"/><rect x="1550" y="560" width="90" height="280" rx="40" fill="#ff8fc7" stroke="#3a2412" stroke-width="10"/>
  <rect x="120" y="200" width="150" height="110" rx="8" fill="#fff" stroke="#8a5a2b" stroke-width="10"/><rect x="300" y="230" width="110" height="80" rx="8" fill="#fff" stroke="#8a5a2b" stroke-width="10"/>
  <rect x="700" y="880" width="520" height="40" rx="10" fill="#ffd84a" opacity=".6"/>
  <g class="lamp"><rect x="1760" y="560" width="14" height="260" fill="#3a2412"/><path d="M1700 560 l134 0 l-30 -100 l-74 0Z" fill="#ffd84a"/><circle cx="1767" cy="600" r="120" fill="#ffd84a" opacity=".15"/></g>`;
const DRAWING = (bigEars = false, heart = false, names = false, cls = "drawing") => `<g class="${cls}"><rect x="600" y="220" width="720" height="520" rx="12" fill="#fff" stroke="#3a2412" stroke-width="8"/>
  ${bigEars ? `<circle cx="960" cy="470" r="70" fill="none" stroke="#3d7bff" stroke-width="8"/><ellipse class="big-ear" cx="870" cy="470" rx="46" ry="60" fill="none" stroke="#3d7bff" stroke-width="8"/><ellipse class="big-ear" cx="1050" cy="470" rx="46" ry="60" fill="none" stroke="#3d7bff" stroke-width="8"/><path d="M930 490 q30 30 60 0" stroke="#3d7bff" stroke-width="8" fill="none"/><circle cx="940" cy="450" r="7" fill="#3d7bff"/><circle cx="980" cy="450" r="7" fill="#3d7bff"/>` : ""}
  ${names ? `<g stroke-width="8" fill="none"><circle cx="800" cy="520" r="34" stroke="#3ee07a"/><rect x="776" y="560" width="48" height="70" rx="14" stroke="#3ee07a"/><circle cx="900" cy="520" r="38" stroke="#3d7bff"/><rect x="872" y="564" width="56" height="70" rx="14" stroke="#3d7bff"/><circle cx="1010" cy="540" r="28" stroke="#ff3fa4"/><rect x="990" y="574" width="40" height="56" rx="12" stroke="#ff3fa4"/><circle cx="1100" cy="556" r="22" stroke="#ff8a1f"/><rect x="1084" y="584" width="32" height="46" rx="10" stroke="#ff8a1f"/></g>` : ""}
  ${heart ? `<path class="big-heart" d="M960 360 c-60 -120 -260 -40 -200 100 c40 90 200 190 200 190 c0 0 160 -100 200 -190 c60 -140 -140 -220 -200 -100Z" fill="none" stroke="#ff3fa4" stroke-width="12"/>` : ""}</g>`;
const CARD = `<g class="card-prop"><rect x="800" y="300" width="340" height="240" rx="16" fill="#fff" stroke="#3a2412" stroke-width="6"/><text x="970" y="390" text-anchor="middle" font-size="40" font-family="Fredoka" font-weight="700" fill="#b8126a">WE LOVE</text><text x="970" y="445" text-anchor="middle" font-size="40" font-family="Fredoka" font-weight="700" fill="#b8126a">OUR FAMILY!</text><path d="M970 486 c-12 -26 -50 -8 -42 20 c8 20 42 36 42 36 c0 0 34 -16 42 -36 c8 -28 -30 -46 -42 -20Z" fill="#ff3fa4"/></g>`;
const BAGS = `<g class="bags"><rect x="1500" y="860" width="110" height="140" rx="14" fill="#c98a3a" stroke="#3a2412" stroke-width="6"/><rect x="1620" y="860" width="110" height="140" rx="14" fill="#ffd84a" stroke="#3a2412" stroke-width="6"/><rect class="small-bag" x="1740" y="900" width="80" height="100" rx="14" fill="#3ee07a" stroke="#3a2412" stroke-width="6"/></g>`;
const TEDDY = `<g transform="translate(120 230)"><circle cx="0" cy="0" r="14" fill="#c98a3a"/><circle cx="-10" cy="-10" r="6" fill="#c98a3a"/><circle cx="10" cy="-10" r="6" fill="#c98a3a"/><rect x="-12" y="8" width="24" height="26" rx="10" fill="#c98a3a"/></g>`;
const TOWEL = `<rect x="128" y="236" width="40" height="26" rx="6" fill="#fff" stroke="#3a2412" stroke-width="3" transform="rotate(20 148 249)"/>`;

// ---------------------------------------------------------------- scenes: cast + beats
// A beat is a spoken line ({say}) or a pause ({wait}); `act(t)` adds GSAP lines at the beat's start.
const SCENES = [
  { id: "title", kind: "card", length: 6 },
  {
    id: "s1", bg: KITCHEN("morning"), mood: "play",
    cast: [["mom", { x: 420, y: 1010, mood: "happy", flip: true }], ["dad", { x: 1640, y: 1010, mood: "happy", flip: true }], ["emma", { x: 1120, y: 1010, mood: "neutral" }], ["leo", { x: -200, y: 1010, mood: "big", prop: TEDDY }]],
    beats: [
      { wait: 1.2, act: (t, A) => [A.mom.arm("r", -60, t), A.mom.arm("r", -40, t + 0.6), A.dad.arm("l", 50, t + 0.3), A.emma.arm("r", -35, t), A.emma.look(4, 4, t)] },
      { say: "s1-leo-1", act: (t, A) => [A.leo.move(520, t - 0.2, 1.6), A.leo.walk(t - 0.2, 1.6), A.leo.arm("l", -140, t, 0.3)] },
      { say: "s1-mom-1", act: (t, A) => [A.mom.head(-6, t), A.mom.arm("l", 40, t)] },
      { say: "s1-dad-1", act: (t, A) => [A.dad.arm("l", 120, t), A.dad.hop(t + 0.2, 20)] },
      { say: "s1-leo-2", act: (t, A) => [A.leo.move(860, t - 0.1, 1.2), A.leo.walk(t - 0.1, 1.2), A.leo.hop(t + 1.3, 30), A.leo.arm("l", -120, t + 1.2)] },
      { say: "s1-emma-1", act: (t, A) => [A.emma.mouth("angry", t), A.emma.brows(2, t, 8), A.emma.arm("r", -20, t), A.leo.mouth("sad", t + vo["s1-emma-1"].len), A.leo.brows(4, t + vo["s1-emma-1"].len, -8), A.leo.slump(t + vo["s1-emma-1"].len + 0.2), A.leo.look(0, 6, t + vo["s1-emma-1"].len)] },
      { wait: 2.4 },
    ],
  },
  {
    id: "s2", bg: KITCHEN("morning"), mood: "tension",
    cast: [["mom", { x: 420, y: 1010, mood: "neutral", flip: true }], ["emma", { x: 1120, y: 1010, mood: "neutral" }], ["leo", { x: 860, y: 1010, mood: "neutral" }]],
    beats: [
      { wait: 1.4, act: (t, A) => [A.leo.look(6, 0, t), A.leo.arm("l", -70, t + 0.4, 0.8), `tl.to("#sc-s2 .prop-glass", {rotation:80, x:-80, duration:0.5, ease:"power2.in"}, ${f(t + 1.0)});`, `tl.to("#sc-s2 .prop-puddle", {attr:{rx:240, ry:34}, duration:0.6, ease:"power2.out"}, ${f(t + 1.3)});`, `tl.to("#sc-s2 .prop-paper", {opacity:0.5, fill:"#bfe6ff", duration:0.5}, ${f(t + 1.4)});`] },
      { wait: 0.6 },
      { say: "s2-emma-1", act: (t, A) => [A.emma.hop(t - 0.1, 50), A.emma.mouth("angry", t), A.emma.brows(2, t, 12), A.emma.arm("l", -140, t), A.emma.arm("r", -140, t), A.leo.mouth("sad", t + 0.3), A.leo.brows(4, t + 0.3, -10), A.leo.move(760, t + 0.2, 0.5)] },
      { say: "s2-leo-1", act: (t, A) => [A.emma.arm("l", 0, t), A.emma.arm("r", 0, t), A.leo.arm("l", -40, t), A.leo.shake(t)] },
      { wait: 0.5, act: (t, A) => [A.emma.arm("l", 30, t), A.emma.arm("r", -30, t), A.mom.move(560, t, 1.4), A.mom.walk(t, 1.4)] },
      { wait: 1.2, act: (t, A) => [A.mom.kneel(t)] },
      { say: "s2-mom-1", act: (t, A) => [A.mom.head(4, t), A.mom.arm("l", 30, t)] },
      { say: "s2-emma-2", act: (t, A) => [A.emma.brows(2, t, 10), A.emma.arm("l", -60, t)] },
      { say: "s2-mom-2", act: (t, A) => [A.mom.nod(t + 0.5), A.emma.brows(0, t + 3, 0), A.emma.mouth("neutral", t + 3)] },
      { say: "s2-mom-3", act: (t, A) => [A.mom.head(-8, t), A.mom.look(-4, 0, t)] },
      { say: "s2-leo-2", act: (t, A) => [A.leo.look(-4, 2, t), A.leo.arm("l", -30, t)] },
      { say: "s2-mom-4", act: (t, A) => [A.mom.nod(t), A.mom.unkneel(t + vo["s2-mom-4"].len - 0.6)] },
      { wait: 1.6 },
    ],
  },
  {
    id: "s3", bg: KITCHEN("morning"), mood: "warm",
    cast: [["emma", { x: 1120, y: 1010, mood: "neutral" }], ["leo", { x: 760, y: 1010, mood: "sad", prop: TOWEL }]],
    beats: [
      { wait: 1.0, act: (t, A) => [A.leo.move(880, t, 0.8), A.leo.walk(t, 0.8), A.leo.arm("r", -80, t + 0.8, 0.5), `tl.to("#sc-s3 .ch-leo .ch-arm-r", {rotation:-60, duration:0.3, yoyo:true, repeat:5}, ${f(t + 1.3)});`, `tl.to("#sc-s3 .prop-puddle", {attr:{rx:0, ry:0}, duration:2, ease:"power2.in"}, ${f(t + 1.3)});`] },
      { wait: 2.2 },
      { say: "s3-leo-1", act: (t, A) => [A.leo.head(6, t), A.leo.look(6, 0, t), A.emma.look(-4, 2, t), A.emma.head(6, t + 1)] },
      { wait: 0.8, act: (t, A) => [A.emma.mouth("neutral", t), A.emma.brows(0, t, 0)] },
      { say: "s3-emma-1", act: (t, A) => [A.emma.head(8, t), A.emma.mouth("sad", t + 2.6), A.emma.look(0, 4, t + 2.6)] },
      { say: "s3-leo-2", act: (t, A) => [A.leo.mouth("big", t), A.leo.brows(0, t, 0), A.leo.hop(t, 36)] },
      { say: "s3-emma-2", act: (t, A) => [A.emma.mouth("happy", t), A.emma.arm("l", -90, t), `tl.fromTo("#sc-s3 .fresh-paper", {opacity:0, y:30}, {opacity:1, y:0, duration:0.4}, ${f(t + 0.2)});`] },
      { say: "s3-leo-3", act: (t, A) => [A.leo.mouth("surprised", t), A.leo.brows(-4, t), A.leo.hop(t + 0.2, 60), A.leo.arm("l", -160, t), A.leo.arm("r", -160, t)] },
      { say: "s3-emma-3", act: (t, A) => [A.emma.nod(t), A.emma.mouth("big", t + 0.4), A.leo.mouth("big", t + 0.4), A.leo.arm("l", 0, t + 0.6), A.leo.arm("r", -40, t + 0.6)] },
      { wait: 2.0, act: (t, A) => [A.emma.arm("r", -30, t), A.leo.arm("r", -30, t), `tl.to("#sc-s3 .ch-emma .ch-arm-r, #sc-s3 .ch-leo .ch-arm-r", {rotation:-20, duration:0.3, yoyo:true, repeat:5}, ${f(t + 0.3)});`] },
    ],
  },
  {
    id: "s4", bg: KITCHEN("morning") + DRAWING(true), mood: "play",
    cast: [["emma", { x: 360, y: 1060, mood: "happy", scale: 1.15 }], ["leo", { x: 1560, y: 1060, mood: "big", scale: 1.2, flip: true }], ["dad", { x: 1820, y: 1010, mood: "happy", flip: true, scale: 0.9 }], ["mom", { x: 120, y: 1010, mood: "happy", scale: 0.9 }]],
    beats: [
      { wait: 1.6, act: (t, A) => [`tl.fromTo("#sc-s4 .big-ear", {scale:0.2, svgOrigin:"960 470"}, {scale:1, duration:0.8, ease:"back.out(2)"}, ${f(t)});`, A.leo.arm("r", -60, t), `tl.set("#sc-s4 .ch-pos-dad, #sc-s4 .ch-pos-mom", {opacity:0}, 0);`] },
      { say: "s4-emma-1", act: (t, A) => [A.emma.mouth("big", t), A.emma.hop(t + 0.3, 20), A.emma.arm("l", -100, t)] },
      { say: "s4-leo-1", act: (t, A) => [A.leo.arm("l", -120, t), A.leo.head(-8, t), A.leo.hop(t + 1.4, 30)] },
      { wait: 0.3, act: (t, A) => [`tl.to("#sc-s4 .ch-pos-dad", {opacity:1, duration:0.3}, ${f(t)});`, A.dad.move(1700, t, 1.0), A.dad.walk(t, 1.0)] },
      { say: "s4-dad-1", act: (t, A) => [A.dad.arm("l", 110, t), A.dad.head(-6, t), A.dad.arm("r", -80, t + 0.5), A.emma.mouth("big", t + 1), A.leo.mouth("big", t + 1), A.emma.hop(t + 2, 20), A.leo.hop(t + 2.2, 24)] },
      { wait: 0.8, act: (t, A) => [`tl.to("#sc-s4 .ch-pos-mom", {opacity:1, duration:0.3}, ${f(t)});`, A.mom.move(230, t, 1.0), A.mom.walk(t, 1.0)] },
      { say: "s4-emma-2", act: (t, A) => [A.emma.arm("l", -140, t), `tl.to("#sc-s4 .drawing", {opacity:0, duration:0.3}, ${f(t + 0.8)});`, `tl.fromTo("#sc-s4 .drawing-2", {opacity:0}, {opacity:1, duration:0.4}, ${f(t + 1.1)});`] },
      { say: "s4-leo-2", act: (t, A) => [A.leo.head(8, t), A.leo.look(-5, 0, t)] },
      { say: "s4-emma-3", act: (t, A) => [A.emma.head(-8, t), A.emma.look(0, -4, t), A.emma.arm("r", -20, t)] },
      { say: "s4-mom-1", act: (t, A) => [A.mom.head(4, t), A.mom.arm("r", -40, t), A.mom.arm("r", -70, t + 3), A.mom.arm("l", 60, t + 5), `tl.fromTo("#sc-s4 .families", {opacity:0, y:40}, {opacity:1, y:0, duration:0.6}, ${f(t + 3.2)});`] },
      { say: "s4-dad-2", act: (t, A) => [A.dad.arm("l", 60, t), A.dad.nod(t + 0.8), `tl.to("#sc-s4 .families", {opacity:0, duration:0.4}, ${f(t)});`] },
      { say: "s4-emma-4", act: (t, A) => [A.emma.arm("l", -120, t), A.emma.hop(t, 20)] },
      { say: "s4-leo-3", act: (t, A) => [A.leo.arm("l", -150, t), A.leo.arm("r", -150, t), A.leo.hop(t + 0.3, 40)] },
      { say: "s4-mom-2", act: (t, A) => [A.mom.mouth("big", t), A.mom.head(-6, t), A.mom.arm("r", -90, t + 1), A.dad.mouth("big", t + 0.5)] },
      { wait: 1.6, act: (t, A) => [`tl.fromTo("#sc-s4 .drawing-2 .big-heart", {opacity:0, scale:0.3, svgOrigin:"960 500"}, {opacity:1, scale:1, duration:0.8, ease:"back.out(1.6)"}, ${f(t)});`] },
    ],
  },
  {
    id: "s5", bg: KITCHEN("afternoon") + BAGS, mood: "warm",
    cast: [["dad", { x: 1400, y: 1010, mood: "neutral", flip: true }], ["emma", { x: 960, y: 1010, mood: "happy" }], ["mom", { x: 420, y: 1010, mood: "happy", flip: true }], ["leo", { x: 640, y: 1010, mood: "happy" }]],
    beats: [
      { wait: 1.2, act: (t, A) => [A.dad.arm("l", 40, t), A.dad.arm("r", -40, t), A.emma.move(1180, t, 1.0), A.emma.walk(t, 1.0), A.emma.arm("l", -80, t + 1.0), `tl.to("#sc-s5 .small-bag", {x:-520, y:-120, duration:0.6, ease:"power1.inOut"}, ${f(t + 1.2)});`] },
      { say: "s5-dad-1", act: (t, A) => [A.dad.head(6, t), A.dad.mouth("happy", t), A.emma.hop(t + 1, 20)] },
      { wait: 0.6, act: (t, A) => [A.leo.move(560, t, 0.8), A.leo.walk(t, 0.8), A.leo.arm("l", -70, t + 0.8), `tl.fromTo("#sc-s5 .napkins rect", {opacity:0, y:-30}, {opacity:1, y:0, duration:0.3, stagger:0.25}, ${f(t + 1.0)});`] },
      { say: "s5-mom-1", act: (t, A) => [A.mom.head(-6, t), A.mom.arm("l", 40, t), A.leo.mouth("big", t + 0.5), A.leo.hop(t + 0.6, 30)] },
      { say: "s5-emma-1", act: (t, A) => [A.emma.move(800, t - 0.5, 0.8), A.emma.walk(t - 0.5, 0.8), A.emma.head(8, t), A.emma.arm("r", -60, t), A.leo.look(6, 0, t)] },
      { wait: 1.2, act: (t, A) => [`tl.fromTo("#sc-s5 .card-prop", {opacity:0, scale:0.4, svgOrigin:"970 500"}, {opacity:1, scale:1, duration:0.6, ease:"back.out(1.6)"}, ${f(t)});`, A.dad.move(1240, t + 0.2, 1.0), A.dad.walk(t + 0.2, 1.0), A.mom.move(600, t + 0.2, 1.0), A.mom.walk(t + 0.2, 1.0), A.dad.kneel(t + 1.3), A.mom.mouth("big", t + 1.3), A.mom.arm("l", 100, t + 1.3)] },
      { say: "s5-dad-2", act: (t, A) => [A.dad.head(-6, t), A.dad.arm("l", 50, t)] },
      { say: "s5-leo-1", act: (t, A) => [A.leo.head(-8, t), A.leo.arm("l", -100, t)] },
      { say: "s5-emma-2", act: (t, A) => [A.emma.head(8, t), A.emma.arm("r", -90, t)] },
      { say: "s5-dad-3", act: (t, A) => [A.dad.nod(t), A.dad.arm("l", 110, t + 2.2), A.dad.arm("r", -110, t + 2.2), A.emma.mouth("big", t + 2.6), A.leo.mouth("big", t + 2.6), A.mom.mouth("big", t + 2.6)] },
      { wait: 2.0, act: (t, A) => [`tl.fromTo("#sc-s5 .heart-pop", {opacity:0, y:0, scale:0.5}, {opacity:1, y:-80, scale:1, duration:1.2, stagger:0.2, ease:"power2.out"}, ${f(t)});`] },
    ],
  },
  {
    id: "s6", bg: LIVING, mood: "lullaby",
    cast: [["mom", { x: 560, y: 880, mood: "happy", scale: 0.85 }], ["emma", { x: 790, y: 890, mood: "happy", scale: 0.85 }], ["leo", { x: 1110, y: 900, mood: "happy", scale: 0.85, flip: true }], ["dad", { x: 1360, y: 880, mood: "happy", scale: 0.85, flip: true }]],
    beats: [
      { wait: 1.6, act: (t, A) => [A.emma.head(-10, t), A.mom.arm("r", -50, t), A.dad.arm("l", 50, t)] },
      { say: "s6-leo-1", act: (t, A) => [A.leo.look(-5, -3, t), A.leo.head(6, t)] },
      { say: "s6-dad-1", act: (t, A) => [A.dad.head(-6, t), A.dad.look(4, 2, t)] },
      { say: "s6-leo-2", act: (t, A) => [A.leo.brows(-4, t)] },
      { say: "s6-dad-2", act: (t, A) => [A.dad.brows(-5, t), A.dad.mouth("surprised", t), A.dad.mouth("happy", t + vo["s6-dad-2"].len)] },
      { say: "s6-leo-3", act: (t, A) => [A.leo.arm("l", -80, t), A.emma.nod(t + 1)] },
      { say: "s6-dad-3", act: (t, A) => [A.dad.nod(t), A.dad.arm("l", 70, t + 1)] },
      { say: "s6-emma-1", act: (t, A) => [A.emma.head(10, t), A.emma.look(5, -3, t), A.emma.look(-5, -3, t + 0.6), A.emma.head(0, t + 0.9)] },
      { say: "s6-mom-1", act: (t, A) => [A.mom.arm("r", -100, t), A.mom.arm("r", -60, t + 1.2), A.mom.head(-6, t + 1)] },
      { wait: 0.8, act: (t, A) => [A.leo.look(0, -4, t), A.leo.head(-6, t), A.leo.brows(-3, t)] },
      { say: "s6-leo-4", act: (t, A) => [A.leo.mouth("big", t), A.leo.hop(t + 0.4, 40), A.leo.arm("l", -150, t), A.emma.mouth("big", t + 1), A.mom.mouth("big", t + 1), A.dad.mouth("big", t + 1), A.dad.hop(t + 1.2, 10), A.mom.hop(t + 1.3, 10)] },
      { wait: 1.5, act: (t, A) => [`tl.to("#sc-s6 .stage", {scale:0.8, y:40, duration:4, ease:"power1.inOut"}, ${f(t)});`, `tl.to("#sc-s6 .stage", {opacity:0.55, duration:3}, ${f(t + 1)});`] },
      { say: "s6-narr-1", act: (t) => [`tl.fromTo("#sc-s6 .end-line", {opacity:0, y:20}, {opacity:1, y:0, duration:0.8}, ${f(t + 0.3)});`] },
      { wait: 2.5 },
    ],
  },
  { id: "credits", kind: "card", length: 8 },
];

// ---------------------------------------------------------------- timeline
let t = 0;
const scenes = [];
const voClips = [];
for (const sc of SCENES) {
  const start = +t.toFixed(3);
  if (sc.kind === "card") { scenes.push({ id: sc.id, kind: "scene", start, length: sc.length }); t += sc.length; continue; }
  let local = 0;
  const beats = [];
  for (const b of sc.beats) {
    const at = +(start + local).toFixed(3);
    if (b.say) {
      const line = vo[b.say];
      if (!line) throw new Error(`no line ${b.say}`);
      voClips.push({ id: b.say, start: at, len: line.len, speaker: line.speaker });
      beats.push({ ...b, at, len: line.len });
      local += line.len + 0.35;
    } else {
      beats.push({ ...b, at });
      local += b.wait;
    }
  }
  scenes.push({ id: sc.id, kind: "scene", start, length: +local.toFixed(3), beats, cast: sc.cast, bg: sc.bg, mood: sc.mood });
  t += local;
}
const TOTAL = +t.toFixed(3);
const at = (id) => scenes.find((s) => s.id === id);
const sfx = [
  ["sting", 0.3], ["chime", at("s1").start + 0.5], ["pop", voClips.find((v) => v.id === "s1-leo-1").start],
  ["sad", voClips.find((v) => v.id === "s1-emma-1").start + vo["s1-emma-1"].len],
  ["whoosh", at("s2").start + 2.2], ["low", at("s2").start + 2.6], ["sad", voClips.find((v) => v.id === "s2-leo-1").start],
  ["page", at("s3").start + 1.3], ["chime", voClips.find((v) => v.id === "s3-leo-2").start], ["pop", voClips.find((v) => v.id === "s3-leo-3").start],
  ["pop", at("s4").start + 1.6], ["victory", voClips.find((v) => v.id === "s4-dad-1").start + 1.2], ["chime", at("s4").start + at("s4").length - 1.4],
  ["tap", at("s5").start + 1.4], ["tap", at("s5").start + 4.0], ["card", at("s5").start + at("s5").length - 9], ["chime", at("s5").start + at("s5").length - 1.8],
  ["chime", voClips.find((v) => v.id === "s6-leo-4").start + 0.4], ["sting", voClips.find((v) => v.id === "s6-narr-1").start], ["fanfare", at("credits").start + 0.3],
];
writeFileSync("timeline.json", JSON.stringify({ total: TOTAL, scenes: scenes.map(({ beats, cast, bg, ...s }) => s), vo: voClips, sfx, moods: Object.fromEntries(scenes.map((s) => [s.id, s.mood ?? (s.id === "title" ? "warm" : "resolve")])) }, null, 2));

// ---------------------------------------------------------------- markup
const stage = (sc) => {
  const extras = {
    s3: `<g class="fresh-paper" opacity="0"><rect x="1080" y="630" width="300" height="70" rx="8" fill="#fff" stroke="#3a2412" stroke-width="5" transform="skewX(-20)"/></g>`,
    s4: `<g class="drawing-2" opacity="0">${DRAWING(false, true, true, "drawing-inner")}</g><g class="families" opacity="0"><rect x="560" y="120" width="800" height="150" rx="24" fill="#fff" stroke="#3a2412" stroke-width="6"/><text x="960" y="178" text-anchor="middle" font-size="36" font-family="Fredoka" font-weight="700" fill="#3a2412">Families can look different</text><text x="960" y="232" text-anchor="middle" font-size="30" font-family="Fredoka" fill="#6b4a2a">big · small · one parent · two · grandparents · people who care</text></g>`,
    s5: `<g class="napkins"><rect x="900" y="650" width="70" height="46" rx="6" fill="#fff" stroke="#3a2412" stroke-width="4"/><rect x="1060" y="650" width="70" height="46" rx="6" fill="#fff" stroke="#3a2412" stroke-width="4"/><rect x="1220" y="650" width="70" height="46" rx="6" fill="#fff" stroke="#3a2412" stroke-width="4"/></g>${CARD.replace('class="card-prop"', 'class="card-prop" opacity="0"')}`,
  };
  const front = {};
  return `<div class="stage"><svg viewBox="0 0 1920 1080">${sc.bg}${extras[sc.id] ?? ""}${sc.cast.map(([id, opts]) => character(id, opts)).join("")}${front[sc.id] ?? ""}</svg></div>`;
};
const BODY = {
  title: () => `<div class="t-logo"><img src="assets/logo.png" alt="" /></div><p class="t-presents">DEXTY STORIES PRESENTS</p><h1 class="t-title">The Little Things<br/>That Make a Family</h1><p class="t-sub">A story about Emma, Leo, Mom and Dad</p>`,
  credits: () => `<div class="credits"><b>The Little Things That Make a Family</b>Emma · Leo · Mom · Dad<br/>Written for Dexty · Did You Know That?<small>Love grows through the little things we do every day.</small><small>dexty.live</small></div>`,
};
const sceneHtml = (s) => {
  const inner = s.cast ? `${stage(s)}${s.id === "s6" ? `<p class="end-line">Love grows through the little things<br/>we do every day.</p>` : ""}${s.id === "s5" ? `<span class="heart-pop" style="left:1260px;top:260px">❤️</span><span class="heart-pop" style="left:1380px;top:220px">💛</span><span class="heart-pop" style="left:560px;top:250px">💗</span>` : ""}` : BODY[s.id]();
  return `<section id="sc-${s.id}" class="clip scene bg-${s.id}" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-track-index="0">${inner}</section>`;
};
const audioHtml = [
  `<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="5" data-volume="0.4"></audio>`,
  ...voClips.map((v) => `<audio id="vo-${v.id}" src="assets/vo/${v.id}.mp3" data-start="${v.start}" data-duration="${v.len.toFixed(3)}" data-track-index="6" data-volume="1"></audio>`),
].join("\n      ");

// ---------------------------------------------------------------- animation
const anim = (s) => {
  const S = s.start, E = s.start + s.length;
  if (s.id === "title") return [
    `tl.fromTo("#sc-title .t-logo", {scale:0.6, opacity:0}, {scale:1, opacity:1, duration:0.7, ease:"back.out(1.6)"}, ${f(S + 0.2)});`,
    `tl.fromTo("#sc-title .t-presents", {opacity:0}, {opacity:1, duration:0.6}, ${f(S + 0.8)});`,
    `tl.fromTo("#sc-title .t-title", {opacity:0, y:30}, {opacity:1, y:0, duration:0.8, ease:"power2.out"}, ${f(S + 1.4)});`,
    `tl.fromTo("#sc-title .t-sub", {opacity:0}, {opacity:1, duration:0.6}, ${f(S + 2.6)});`,
    `tl.to("#sc-title", {opacity:0, duration:0.7}, ${f(E - 0.7)});`,
  ].join("\n");
  if (s.id === "credits") return [
    `tl.fromTo("#sc-credits .credits", {opacity:0, y:40}, {opacity:1, y:0, duration:1}, ${f(S + 0.3)});`,
    `tl.to("#sc-credits", {opacity:0, duration:1}, ${f(E - 1)});`,
  ].join("\n");
  const A = Object.fromEntries(s.cast.map(([id]) => [id, actor(s.id, id)]));
  const out = [`tl.fromTo("#sc-${s.id} .stage", {opacity:0}, {opacity:1, duration:0.6}, ${f(S)});`, `tl.to("#sc-${s.id} .stage", {opacity:0, duration:0.5}, ${f(E - 0.5)});`];
  for (const b of s.beats) {
    if (b.say && A[vo[b.say].speaker]) out.push(A[vo[b.say].speaker].talk(b.at, b.len));
    if (b.act) out.push(...b.act(b.at, A));
  }
  for (const [id] of s.cast) out.push(A[id].blinks(S + 1, E - 0.6));
  return out.join("\n      ");
};

const css = readFileSync("scenes.css", "utf8");
const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Dexty Stories · The Little Things That Make a Family</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>${css}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
      ${scenes.map(sceneHtml).join("\n      ")}
      ${audioHtml}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${scenes.map(anim).join("\n")}
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync("index.html", html);
console.log(`total ${TOTAL.toFixed(1)}s · ${scenes.length} scenes · ${voClips.length} lines · ${sfx.length} sfx`);
