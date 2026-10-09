// Builds index.html + timeline.json for Episode 1 (Kids): "How to play Dexty",
// shown on the real app. The phone recording (assets/cap/take.mp4, marks in
// assets/cap/marks.json) is trimmed per step to Dexter's narration; Dexter
// stands beside the phone and points. Opens on the payoff (name + card).
//   node capture.mjs → (ffmpeg webm→mp4) → node build.mjs → python3 ../../tools/make_bed.py video/ep01-kids-demo
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { DAXTER_SVG } from "../../website/js/ui/character.js";
import { rig } from "../ep01-kids/choreography.mjs";

const lines = JSON.parse(readFileSync("vo-lines.json", "utf8")).lines;
const marks = JSON.parse(readFileSync("assets/cap/marks.json", "utf8"));
const dur = (path) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString());
const vo = Object.fromEntries(lines.map((l) => [l.id, { text: l.text, len: dur(`assets/vo/${l.id}.mp3`) }]));
const TAKE = "assets/cap/take.mp4";
const TAKE_LEN = dur(TAKE);

const plain = (t) => t.replace(/<[^>]+>/g, "");
function indexInRaw(raw, n) {
  let i = 0, seen = 0;
  while (i < raw.length && seen < n) {
    if (raw[i] === "<") i = raw.indexOf(">", i) + 1;
    else { i += 1; seen += 1; }
  }
  return i;
}
const pauses = (s) => [...s.matchAll(/<break time="([\d.]+)s"/g)].reduce((n, m) => n + Number(m[1]), 0);
const cue = (id, phrase) => {
  const raw = vo[id].text;
  const at = plain(raw).indexOf(phrase);
  if (at < 0) throw new Error(`cue "${phrase}" not in ${id}`);
  const speech = Math.max(1, vo[id].len - pauses(raw));
  return (at / plain(raw).length) * speech + pauses(raw.slice(0, indexInRaw(raw, at)));
};

// ---------------------------------------------------------------- timeline
// Each step: narration + a beat; the phone shows the take from `from` (seconds into the take).
const STEPS = [
  { id: "hook", label: "", from: marks.card + 1.2, lead: 0.4, tail: 0.8 },
  { id: "open", label: "1 · Open dexty.live", from: marks.open, lead: 0.4, tail: 0.6 },
  { id: "road", label: "2 · Walk to a house", from: marks.road, lead: 0.4, tail: 0.6 },
  { id: "book", label: "3 · Read or listen", from: marks.book, lead: 0.4, tail: 0.6 },
  { id: "quiz", label: "4 · Hoot's questions", from: marks.quiz, lead: 0.4, tail: 0.6 },
  { id: "card", label: "5 · Your card", from: marks.card, lead: 0.4, tail: 0.6 },
  { id: "mission", label: "+ Mission", from: marks.mission, lead: 0.4, tail: 0.6 },
  { id: "bye", label: "dexty.live", from: marks.bye, lead: 0.3, tail: 1.2 },
];
let t = 0;
const scenes = [];
for (const step of STEPS) {
  const length = +(step.lead + vo[step.id].len + step.tail).toFixed(3);
  const available = Math.max(0.5, TAKE_LEN - step.from);
  // Slow the take down when a step's recording is shorter than its narration.
  const rate = Math.min(1, +(available / length).toFixed(3));
  scenes.push({ ...step, kind: "scene", start: +t.toFixed(3), length, voAt: step.lead, rate });
  t += length;
}
scenes.push({ id: "closing", kind: "scene", start: +t.toFixed(3), length: 4 });
t += 4;
const TOTAL = +t.toFixed(3);
const at = (id) => scenes.find((s) => s.id === id);
const g = (id, phrase) => +(at(id).start + at(id).voAt + cue(id, phrase)).toFixed(2);

const sfx = [
  ["chime", g("hook", "Hi, Maya")], ["card", g("hook", "your very first card")],
  ["pop", g("open", "Step one")], ["tap", g("open", "Tap Kids")], ["tap", g("open", "tap Start")],
  ["pop", g("road", "Step two")], ["tap", g("road", "tap Go in")],
  ["pop", g("book", "Step three")], ["ding", g("book", "a spark tells you")],
  ["pop", g("quiz", "Step four")], ["hoot", g("quiz", "Professor Hoot")],
  ["pop", g("card", "Step five")], ["card", g("card", "Whoa!")],
  ["pop", g("mission", "And one more thing")], ["chime", g("mission", "you choose a new coat")],
  ["victory", g("bye", "That's it")], ["fanfare", at("closing").start + 0.2],
];
const voClips = scenes.filter((s) => s.voAt !== undefined).map((s) => ({ id: s.id, start: +(s.start + s.voAt).toFixed(3), len: vo[s.id].len }));
writeFileSync("timeline.json", JSON.stringify({ total: TOTAL, scenes, vo: voClips, sfx, moods: Object.fromEntries(scenes.map((s) => [s.id, s.id === "hook" || s.id === "bye" || s.id === "closing" ? "victory" : "play"])) }, null, 2));

// ---------------------------------------------------------------- markup
const daxter = (cls) => {
  const svg = DAXTER_SVG.replace(/id="(daxter\w+)"/g, `id="$1-${cls}"`).replace(/url\(#(daxter\w+)\)/g, `url(#$1-${cls})`);
  return `<div class="dax ${cls}">${svg}</div>`;
};
const phone = (s) => `
  <div class="phone">
    <video id="take-${s.id}" class="take" src="${TAKE}" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-media-start="${s.from.toFixed(2)}" data-playback-rate="${s.rate}" data-track-index="1" muted playsinline></video>
    <div class="notch"></div>
  </div>`;
const body = (s) => s.id === "closing"
  ? `<div class="closing-logo"><img src="assets/logo.png" alt="" /></div><div class="closing-title">dexty.live</div><div class="closing-sub">Free · no account · stop whenever you like</div>`
  : `${phone(s)}${daxter(`dax-${s.id}`)}<div class="step-label">${s.label}</div>${s.id === "hook" ? `<div class="hook-title">Dexty<small>Stories you can play</small></div>` : ""}`;
const sceneHtml = (s) => `<section id="sc-${s.id}" class="clip scene" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-track-index="0">${body(s)}</section>`;
const audioHtml = [
  `<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="5" data-volume="0.45"></audio>`,
  ...voClips.map((v) => `<audio id="vo-${v.id}" src="assets/vo/${v.id}.mp3" data-start="${v.start}" data-duration="${v.len.toFixed(3)}" data-track-index="6" data-volume="1"></audio>`),
].join("\n      ");

// ---------------------------------------------------------------- animation
const anim = (s) => {
  const S = s.start, E = s.start + s.length;
  if (s.id === "closing") return [
    `tl.fromTo("#sc-closing .closing-logo", {scale:0.6, opacity:0}, {scale:1, opacity:1, duration:0.6, ease:"back.out(1.6)"}, ${S + 0.1});`,
    `tl.fromTo("#sc-closing .closing-title", {opacity:0, y:30}, {opacity:1, y:0, duration:0.5}, ${S + 0.5});`,
    `tl.fromTo("#sc-closing .closing-sub", {opacity:0}, {opacity:1, duration:0.5}, ${S + 1.1});`,
    `tl.to("#sc-closing", {opacity:0, duration:0.6}, ${E - 0.6});`,
  ].join("\n");
  const L = (phrase) => g(s.id, phrase);
  const D = rig(`#sc-${s.id} .dax-${s.id}`);
  const base = [
    `tl.fromTo("#sc-${s.id} .phone", {y:60, opacity:0}, {y:0, opacity:1, duration:0.5, ease:"power2.out"}, ${S});`,
    `tl.fromTo("#sc-${s.id} .dax-${s.id}", {x:-300, opacity:0}, {x:0, opacity:1, duration:0.5, ease:"power3.out"}, ${S});`,
    `tl.fromTo("#sc-${s.id} .step-label", {opacity:0, y:20}, {opacity:1, y:0, duration:0.4}, ${S + 0.3});`,
    D.mouth(S + s.voAt, vo[s.id].len), ...D.blinks(S + 0.8, E - 0.4),
  ];
  const per = {
    hook: () => [ ...D.wave(L("Hi, Maya"), 3), D.glow(1.3, L("That's me")), D.glow(1, L("That's me") + 0.8), D.pointAt(L("And that"), -60), D.jump(L("your very first card"), 90), ...D.rest(L("Want one?")), D.brows(-6, L("Want one?")), D.pointAt(L("Here's how"), -95),
      `tl.fromTo("#sc-hook .hook-title", {opacity:0, x:40}, {opacity:1, x:0, duration:0.6}, ${L("Here's how").toFixed(2)});` ],
    open: () => [ D.pointAt(L("open dexty dot live"), -70), D.pointAt(L("Tap Kids"), -55), D.look(5, 3, L("Tap Kids")), ...D.chin(L("Type the name")), ...D.rest(L("Then tap Start")), D.pointAt(L("Then tap Start"), -40), D.jump(L("Start the adventure"), 70) ],
    road: () => [ D.pointAt(L("This is the Road"), -80), ...D.shrug(L("Every house hides")), D.pointAt(L("Tap the arrows"), -30), D.nod(L("tap Go in")), D.pointAt(L("tap Go in"), -45) ],
    book: () => [ D.pointAt(L("The book reads itself"), -70), D.look(5, 2, L("See the glowing words")), D.pointAt(L("Tap one"), -50), D.glow(1.4, L("a spark tells you")), D.glow(1, L("a spark tells you") + 0.9), ...D.chin(L("I guess wrong sometimes")), D.headShake(L("I guess wrong sometimes"), 2, 6), ...D.rest(L("See if you can beat me")), D.pointAt(L("See if you can beat me"), -95) ],
    quiz: () => [ D.pointAt(L("Professor Hoot"), -70), ...D.shrug(L("if you're not sure")), ...D.rest(L("Nobody keeps score")), D.nod(L("Nobody keeps score")) ],
    card: () => [ D.pointAt(L("Tap Reveal"), -55), D.jump(L("Whoa!"), 110, 360), D.glow(1.5, L("Whoa!")), D.glow(1, L("Whoa!") + 1), D.pointAt(L("It lives in your backpack"), -150) ],
    mission: () => [ D.pointAt(L("Tap Mission"), -60), ...D.chin(L("You move the lamp")), ...D.rest(L("the shadow moves")), D.pointAt(L("the shadow moves"), -60), D.jump(L("a new coat for me"), 90), D.glow(1.3, L("a new coat for me")), D.glow(1, L("a new coat for me") + 0.9), ...D.wave(L("I'll wear it on the road"), 2, D.FRONT_ARM, -120) ],
    bye: () => [ D.nod(L("That's it")), D.pointAt(L("dexty dot live"), -95), ...D.shrug(L("you just stop")), ...D.rest(L("The road keeps your place")), ...D.wave(L("See you at the first house"), 4) ],
  };
  return [...base, ...(per[s.id]?.() ?? [])].join("\n      ");
};

const css = readFileSync("scenes.css", "utf8");
const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Did You Know That? · Ep 1 Kids · How to play Dexty</title>
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
console.log(`total ${TOTAL.toFixed(1)}s · ${scenes.length} scenes · take ${TAKE_LEN.toFixed(1)}s · rates ${scenes.filter((s) => s.rate).map((s) => s.id + ":" + s.rate).join(" ")}`);
