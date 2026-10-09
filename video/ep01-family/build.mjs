// Builds index.html + timeline.json for "The Little Things That Make a Family"
// (Episode 1 film, 2D pilot): six acted scenes from David's screenplay, title
// and closing credits, four recorded voices, music bed. Timing follows the
// recorded dialogue (assets/vo/*.mp3). Standalone cut: no game overlays.
//   node build.mjs → python3 ../../tools/make_bed.py video/ep01-family
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { character, actor } from "./puppet.mjs";

const { lines } = JSON.parse(readFileSync("vo-lines.json", "utf8"));
const dur = (path) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString());
const vo = Object.fromEntries(lines.map((l) => [l.id, { ...l, len: dur(`assets/vo/${l.id}.mp3`) }]));
const f = (n) => Number(n).toFixed(2);

// ---------------------------------------------------------------- backgrounds (generated storybook art) + vector props
const BG = (name) => `<image href="assets/art/${name}.png" x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice"/>`;
// Props sit on the painted table at the right of the morning kitchen.
const TABLE_PROPS = `
  <g class="prop-paper"></g>
  <g class="prop-glass" style="transform-box: fill-box; transform-origin: 50% 100%;"><rect x="1600" y="566" width="50" height="74" rx="8" fill="#bfe6ff" stroke="#3a2412" stroke-width="4"/><rect x="1605" y="596" width="40" height="38" fill="#4fc3ff"/></g>
  <ellipse class="prop-puddle" cx="1440" cy="640" rx="0" ry="0" fill="#4fc3ff" opacity=".7"/>`;
const KITCHEN = (light = "morning") => (light === "afternoon" ? BG("kitchen-afternoon") : BG("kitchen-morning") + TABLE_PROPS);
const LIVING = BG("living-room-evening");
const DRAWING = (bigEars = false, heart = false, names = false, cls = "drawing") => `<g class="${cls}"><image href="assets/art/${bigEars ? "drawing-bigears" : "drawing-family"}.png" x="620" y="150" width="680" height="510" preserveAspectRatio="xMidYMid meet"/></g>`;
const CARD = `<g class="card-prop"><rect x="800" y="300" width="340" height="240" rx="16" fill="#fff" stroke="#3a2412" stroke-width="6"/><text x="970" y="390" text-anchor="middle" font-size="40" font-family="Fredoka" font-weight="700" fill="#b8126a">WE LOVE</text><text x="970" y="445" text-anchor="middle" font-size="40" font-family="Fredoka" font-weight="700" fill="#b8126a">OUR FAMILY!</text><path d="M970 486 c-12 -26 -50 -8 -42 20 c8 20 42 36 42 36 c0 0 34 -16 42 -36 c8 -28 -30 -46 -42 -20Z" fill="#ff3fa4"/></g>`;
const BAGS = `<g class="bags"><rect class="small-bag" x="150" y="880" width="80" height="100" rx="14" fill="#3ee07a" stroke="#3a2412" stroke-width="6"/></g>`;
const TEDDY = "";
const TOWEL = "";

// ---------------------------------------------------------------- scenes: cast + beats
// A beat is a spoken line ({say}) or a pause ({wait}); `act(t)` adds GSAP lines at the beat's start.
const SCENES = [
  { id: "title", kind: "card", length: 6 },
  {
    id: "s1", bg: KITCHEN("morning"), mood: "play",
    cast: [["mom", { x: 360, y: 1040, height: 760, mood: "happy", flip: true }], ["dad", { x: 1580, y: 1040, height: 800, mood: "happy", flip: true }], ["emma", { x: 1120, y: 1050, height: 600, mood: "neutral" }], ["leo", { x: -200, y: 1055, height: 470, mood: "big", pose: "happy" }]],
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
    cast: [["mom", { x: 360, y: 1040, height: 760, mood: "neutral", flip: true }], ["emma", { x: 1120, y: 1050, height: 600, mood: "neutral" }], ["leo", { x: 860, y: 1055, height: 470, mood: "neutral" }]],
    beats: [
      { wait: 1.4, act: (t, A) => [A.leo.look(6, 0, t), A.leo.arm("l", -70, t + 0.4, 0.8), `tl.to("#sc-s2 .prop-glass", {rotation:80, x:-90, duration:0.5, ease:"power2.in"}, ${f(t + 1.0)});`, `tl.to("#sc-s2 .prop-puddle", {attr:{rx:240, ry:34}, duration:0.6, ease:"power2.out"}, ${f(t + 1.3)});`, `tl.to("#sc-s2 .prop-paper", {opacity:0.5, fill:"#bfe6ff", duration:0.5}, ${f(t + 1.4)});`] },
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
    cast: [["emma", { x: 1120, y: 1050, height: 600, mood: "neutral" }], ["leo", { x: 760, y: 1055, height: 470, mood: "sad", pose: "sad" }]],
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
    id: "s4", bg: BG("kitchen-morning") + DRAWING(true), mood: "play",
    cast: [["emma", { x: 380, y: 1070, height: 680, mood: "happy" }], ["leo", { x: 1540, y: 1070, height: 560, mood: "big", flip: true, pose: "happy" }], ["dad", { x: 1820, y: 1040, height: 760, mood: "happy", flip: true }], ["mom", { x: 120, y: 1040, height: 720, mood: "happy" }]],
    beats: [
      { wait: 1.6, act: (t, A) => [`tl.fromTo("#sc-s4 .drawing", {scale:0.6, opacity:0, svgOrigin:"960 405"}, {scale:1, opacity:1, duration:0.8, ease:"back.out(1.6)"}, ${f(t)});`, A.leo.arm("r", -60, t), `tl.set("#sc-s4 .ch-pos-dad, #sc-s4 .ch-pos-mom", {opacity:0}, 0);`] },
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
      { wait: 1.6, act: (t, A) => [`tl.to("#sc-s4 .drawing-2", {scale:1.06, svgOrigin:"960 405", duration:0.8, yoyo:true, repeat:1}, ${f(t)});`] },
    ],
  },
  {
    id: "s5", bg: KITCHEN("afternoon") + BAGS, mood: "warm",
    cast: [["dad", { x: 1400, y: 1040, height: 800, mood: "neutral", flip: true }], ["emma", { x: 960, y: 1050, height: 600, mood: "happy" }], ["mom", { x: 1250, y: 1040, height: 760, mood: "happy", flip: true }], ["leo", { x: 640, y: 1055, height: 470, mood: "happy" }]],
    beats: [
      { wait: 1.2, act: (t, A) => [A.dad.arm("l", 40, t), A.dad.arm("r", -40, t), A.emma.move(420, t, 1.0), A.emma.walk(t, 1.0), A.emma.arm("l", -80, t + 1.0), `tl.to("#sc-s5 .small-bag", {x:880, y:-200, duration:0.8, ease:"power1.inOut"}, ${f(t + 1.2)});`] },
      { say: "s5-dad-1", act: (t, A) => [A.dad.head(6, t), A.dad.mouth("happy", t), A.emma.hop(t + 1, 20)] },
      { wait: 0.6, act: (t, A) => [A.leo.move(1120, t, 0.8), A.leo.walk(t, 0.8), A.leo.arm("l", -70, t + 0.8), `tl.fromTo("#sc-s5 .napkins rect", {opacity:0, y:-30}, {opacity:1, y:0, duration:0.3, stagger:0.25}, ${f(t + 1.0)});`] },
      { say: "s5-mom-1", act: (t, A) => [A.mom.head(-6, t), A.mom.arm("l", 40, t), A.leo.mouth("big", t + 0.5), A.leo.hop(t + 0.6, 30)] },
      { say: "s5-emma-1", act: (t, A) => [A.emma.move(820, t - 0.5, 0.8), A.emma.walk(t - 0.5, 0.8), A.emma.head(8, t), A.emma.arm("r", -60, t), A.leo.look(6, 0, t)] },
      { wait: 1.2, act: (t, A) => [`tl.fromTo("#sc-s5 .card-prop", {opacity:0, scale:0.4, svgOrigin:"970 500"}, {opacity:1, scale:1, duration:0.6, ease:"back.out(1.6)"}, ${f(t)});`, A.dad.move(1300, t + 0.2, 1.0), A.dad.walk(t + 0.2, 1.0), A.mom.move(1100, t + 0.2, 1.0), A.mom.walk(t + 0.2, 1.0), A.dad.kneel(t + 1.3), A.mom.mouth("big", t + 1.3), A.mom.arm("l", 100, t + 1.3)] },
      { say: "s5-dad-2", act: (t, A) => [A.dad.head(-6, t), A.dad.arm("l", 50, t)] },
      { say: "s5-leo-1", act: (t, A) => [A.leo.head(-8, t), A.leo.arm("l", -100, t)] },
      { say: "s5-emma-2", act: (t, A) => [A.emma.head(8, t), A.emma.arm("r", -90, t)] },
      { say: "s5-dad-3", act: (t, A) => [A.dad.nod(t), A.dad.arm("l", 110, t + 2.2), A.dad.arm("r", -110, t + 2.2), A.emma.mouth("big", t + 2.6), A.leo.mouth("big", t + 2.6), A.mom.mouth("big", t + 2.6)] },
      { wait: 2.0, act: (t, A) => [`tl.fromTo("#sc-s5 .heart-pop", {opacity:0, y:0, scale:0.5}, {opacity:1, y:-80, scale:1, duration:1.2, stagger:0.2, ease:"power2.out"}, ${f(t)});`] },
    ],
  },
  {
    id: "s6", bg: LIVING, mood: "lullaby",
    cast: [["mom", { x: 560, y: 1000, height: 680, mood: "happy" }], ["emma", { x: 800, y: 1010, height: 540, mood: "happy" }], ["leo", { x: 1110, y: 1015, height: 430, mood: "happy", flip: true }], ["dad", { x: 1380, y: 1000, height: 720, mood: "happy", flip: true }]],
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
    s3: `<g class="fresh-paper" opacity="0"><rect x="1330" y="588" width="230" height="56" rx="8" fill="#fff" stroke="#3a2412" stroke-width="4" transform="skewX(-16)"/></g>`,
    s4: `<g class="drawing-2" opacity="0">${DRAWING(false, true, true, "drawing-inner")}</g><g class="families" opacity="0"><rect x="560" y="120" width="800" height="150" rx="24" fill="#fff" stroke="#3a2412" stroke-width="6"/><text x="960" y="178" text-anchor="middle" font-size="36" font-family="Fredoka" font-weight="700" fill="#3a2412">Families can look different</text><text x="960" y="232" text-anchor="middle" font-size="30" font-family="Fredoka" fill="#6b4a2a">big · small · one parent · two · grandparents · people who care</text></g>`,
    s5: `<g class="napkins"><rect x="1360" y="600" width="60" height="40" rx="6" fill="#fff" stroke="#3a2412" stroke-width="4"/><rect x="1470" y="600" width="60" height="40" rx="6" fill="#fff" stroke="#3a2412" stroke-width="4"/><rect x="1580" y="600" width="60" height="40" rx="6" fill="#fff" stroke="#3a2412" stroke-width="4"/></g>${CARD.replace('class="card-prop"', 'class="card-prop" opacity="0"')}`,
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
  const A = Object.fromEntries(s.cast.map(([id, opts]) => [id, actor(s.id, id, opts.height)]));
  const out = [`tl.fromTo("#sc-${s.id} .stage", {opacity:0}, {opacity:1, duration:0.6}, ${f(S)});`, `tl.to("#sc-${s.id} .stage", {opacity:0, duration:0.5}, ${f(E - 0.5)});`];
  for (const b of s.beats) {
    if (b.say && A[vo[b.say].speaker]) out.push(A[vo[b.say].speaker].talk(b.at, b.len));
    if (b.act) out.push(...b.act(b.at, A).filter(Boolean));
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
