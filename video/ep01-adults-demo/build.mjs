// Builds index.html + timeline.json for Episode 1 (Adults): "The Curiosity
// Archive, in two minutes", shown on the real site (assets/cap/take.mp4 with
// marks.json). Documentary register: near-black, gold accent, the phone on
// the right, one line of type on the left per step. Dexter appears only at
// the end as the host mark.
//   node capture.mjs → (ffmpeg webm→mp4) → node build.mjs → python3 ../../tools/make_bed.py video/ep01-adults-demo
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { DAXTER_SVG } from "../../website/js/ui/character.js";

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
const STEPS = [
  { id: "hook", line: "The most confident students<br/>remembered the least.", sub: "Roediger & Karpicke, 2006", from: marks.predict + 4.5 },
  { id: "open", line: "dexty.live<br/>Teens &amp; Adults", sub: "No account. No sign-up.", from: marks.open },
  { id: "question", line: "One question.<br/>One story.", sub: "Three paragraphs, no fluff.", from: marks.question },
  { id: "predict", line: "Predict first.", sub: "Then the real numbers, and the reasoning.", from: marks.predict },
  { id: "dossier", line: "Measured.<br/>Interpretation.<br/>Limit.", sub: "Every line tagged, with the page number.", from: marks.dossier },
  { id: "keep", line: "Keep it.<br/>Write a takeaway.", sub: "Stays on your device. Nobody else sees it.", from: marks.keep },
  { id: "bye", line: "The Curiosity Archive", sub: "dexty.live", from: marks.bye },
];
let t = 0;
const scenes = [];
for (const step of STEPS) {
  const length = +(0.4 + vo[step.id].len + 0.8).toFixed(3);
  const available = Math.max(0.5, TAKE_LEN - step.from);
  const rate = Math.min(1, +(available / length).toFixed(3));
  scenes.push({ ...step, kind: "scene", start: +t.toFixed(3), length, voAt: 0.4, rate });
  t += length;
}
scenes.push({ id: "closing", kind: "scene", start: +t.toFixed(3), length: 4 });
t += 4;
const TOTAL = +t.toFixed(3);
const at = (id) => scenes.find((s) => s.id === id);
const g = (id, phrase) => +(at(id).start + at(id).voAt + cue(id, phrase)).toFixed(2);

const sfx = [
  ["low", g("hook", "remembered the least")], ["sting", g("hook", "Curiosity Archive")],
  ["page", g("open", "Open dexty")], ["tick", g("open", "editor's pick")],
  ["page", g("question", "Every case file")], ["tick", g("question", "Then a short story")],
  ["tick", g("predict", "Pick one")], ["chime", g("predict", "the real numbers")],
  ["tick", g("dossier", "measured")], ["tick", g("dossier", "interpretation")], ["tick", g("dossier", "or limit")],
  ["chime", g("keep", "save it")], ["page", g("keep", "private takeaway")],
  ["sting", g("bye", "Now you do")], ["sting", at("closing").start + 0.3],
];
const voClips = scenes.filter((s) => s.voAt !== undefined).map((s) => ({ id: s.id, start: +(s.start + s.voAt).toFixed(3), len: vo[s.id].len }));
writeFileSync("timeline.json", JSON.stringify({ total: TOTAL, scenes, vo: voClips, sfx, moods: Object.fromEntries(scenes.map((s) => [s.id, s.id === "hook" ? "tension" : s.id === "bye" || s.id === "closing" ? "resolve" : "documentary"])) }, null, 2));

// ---------------------------------------------------------------- markup
const phone = (s) => `
  <div class="phone">
    <video id="take-${s.id}" class="take" src="${TAKE}" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-media-start="${s.from.toFixed(2)}" data-playback-rate="${s.rate}" data-track-index="1" muted playsinline></video>
    <div class="notch"></div>
  </div>`;
const body = (s) => s.id === "closing"
  ? `<div class="closing-logo"><img src="assets/logo.png" alt="" /></div><p class="closing-title">Did You Know That?</p><p class="closing-sub">Discover the story behind the surprise.</p>`
  : `${phone(s)}<div class="copy"><p class="line">${s.line}</p><p class="sub">${s.sub}</p></div>${s.id === "bye" ? `<div class="host">${DAXTER_SVG}</div>` : ""}`;
const sceneHtml = (s) => `<section id="sc-${s.id}" class="clip scene" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-track-index="0">${body(s)}</section>`;
const audioHtml = [
  `<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="5" data-volume="0.4"></audio>`,
  ...voClips.map((v) => `<audio id="vo-${v.id}" src="assets/vo/${v.id}.mp3" data-start="${v.start}" data-duration="${v.len.toFixed(3)}" data-track-index="6" data-volume="1"></audio>`),
].join("\n      ");

// ---------------------------------------------------------------- animation
const anim = (s) => {
  const S = s.start, E = s.start + s.length;
  if (s.id === "closing") return [
    `tl.fromTo("#sc-closing .closing-logo", {scale:0.7, opacity:0}, {scale:1, opacity:1, duration:0.7, ease:"power2.out"}, ${S + 0.1});`,
    `tl.fromTo("#sc-closing .closing-title", {opacity:0, y:24}, {opacity:1, y:0, duration:0.6}, ${S + 0.6});`,
    `tl.fromTo("#sc-closing .closing-sub", {opacity:0}, {opacity:1, duration:0.6}, ${S + 1.3});`,
    `tl.to("#sc-closing", {opacity:0, duration:0.8}, ${E - 0.8});`,
  ].join("\n");
  const out = [
    `tl.fromTo("#sc-${s.id} .phone", {y:40, opacity:0}, {y:0, opacity:1, duration:0.7, ease:"power2.out"}, ${S});`,
    `tl.fromTo("#sc-${s.id} .line", {opacity:0, y:24}, {opacity:1, y:0, duration:0.7, ease:"power2.out"}, ${S + 0.3});`,
    `tl.fromTo("#sc-${s.id} .sub", {opacity:0}, {opacity:1, duration:0.6}, ${S + 1.2});`,
  ];
  if (s.id === "bye") {
    const L = (p) => g("bye", p);
    out.push(`tl.fromTo("#sc-bye .host", {opacity:0, y:40}, {opacity:1, y:0, duration:0.5, ease:"back.out(1.6)"}, ${L("Did you know that?").toFixed(2)});`);
    out.push(`tl.to("#sc-bye .host .daxter-head", {y:6, duration:0.18, yoyo:true, repeat:3, ease:"sine.inOut"}, ${L("Now you do").toFixed(2)});`);
    out.push(`tl.to("#sc-bye .host .daxter-halo", {scale:1.3, svgOrigin:"80 58", duration:0.4}, ${L("Now you do").toFixed(2)});`);
  }
  return out.join("\n      ");
};

const css = readFileSync("scenes.css", "utf8");
const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Did You Know That? · Ep 1 Adults · The Curiosity Archive</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Fredoka:wght@500;600&display=swap" rel="stylesheet" />
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
