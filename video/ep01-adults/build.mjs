// Builds index.html + timeline.json for Episode 1 (Adults), revision 3:
// "The Re-Reading Trap" (episodes/adults-001-golden-minutes/script.md).
// Documentary register: near-black, one gold accent, original charts and
// typography; Dexter appears once as a small host mark. Every number on
// screen traces to claims-retrieval.md (R-numbers in comments).
//   node build.mjs   (then: python3 ../../tools/make_bed.py video/ep01-adults)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { DAXTER_SVG } from "../../website/js/ui/character.js";

const lines = JSON.parse(readFileSync("vo-lines.json", "utf8")).lines;
const dur = (path) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString());
const vo = Object.fromEntries(lines.map((l) => [l.id, { text: l.text, len: dur(`assets/vo/${l.id}.mp3`) }]));

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

const TITLE = 4.5;
const CLOSING = 5;

// ---------------------------------------------------------------- timeline
let t = 0;
const scenes = [];
const add = (scene) => {
  scenes.push({ ...scene, start: +t.toFixed(3) });
  t += scene.length;
};
add({ id: "title", kind: "scene", length: TITLE });
const sc = (id, lead, tail) => add({ id, kind: "scene", length: +(lead + vo[id].len + tail).toFixed(3), voAt: lead });
sc("case", 0.6, 0.8);
sc("puzzle", 0.4, 0.8);
sc("flip", 0.4, 1.0);
sc("twist", 0.4, 1.4);
sc("mechanism", 0.4, 0.8);
sc("limits", 0.4, 0.8);
sc("method", 0.4, 1.0);
sc("keep", 0.3, 1.2);
add({ id: "closing", kind: "scene", length: CLOSING });
const TOTAL = +t.toFixed(3);
const at = (id) => scenes.find((s) => s.id === id);
const g = (id, phrase) => +(at(id).start + at(id).voAt + cue(id, phrase)).toFixed(2);

const sfx = [
  ["sting", 0.2],
  ["page", g("case", "Read one of them twice")], ["page", g("case", "Read one of them twice") + 1.2], ["page", g("case", "Read the other once")],
  ["tick", g("puzzle", "eighty-one percent")], ["tick", g("puzzle", "against seventy-five")], ["low", g("puzzle", "keep testing")],
  ["tick", g("flip", "fifty-six percent")], ["tick", g("flip", "forty-two")], ["tick", g("flip", "eighty-three")], ["tick", g("flip", "seventy-one")],
  ["chime", g("flip", "sixty-one percent")], ["tick", g("flip", "forty for the group")],
  ["low", g("twist", "uneasy")], ["tick", g("twist", "most confident")], ["sad", g("twist", "They remembered the least")], ["sting", g("twist", "That feeling is the trap")],
  ["page", g("mechanism", "pulling an idea")], ["chime", g("mechanism", "desirable difficulty")],
  ["tick", g("limits", "one university")], ["tick", g("limits", "young students")], ["tick", g("limits", "two short passages")], ["tick", g("limits", "one-week delay")],
  ["chime", g("limits", "pooled")],
  ["page", g("method", "Close the book")], ["tick", g("method", "check what you missed")], ["sting", g("method", "Now you do")],
  ["card", g("keep", "dexty dot live")], ["sting", at("closing").start + 0.3],
];
const voClips = scenes.filter((s) => s.voAt !== undefined).map((s) => ({ id: s.id, start: +(s.start + s.voAt).toFixed(3), len: vo[s.id].len }));
writeFileSync("timeline.json", JSON.stringify({ total: TOTAL, scenes, vo: voClips, sfx, moods: {
  title: "documentary", case: "documentary", puzzle: "documentary", flip: "tension", twist: "tension", mechanism: "documentary", limits: "documentary", method: "resolve", keep: "resolve", closing: "resolve" } }, null, 2));

// ---------------------------------------------------------------- markup
const bar = (cls, label, value, max = 100, unit = "%") => `<div class="bar ${cls}"><span class="bar-label">${label}</span><span class="bar-track"><i class="bar-fill" style="--v:${value / max}"></i></span><b class="bar-value">${value}${unit}</b></div>`;
const chart = (cls, title, rows) => `<div class="chart ${cls}"><h3>${title}</h3>${rows.map((r) => bar(...r)).join("")}</div>`;
const caption = (text) => `<p class="caption">${text}</p>`;

const BODY = {
  title: () => `
    <p class="kicker">Did You Know That? · Case file 001</p>
    <h1 class="title">The Re-Reading Trap</h1>
    <p class="dek">Why does the study method that feels best lose to the one that feels worse?</p>`,
  case: () => `
    <div class="sheets"><div class="sheet s1"><b>The Sun</b><i></i><i></i><i></i><i></i></div><div class="sheet s2"><b>Sea Otters</b><i></i><i></i><i></i><i></i></div></div>
    <p class="fact fact-case">2006 · Washington University in St. Louis · 120 students</p>
    <div class="conditions"><div class="cond c1"><span>Read twice</span></div><div class="cond c2"><span>Read once → recall</span></div></div>
    ${caption("Roediger & Karpicke (2006), Experiment 1")}`,
  puzzle: () => `
    ${chart("ch-5min", "Recalled after 5 minutes", [["b1", "Read twice", 81], ["b2", "Read once, recalled", 75]])}
    <p class="names">Henry Roediger &amp; Jeffrey Karpicke</p>
    ${caption("Mean % of idea units recalled · Exp. 1 · R1d, R1e")}`,
  flip: () => `
    ${chart("ch-week1", "After one week (Exp. 1)", [["b1", "Read twice", 42], ["b2", "Read once, recalled", 56]])}
    ${chart("ch-exp2", "Experiment 2 · 180 students", [["b1", "Read 4×", 83], ["b2", "Read 1×, recalled 3×", 71]])}
    <div class="readings"><div><b class="n14">14.2</b><span>times read</span></div><div><b class="n3">3.4</b><span>times read</span></div></div>
    ${caption("Mean % of idea units recalled · R1g, R2c, R2d, R2e")}`,
  twist: () => `
    <div class="twin">
      ${chart("ch-conf", "Predicted memory (1–7)", [["b1", "Read 4×", 4.8, 7, ""], ["b3", "Read 3×, recalled 1×", 4.2, 7, ""], ["b2", "Read 1×, recalled 3×", 4.0, 7, ""]])}
      ${chart("ch-real", "Actual recall, 1 week", [["b1", "Read 4×", 40], ["b3", "Read 3×, recalled 1×", 56], ["b2", "Read 1×, recalled 3×", 61]])}
    </div>
    <p class="trap"><span>Re-reading feels like learning.</span><span>That feeling is the trap.</span></p>
    ${caption("Group means · R3")}`,
  mechanism: () => `
    <div class="memory">
      <div class="mem-box"><span>memory</span><i class="idea"></i></div>
      <div class="mem-path path-reread"><b>re-read</b><span>see it again</span></div>
      <div class="mem-path path-recall"><b>recall</b><span>pull it out</span></div>
    </div>
    <p class="label-interp"><span class="tag">Interpretation</span>the authors' explanation, not a measured mechanism</p>
    <p class="dd">“desirable difficulty”</p>
    ${caption("R4a, R4b")}`,
  limits: () => `
    <div class="chips"><span class="chip">1 university</span><span class="chip">undergraduates 18–24</span><span class="chip">2 short passages</span><span class="chip">≤ 1 week</span></div>
    <div class="forest">
      <div class="axis"><i></i><span>0</span></div>
      ${Array.from({ length: 40 }, (_, i) => `<i class="dot ${i % 5 === 0 ? "neg" : ""}" style="--x:${i % 5 === 0 ? -(8 + (i * 7) % 20) : 6 + (i * 13) % 58}%;--y:${(i * 37) % 100}%"></i>`).join("")}
      <p class="forest-label">159 comparisons · 61 studies · average effect favours testing · about 1 in 5 favours re-study</p>
    </div>
    <div class="moderators"><span>+ feedback</span><span>+ longer delays</span><span class="off">no feedback &amp; ≤ 50% recalled → no benefit</span></div>
    ${caption("Rowland (2014), Psychological Bulletin · R4c, R5a–R5d, R5f")}`,
  method: () => `
    <div class="steps">
      <div class="step st0"><span>1</span><b>Close the book</b></div>
      <div class="step st1"><span>2</span><b>Try to recall</b></div>
      <div class="step st2"><span>3</span><b>Check what you missed</b></div>
      <div class="step st3"><span>4</span><b>Come back another day</b></div>
    </div>
    <p class="harder">It will feel harder. That is not a sign it isn't working.</p>
    <div class="host">${DAXTER_SVG}</div>
    <p class="close-line">Did you know that? <b>Now you do.</b></p>`,
  keep: () => `
    <div class="card"><small>Case file 001</small><b>Desirable Difficulty</b><p>After a week: 61% recalled vs 40% re-read.</p><span>Sources · Roediger &amp; Karpicke 2006 · Rowland 2014</span></div>
    <p class="url">dexty.live</p>`,
  closing: () => `
    <div class="closing-logo"><img src="assets/logo.png" alt="" /></div>
    <p class="closing-title">Did You Know That?</p>
    <p class="closing-sub">Discover the story behind the surprise.</p>`,
};

const sceneHtml = (s) =>
  `<section id="sc-${s.id}" class="clip scene bg-${s.id}" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-track-index="0">${BODY[s.id](s)}</section>`;
const audioHtml = [
  `<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="5" data-volume="0.5"></audio>`,
  ...voClips.map((v) => `<audio id="vo-${v.id}" src="assets/vo/${v.id}.mp3" data-start="${v.start}" data-duration="${v.len.toFixed(3)}" data-track-index="6" data-volume="1"></audio>`),
].join("\n      ");

// ---------------------------------------------------------------- animation (GSAP, seek-safe)
const reveal = (sel, when, opts = "") => `tl.fromTo("${sel}", {opacity:0, y:24}, {opacity:1, y:0, duration:0.6, ease:"power2.out"${opts}}, ${when.toFixed(2)});`;
const fill = (sel, when, d = 1.2) => `tl.fromTo("${sel} .bar-fill", {scaleX:0}, {scaleX:1, duration:${d}, ease:"power2.out", stagger:0.25}, ${when.toFixed(2)});`;
const anim = (s) => {
  const S = s.start, E = s.start + s.length;
  const L = (phrase) => g(s.id, phrase);
  const per = {
    title: () => [reveal("#sc-title .kicker", S + 0.2), reveal("#sc-title .title", S + 0.6), reveal("#sc-title .dek", S + 1.4), `tl.to("#sc-title", {opacity:0, duration:0.6}, ${E - 0.6});`],
    case: () => [
      `tl.fromTo("#sc-case .sheet.s1", {x:-200, opacity:0, rotation:-4}, {x:0, opacity:1, rotation:-3, duration:0.8, ease:"power2.out"}, ${(L("one about the Sun")).toFixed(2)});`,
      `tl.fromTo("#sc-case .sheet.s2", {x:200, opacity:0, rotation:4}, {x:0, opacity:1, rotation:3, duration:0.8, ease:"power2.out"}, ${(L("one about sea otters")).toFixed(2)});`,
      reveal("#sc-case .fact-case", S + 0.3),
      reveal("#sc-case .cond.c1", L("Read one of them twice")),
      `tl.to("#sc-case .sheet.s1", {y:-10, duration:0.25, yoyo:true, repeat:3}, ${L("Read one of them twice").toFixed(2)});`,
      reveal("#sc-case .cond.c2", L("Read the other once")),
      `tl.to("#sc-case .sheet.s2 i", {backgroundColor:"#d4b06a", duration:0.3, stagger:0.2}, ${L("write down everything").toFixed(2)});`,
      reveal("#sc-case .caption", S + 1),
    ],
    puzzle: () => [
      reveal("#sc-puzzle .chart", L("Five minutes later")),
      `tl.fromTo("#sc-puzzle .b1 .bar-fill", {scaleX:0}, {scaleX:1, duration:1.0, ease:"power2.out"}, ${L("eighty-one percent").toFixed(2)});`,
      `tl.fromTo("#sc-puzzle .b2 .bar-fill", {scaleX:0}, {scaleX:1, duration:1.0, ease:"power2.out"}, ${L("against seventy-five").toFixed(2)});`,
      reveal("#sc-puzzle .names", L("Henry Roediger")),
      reveal("#sc-puzzle .caption", S + 1),
    ],
    flip: () => [
      reveal("#sc-flip .ch-week1", L("A week later")),
      `tl.fromTo("#sc-flip .ch-week1 .b2 .bar-fill", {scaleX:0}, {scaleX:1, duration:1.0, ease:"power2.out"}, ${L("fifty-six percent").toFixed(2)});`,
      `tl.fromTo("#sc-flip .ch-week1 .b1 .bar-fill", {scaleX:0}, {scaleX:1, duration:1.0, ease:"power2.out"}, ${L("forty-two").toFixed(2)});`,
      `tl.to("#sc-flip .ch-week1", {scale:0.62, y:-110, duration:0.8, ease:"power2.inOut"}, ${L("They ran it again").toFixed(2)});`,
      reveal("#sc-flip .ch-exp2", L("They ran it again")),
      `tl.fromTo("#sc-flip .ch-exp2 .b1 .bar-fill", {scaleX:0}, {scaleX:1, duration:1.0, ease:"power2.out"}, ${L("eighty-three").toFixed(2)});`,
      `tl.fromTo("#sc-flip .ch-exp2 .b2 .bar-fill", {scaleX:0}, {scaleX:1, duration:1.0, ease:"power2.out"}, ${L("seventy-one").toFixed(2)});`,
      `tl.to("#sc-flip .ch-exp2 h3", {text:"After one week (Exp. 2)", duration:0.01}, ${L("After a week").toFixed(2)});`,
      `tl.to("#sc-flip .ch-exp2 .b1 .bar-fill", {scaleX:${40 / 83}, duration:1.2, ease:"power2.inOut"}, ${L("After a week").toFixed(2)});`,
      `tl.to("#sc-flip .ch-exp2 .b1 .bar-value", {text:"40%", duration:0.01}, ${(L("After a week") + 1.0).toFixed(2)});`,
      `tl.to("#sc-flip .ch-exp2 .b2 .bar-fill", {scaleX:${61 / 71}, duration:1.2, ease:"power2.inOut"}, ${L("sixty-one percent").toFixed(2)});`,
      `tl.to("#sc-flip .ch-exp2 .b2 .bar-value", {text:"61%", duration:0.01}, ${(L("sixty-one percent") + 0.8).toFixed(2)});`,
      `tl.to("#sc-flip .ch-exp2 .b2", {color:"#d4b06a", duration:0.4}, ${L("sixty-one percent").toFixed(2)});`,
      reveal("#sc-flip .readings", L("fourteen times")),
      `tl.fromTo("#sc-flip .n14", {text:"0"}, {text:"14.2", duration:1.0}, ${L("fourteen times").toFixed(2)});`,
      `tl.fromTo("#sc-flip .n3", {text:"0"}, {text:"3.4", duration:0.6}, ${L("about three").toFixed(2)});`,
      reveal("#sc-flip .caption", S + 1),
    ],
    twist: () => [
      reveal("#sc-twist .ch-conf", L("how well will you remember")),
      fill("#sc-twist .ch-conf", L("The four-times readers")),
      `tl.to("#sc-twist .ch-conf .b1", {color:"#d4b06a", duration:0.4}, ${L("most confident").toFixed(2)});`,
      reveal("#sc-twist .ch-real", L("They remembered the least") - 0.3),
      fill("#sc-twist .ch-real", L("They remembered the least")),
      `tl.to("#sc-twist .ch-real .b1", {color:"#b8b2a7", duration:0.4}, ${(L("They remembered the least") + 0.8).toFixed(2)});`,
      `tl.to("#sc-twist .twin", {opacity:0.18, scale:0.96, duration:0.8}, ${L("Re-reading feels like learning").toFixed(2)});`,
      `tl.fromTo("#sc-twist .trap span:first-child", {opacity:0, y:20}, {opacity:1, y:0, duration:0.6}, ${L("Re-reading feels like learning").toFixed(2)});`,
      `tl.fromTo("#sc-twist .trap span:last-child", {opacity:0, y:20}, {opacity:1, y:0, duration:0.6}, ${L("That feeling is the trap").toFixed(2)});`,
      reveal("#sc-twist .caption", S + 1),
    ],
    mechanism: () => [
      reveal("#sc-mechanism .memory", S + 0.3),
      `tl.fromTo("#sc-mechanism .path-reread", {opacity:0, x:-40}, {opacity:1, x:0, duration:0.6}, ${L("smooth re-reading").toFixed(2)});`,
      `tl.fromTo("#sc-mechanism .path-recall", {opacity:0, x:40}, {opacity:1, x:0, duration:0.6}, ${L("recalling practises").toFixed(2)});`,
      `tl.fromTo("#sc-mechanism .idea", {x:0, y:0, scale:1}, {x:380, y:-120, scale:1.3, duration:1.2, ease:"power2.inOut"}, ${L("pulling an idea").toFixed(2)});`,
      `tl.to("#sc-mechanism .path-recall", {scale:1.08, duration:0.5}, ${L("pulling an idea").toFixed(2)});`,
      reveal("#sc-mechanism .dd", L("desirable difficulty")),
      reveal("#sc-mechanism .label-interp", L("The authors' explanation")),
      reveal("#sc-mechanism .caption", S + 1),
    ],
    limits: () => [
      ...["one university", "young students", "two short passages", "one-week delay"].map((p, i) =>
        `tl.fromTo("#sc-limits .chip:nth-child(${i + 1})", {opacity:0, scale:0.8}, {opacity:1, scale:1, duration:0.4, ease:"back.out(1.6)"}, ${L(p).toFixed(2)});`),
      `tl.to("#sc-limits .chips", {y:-220, scale:0.8, duration:0.8, ease:"power2.inOut"}, ${L("pooled").toFixed(2)});`,
      reveal("#sc-limits .forest", L("pooled")),
      `tl.fromTo("#sc-limits .dot", {scale:0}, {scale:1, duration:0.3, stagger:0.02, ease:"back.out(2)"}, ${(L("pooled") + 0.3).toFixed(2)});`,
      reveal("#sc-limits .forest-label", L("not every time")),
      reveal("#sc-limits .moderators", L("It worked best with feedback")),
      `tl.fromTo("#sc-limits .moderators .off", {opacity:0}, {opacity:1, duration:0.5}, ${L("the benefit disappeared").toFixed(2)});`,
      `tl.to("#sc-limits .forest-label", {text:"Published studies show bigger effects than unpublished ones · the true average is probably a little smaller", duration:0.01}, ${L("Published studies").toFixed(2)});`,
      reveal("#sc-limits .caption", S + 1),
    ],
    method: () => [
      ...["Close the book", "try to recall", "check what you missed", "Come back to it another day"].map((p, i) =>
        `tl.fromTo("#sc-method .st${i}", {opacity:0, x:-40}, {opacity:1, x:0, duration:0.5, ease:"power2.out"}, ${L(p).toFixed(2)});`),
      reveal("#sc-method .harder", L("It will feel harder")),
      `tl.to("#sc-method .steps, #sc-method .harder", {opacity:0.2, duration:0.6}, ${L("Did you know that?").toFixed(2)});`,
      `tl.fromTo("#sc-method .host", {opacity:0, y:40}, {opacity:1, y:0, duration:0.5, ease:"back.out(1.6)"}, ${L("Did you know that?").toFixed(2)});`,
      `tl.to("#sc-method .host .daxter-head", {y:6, duration:0.18, yoyo:true, repeat:3, ease:"sine.inOut"}, ${L("Now you do").toFixed(2)});`,
      `tl.to("#sc-method .host .daxter-halo", {scale:1.3, svgOrigin:"80 58", duration:0.4}, ${L("Now you do").toFixed(2)});`,
      reveal("#sc-method .close-line", L("Did you know that?")),
    ],
    keep: () => [
      `tl.fromTo("#sc-keep .card", {rotationY:60, opacity:0, x:80}, {rotationY:0, opacity:1, x:0, duration:0.9, ease:"power2.out"}, ${S + 0.2});`,
      reveal("#sc-keep .url", L("dexty dot live")),
      `tl.to("#sc-keep", {opacity:0, duration:0.6}, ${E - 0.6});`,
    ],
    closing: () => [
      `tl.fromTo("#sc-closing .closing-logo", {scale:0.7, opacity:0}, {scale:1, opacity:1, duration:0.7, ease:"power2.out"}, ${S + 0.1});`,
      reveal("#sc-closing .closing-title", S + 0.6), reveal("#sc-closing .closing-sub", S + 1.3),
      `tl.to("#sc-closing", {opacity:0, duration:0.8}, ${E - 0.8});`,
    ],
  };
  return per[s.id]().join("\n      ");
};

const css = readFileSync("scenes.css", "utf8");
const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Did You Know That? · Ep 1 Adults · The Re-Reading Trap</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Fredoka:wght@500;600&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/TextPlugin.min.js"></script>
    <style>${css}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
      ${scenes.map(sceneHtml).join("\n      ")}
      ${audioHtml}
    </div>
    <script>
      gsap.registerPlugin(TextPlugin);
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
console.log(`total ${TOTAL.toFixed(1)}s · ${scenes.length} scenes · ${sfx.length} sfx cues`);
