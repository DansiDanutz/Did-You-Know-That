// Builds index.html + timeline.json for Episode 1 (Kids), revision 3:
// "Who Keeps Pressing Play?" (episodes/kids-001-scroll-monster/script.md).
// Timing comes from the real narration lengths (assets/vo/*.mp3), so the
// picture always matches Brian's voice. Dexter acts every line; no HUD, no
// levels, no magic word, no fake clickable end screen (made-for-kids).
//   node build.mjs   (then: python3 ../../tools/make_bed.py video/ep01-kids)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { art } from "../../website/js/ui/art.js";
import { DAXTER_SVG } from "../../website/js/ui/character.js";
import { rig } from "./choreography.mjs";

const lines = JSON.parse(readFileSync("vo-lines.json", "utf8")).lines;
const dur = (path) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString());
const vo = Object.fromEntries(lines.map((l) => [l.id, { text: l.text, len: dur(`assets/vo/${l.id}.mp3`) }]));

// Cue = the moment a phrase is spoken, estimated from its position in the line
// (SSML breaks count as pauses of their stated length).
const plain = (t) => t.replace(/<[^>]+>/g, "");
const cue = (id, phrase) => {
  const raw = vo[id].text;
  const at = plain(raw).indexOf(phrase);
  if (at < 0) throw new Error(`cue "${phrase}" not in ${id}`);
  // Weight: characters before the phrase + pause seconds before it, over the whole line.
  const before = raw.slice(0, indexInRaw(raw, at));
  const pauses = (s) => [...s.matchAll(/<break time="([\d.]+)s"/g)].reduce((n, m) => n + Number(m[1]), 0);
  const chars = plain(raw).length;
  const speech = Math.max(1, vo[id].len - pauses(raw));
  return (at / chars) * speech + pauses(before);
};
// Position in the raw (SSML) string of the n-th plain character.
function indexInRaw(raw, n) {
  let i = 0, seen = 0;
  while (i < raw.length && seen < n) {
    if (raw[i] === "<") i = raw.indexOf(">", i) + 1;
    else { i += 1; seen += 1; }
  }
  return i;
}

const CLOSING = 5;

// ---------------------------------------------------------------- timeline
let t = 0;
const scenes = [];
const add = (scene) => {
  scenes.push({ ...scene, start: +t.toFixed(3) });
  t += scene.length;
};
const sc = (id, lead, tail, extra = {}) => add({ id, kind: "scene", length: +(lead + vo[id].len + tail).toFixed(3), voAt: lead, ...extra });
sc("rocket", 1.2, 1.0);
sc("mystery", 0.5, 3.2); // the pause after "Have a think!" is the child's thinking time
sc("willpower", 0.5, 1.0);
sc("hint", 0.5, 1.0);
sc("test", 0.5, 1.2);
sc("bedtime", 0.5, 1.0);
sc("launch", 0.4, 1.0);
add({ id: "closing", kind: "scene", length: CLOSING });
const TOTAL = +t.toFixed(3);
const at = (id) => scenes.find((s) => s.id === id);
const g = (id, phrase) => +(at(id).start + at(id).voAt + cue(id, phrase)).toFixed(2); // global cue time

// Sound-effect cues for the bed builder (names from tools/make_bed.py).
const sfx = [
  ["tap", g("rocket", "ONE quick video")],
  ["autoplay", g("rocket", "Up next?")], ["autoplay", g("rocket", "Oh, and this one!")], ["autoplay", g("rocket", "Wait…") - 1.1],
  ["sad", g("rocket", "where did the sun go")],
  ["hoot", g("mystery", "Hi, I'm Dexter") - 0.3], ["pop", g("mystery", "bad at stopping")], ["pop", g("mystery", "something keep pressing play")],
  ["tick", at("mystery").start + at("mystery").length - 3.0], ["tick", at("mystery").start + at("mystery").length - 2.0], ["tick", at("mystery").start + at("mystery").length - 1.0],
  ["brass", g("willpower", "SUPER willpower")], ["autoplay", g("willpower", "and I stop.") + 1.4], ["deflate", g("willpower", "Okay.") - 0.6],
  ["hoot", g("hint", "What did you notice")], ["tick", g("hint", "three, two, one") + 0.2], ["tick", g("hint", "three, two, one") + 0.7], ["tick", g("hint", "three, two, one") + 1.2],
  ["pop", g("hint", "The app pressed it")], ["ding", g("hint", "That's called autoplay")],
  ["click", g("test", "can you switch autoplay off") + 1.2], ["chime", g("test", "I get to choose")], ["tap", g("test", "rocket!")],
  ["ding", g("bedtime", "9 to 12 hours")], ["ring", g("bedtime", "when it rings")], ["chime", g("bedtime", "Goodnight, tablet")],
  ["tick", g("launch", "Three")], ["tick", g("launch", "two")], ["tick", g("launch", "one")], ["whoosh", g("launch", "We did it!") - 0.2], ["victory", g("launch", "We did it!")],
  ["pop", g("launch", "switch autoplay off")], ["pop", g("launch", "use a timer")], ["pop", g("launch", "give your screen a bedtime")],
  ["card", g("launch", "dexty dot live")], ["fanfare", at("closing").start + 0.2],
];
const voClips = scenes.filter((s) => s.voAt !== undefined).map((s) => ({ id: s.id, start: +(s.start + s.voAt).toFixed(3), len: vo[s.id].len }));
writeFileSync("timeline.json", JSON.stringify({ total: TOTAL, scenes, vo: voClips, sfx, moods: {
  rocket: "play", mystery: "curious", willpower: "play", hint: "curious", test: "warm", bedtime: "lullaby", launch: "victory", closing: "warm" } }, null, 2));

// ---------------------------------------------------------------- props (original vector art)
const daxter = (cls) => {
  const svg = DAXTER_SVG.replace(/id="(daxter\w+)"/g, `id="$1-${cls}"`).replace(/url\(#(daxter\w+)\)/g, `url(#$1-${cls})`);
  return `<div class="dax ${cls}">${svg}</div>`;
};
const SUN = `<svg viewBox="0 0 200 200"><g class="sun-rays">${Array.from({ length: 12 }, (_, i) => `<rect x="97" y="4" width="6" height="30" rx="3" fill="#ffd84a" transform="rotate(${i * 30} 100 100)"/>`).join("")}</g><circle cx="100" cy="100" r="54" fill="#ffe36b" stroke="#ffb020" stroke-width="8"/></svg>`;
const ROCKET = (cls = "") => `<svg class="rocket-svg ${cls}" viewBox="0 0 200 420">
  <path class="rk-cone" d="M100 10 L150 120 H50 Z" fill="#ff3fa4" stroke="#2a1470" stroke-width="8" stroke-linejoin="round"/>
  <rect class="rk-body" x="50" y="118" width="100" height="200" rx="18" fill="#f4f1ff" stroke="#2a1470" stroke-width="8"/>
  <circle cx="100" cy="190" r="26" fill="#4fc3ff" stroke="#2a1470" stroke-width="8"/>
  <path class="rk-fin rk-fin-l" d="M52 250 L10 340 L52 318 Z" fill="#ffd84a" stroke="#2a1470" stroke-width="8" stroke-linejoin="round"/>
  <path class="rk-fin rk-fin-r" d="M148 250 L190 340 L148 318 Z" fill="#ffd84a" stroke="#2a1470" stroke-width="8" stroke-linejoin="round"/>
  <path class="rk-flame" d="M80 320 Q100 420 120 320 Z" fill="#ff8a1f" opacity="0"/>
  <text class="rk-tape" x="100" y="300" text-anchor="middle" font-size="26" fill="#2a1470" font-family="DYK Demi">tape</text>
</svg>`;
const TABLET = (cls, inner = "") => `<div class="tablet ${cls}"><div class="tab-screen">${inner}</div></div>`;
const PLAYER = (label = "Rocket fins 101") => `
  <div class="vid"><div class="vid-thumb">▶</div><div class="vid-title">${label}</div></div>
  <div class="upnext"><span>Up next</span><b class="count">3</b></div>`;
const SWITCH = `<div class="switch"><span class="sw-label">Autoplay</span><div class="sw-track"><i class="sw-knob"></i></div><b class="sw-state">ON</b></div>`;
const MOON_CLOCK = `<svg class="moon-clock" viewBox="0 0 300 300"><circle cx="150" cy="150" r="130" fill="#1a0a5c" stroke="#fff" stroke-width="10"/><circle class="mc-fill" cx="150" cy="150" r="100" fill="none" stroke="#ffd84a" stroke-width="40" stroke-dasharray="628" stroke-dashoffset="628" transform="rotate(-90 150 150)"/><text x="150" y="168" text-anchor="middle" font-size="64" fill="#fff" font-family="DYK Heavy" class="mc-text">9–12 h</text></svg>`;
const BASKET = `<div class="basket"><div class="bk-body"></div><div class="bk-blanket"></div><div class="bk-zz">z z z</div></div>`;
const OWL = (cls) => `<div class="owl ${cls}">${art("owl")}</div>`;

const BODY = {
  rocket: () => `
    <div class="sky"></div><div class="sun">${SUN}</div><div class="ground"></div>
    <div class="rocket-stand">${ROCKET("rk-build")}</div>
    ${OWL("owl-rocket")}
    ${daxter("dax-rocket")}
    ${TABLET("tab-rocket", PLAYER())}`,
  mystery: () => `
    <div class="spot"></div>
    ${daxter("dax-mystery")}
    <div class="idea idea-a"><span class="idea-icon">😣</span><b>Bad at stopping?</b></div>
    <div class="idea idea-b"><span class="idea-icon">👆</span><b>Something pressed play?</b></div>
    <div class="think"><div class="think-clock"><i></i></div><span>Have a think!</span></div>`,
  willpower: () => `
    <div class="spot"></div>
    ${daxter("dax-willpower")}
    <div class="cape"></div>
    ${TABLET("tab-willpower", PLAYER("Rocket fins 102"))}
    <div class="will-word">SUPER WILLPOWER!</div>`,
  hint: () => `
    <div class="spot"></div>
    ${OWL("owl-hint")}
    ${daxter("dax-hint")}
    ${TABLET("tab-hint", PLAYER("Rocket fins 102"))}
    <div class="finger">👆</div>
    <div class="diagram">
      <div class="dg-box">▶ video</div><div class="dg-arrow">→</div><div class="dg-box dg-up">Up next 3·2·1</div><div class="dg-arrow">→</div><div class="dg-box">▶ video</div>
      <div class="dg-label">AUTOPLAY: the next video starts by itself</div>
    </div>`,
  test: () => `
    <div class="spot"></div>
    ${OWL("owl-test")}
    ${daxter("dax-test")}
    ${TABLET("tab-test", PLAYER("Rocket fins 102"))}
    ${SWITCH}
    <div class="waits">…</div>`,
  bedtime: () => `
    <div class="night"></div><div class="stars">${Array.from({ length: 30 }, (_, i) => `<i style="left:${(i * 173) % 1900}px;top:${(i * 97) % 500}px"></i>`).join("")}</div>
    ${MOON_CLOCK}
    <div class="sleep-note">Kids need <b>9 to 12 hours</b> of sleep</div>
    <div class="timer"><span>⏰</span><b>21:00</b></div>
    ${BASKET}
    ${daxter("dax-bedtime")}
    ${TABLET("tab-bedtime", "")}`,
  launch: () => `
    <div class="sky sky-morning"></div><div class="sun sun-morning">${SUN}</div><div class="ground"></div>
    <div class="rocket-stand rocket-launch">${ROCKET("rk-done")}</div>
    <div class="countdown">3</div>
    ${OWL("owl-launch")}
    ${daxter("dax-launch")}
    <div class="recap">
      <div class="rc rc0"><span>🔀</span><b>Autoplay OFF</b></div>
      <div class="rc rc1"><span>⏰</span><b>Timer</b></div>
      <div class="rc rc2"><span>🧺</span><b>Screen bedtime</b></div>
    </div>
    <div class="mission"><small>YOUR MISSION</small>With a grown-up: find the <b>autoplay switch</b> in one app, and decide together.</div>
    <div class="url">dexty.live</div>`,
  closing: () => `
    <div class="closing-logo"><img src="assets/logo.png" alt="" /></div>
    <div class="closing-title">Did You Know That?</div>
    <div class="closing-sub">Stay curious!</div>`,
};

const sceneHtml = (s) =>
  `<section id="sc-${s.id}" class="clip scene bg-${s.id}" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-track-index="0">${BODY[s.id](s)}</section>`;
const audioHtml = [
  `<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="5" data-volume="0.6"></audio>`,
  ...voClips.map((v) => `<audio id="vo-${v.id}" src="assets/vo/${v.id}.mp3" data-start="${v.start}" data-duration="${v.len.toFixed(3)}" data-track-index="6" data-volume="1"></audio>`),
].join("\n      ");

// ---------------------------------------------------------------- animation (GSAP, seek-safe)
const anim = (s) => {
  const S = s.start, E = s.start + s.length;
  const L = (phrase) => g(s.id, phrase);
  const D = rig(`#sc-${s.id} .dax-${s.id}`);
  const tab = `#sc-${s.id} .tablet`;
  const autoplayBeat = (when) => [
    `tl.fromTo("${tab} .upnext", {opacity:0, y:20}, {opacity:1, y:0, duration:0.3, immediateRender:false}, ${when.toFixed(2)});`,
    `tl.to("${tab} .count", {text:"2", duration:0.01}, ${(when + 0.5).toFixed(2)});`,
    `tl.to("${tab} .count", {text:"1", duration:0.01}, ${(when + 1.0).toFixed(2)});`,
    `tl.to("${tab} .upnext", {opacity:0, duration:0.2}, ${(when + 1.5).toFixed(2)});`,
    `tl.fromTo("${tab} .vid", {x:0}, {x:-420, duration:0.4, ease:"power2.in", immediateRender:false}, ${(when + 1.4).toFixed(2)});`,
    `tl.fromTo("${tab} .vid", {x:420}, {x:0, duration:0.4, ease:"power2.out", immediateRender:false}, ${(when + 1.8).toFixed(2)});`,
    `tl.to("${tab} .count", {text:"3", duration:0.01}, ${(when + 2.2).toFixed(2)});`,
  ].join("\n");
  const per = {
    rocket: () => [
      // Dexter tapes a fin, Hoot holds the cone; the sun sinks in three steps as videos autoplay
      `tl.fromTo("#sc-rocket .dax-rocket", {x:-500}, {x:0, duration:1.0, ease:"power3.out"}, ${S});`,
      ...D.runCycle(S, 1.0), ...D.rest(S + 1.0),
      D.pointAt(L("building a rocket") , -80),
      `tl.to("#sc-rocket .rk-tape", {opacity:1, duration:0.2}, ${L("building a rocket").toFixed(2)});`,
      `tl.to("#sc-rocket .rk-fin-l", {rotation:-10, svgOrigin:"52 300", duration:0.2, yoyo:true, repeat:3}, ${L("building a rocket").toFixed(2)});`,
      D.pointAt(L("before sunset"), -150), D.look(4, -4, L("before sunset")),
      `tl.fromTo("#sc-rocket .tab-rocket", {y:400, opacity:0}, {y:0, opacity:1, duration:0.6, ease:"back.out(1.6)"}, ${L("ONE quick video").toFixed(2)});`,
      D.pointAt(L("ONE quick video"), -60), D.look(6, 4, L("ONE quick video")),
      ...D.rest(L("ONE quick video") + 0.5),
      autoplayBeat(L("Up next?") - 0.4), autoplayBeat(L("Oh, and this one!") - 0.4), autoplayBeat(L("Wait…") - 2.2),
      `tl.to("#sc-rocket .sun", {y:260, duration:${(L("Wait…") - L("ONE quick video")).toFixed(2)}, ease:"none"}, ${L("ONE quick video").toFixed(2)});`,
      `tl.to("#sc-rocket .sky", {opacity:1, duration:${(L("Wait…") - L("ONE quick video")).toFixed(2)}, ease:"none"}, ${L("ONE quick video").toFixed(2)});`,
      D.look(0, -6, L("Wait…")), D.brows(-8, L("Wait…")), D.pose(D.HEAD, -10, L("Wait…")),
      D.glow(0.7, L("where did the sun go")),
      `tl.to("#sc-rocket .owl-rocket", {rotation:12, duration:0.3, yoyo:true, repeat:1}, ${L("Our rocket").toFixed(2)});`,
      ...D.shrug(L("Our rocket")),
    ],
    mystery: () => [
      `tl.fromTo("#sc-mystery .dax-mystery", {scale:0.8, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:"back.out(2)"}, ${S});`,
      ...D.wave(L("Hi, I'm Dexter"), 3), D.glow(1.3, L("Hi, I'm Dexter")), D.glow(1, L("Hi, I'm Dexter") + 0.8),
      ...D.chin(L("I have a mystery")), D.brows(-6, L("I have a mystery")),
      D.pointAt(L("What do you think?"), -95), D.look(0, 0, L("What do you think?")),
      `tl.fromTo("#sc-mystery .idea-a", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:"back.out(2.5)"}, ${L("bad at stopping").toFixed(2)});`,
      D.pose(D.BACK_ARM, 110, L("bad at stopping"), 0.3), D.brows(6, L("bad at stopping")),
      `tl.fromTo("#sc-mystery .idea-b", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:"back.out(2.5)"}, ${L("something keep pressing play").toFixed(2)});`,
      D.pose(D.FRONT_ARM, -110, L("something keep pressing play"), 0.3), D.brows(-6, L("something keep pressing play")),
      ...D.chin(L("Have a think!")),
      `tl.fromTo("#sc-mystery .think", {opacity:0, y:40}, {opacity:1, y:0, duration:0.4}, ${L("Have a think!").toFixed(2)});`,
      `tl.fromTo("#sc-mystery .think-clock i", {rotation:0}, {rotation:360, duration:3.0, ease:"none", svgOrigin:"0 0"}, ${(E - 3.2).toFixed(2)});`,
    ],
    willpower: () => [
      `tl.fromTo("#sc-willpower .dax-willpower", {x:-400}, {x:0, duration:0.5, ease:"power3.out"}, ${S});`,
      D.glow(1.6, L("I know!"), 0.25), D.pointAt(L("I know!"), -170), D.jump(L("I know!"), 110), D.glow(1, L("I know!") + 0.9),
      `tl.fromTo("#sc-willpower .cape", {scaleY:0, opacity:0}, {scaleY:1, opacity:1, duration:0.4, ease:"back.out(2)"}, ${L("SUPER willpower").toFixed(2)});`,
      ...D.hero(L("SUPER willpower")),
      `tl.fromTo("#sc-willpower .will-word", {scale:0, rotation:-10}, {scale:1, rotation:-4, duration:0.5, ease:"back.out(2.5)"}, ${L("SUPER willpower").toFixed(2)});`,
      `tl.to("#sc-willpower .will-word", {opacity:0, duration:0.3}, ${L("Watch this").toFixed(2)});`,
      `tl.fromTo("#sc-willpower .tab-willpower", {y:400, opacity:0}, {y:0, opacity:1, duration:0.5, ease:"back.out(1.6)"}, ${L("Watch this").toFixed(2)});`,
      ...D.rest(L("Watch this")), D.look(6, 4, L("One video")), D.brows(-8, L("One video")),
      D.pose(D.FRONT_ARM, -30, L("One video"), 0.3), D.pose(D.BACK_ARM, 30, L("One video"), 0.3),
      `tl.to("#sc-willpower .dax-willpower", {scale:1.06, duration:0.3, yoyo:true, repeat:3}, ${L("and I stop.").toFixed(2)});`,
      autoplayBeat(L("and I stop.") + 0.4),
      ...D.melt(L("Okay.") - 0.9),
      `tl.to("#sc-willpower .cape", {scaleY:0.4, opacity:0.5, duration:0.6}, ${(L("Okay.") - 0.9).toFixed(2)});`,
      D.look(0, 6, L("Okay.")),
      D.unmelt(L("That didn't work") + 0.6), D.headShake(L("That didn't work"), 2, 6),
    ],
    hint: () => [
      `tl.fromTo("#sc-hint .owl-hint", {x:600, opacity:0}, {x:0, opacity:1, duration:0.7, ease:"power2.out"}, ${S});`,
      `tl.fromTo("#sc-hint .dax-hint", {opacity:0}, {opacity:1, duration:0.4}, ${S});`,
      `tl.to("#sc-hint .owl-hint", {rotation:-8, duration:0.25, yoyo:true, repeat:3}, ${L("What did you notice").toFixed(2)});`,
      D.look(-6, 0, L("What did you notice")), D.pose(D.HEAD, 6, L("What did you notice")),
      `tl.fromTo("#sc-hint .tab-hint", {scale:0.6, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:"back.out(1.6)"}, ${L("Let's watch the end again").toFixed(2)});`,
      ...D.rest(L("Let's watch the end again")), D.look(5, 3, L("Let's watch the end again")),
      `tl.to("#sc-hint .tab-hint", {scale:1.45, x:-120, y:-60, duration:0.8, ease:"power2.inOut"}, ${L("very closely").toFixed(2)});`,
      `tl.to("#sc-hint .dax-hint", {scale:1.1, x:40, duration:0.6}, ${L("very closely").toFixed(2)});`,
      D.pointAt(L("Look!"), -70), D.brows(-8, L("Look!")),
      `tl.fromTo("#sc-hint .tab-hint .upnext", {opacity:0, scale:0.6}, {opacity:1, scale:1.3, duration:0.3, immediateRender:false}, ${L("A little countdown").toFixed(2)});`,
      `tl.to("#sc-hint .tab-hint .count", {text:"2", duration:0.01}, ${(L("three, two, one") + 0.5).toFixed(2)});`,
      `tl.to("#sc-hint .tab-hint .count", {text:"1", duration:0.01}, ${(L("three, two, one") + 1.0).toFixed(2)});`,
      `tl.fromTo("#sc-hint .finger", {opacity:0, y:-80, x:60}, {opacity:1, y:0, x:0, duration:0.4, ease:"power2.out"}, ${L("Nobody pressed play").toFixed(2)});`,
      `tl.to("#sc-hint .finger", {y:18, duration:0.12, yoyo:true, repeat:1}, ${L("The app pressed it").toFixed(2)});`,
      D.jump(L("The app pressed it"), 90), D.glow(1.5, L("The app pressed it"), 0.3), D.glow(1, L("The app pressed it") + 1),
      `tl.to("#sc-hint .tab-hint", {scale:0.9, x:560, y:220, duration:0.8, ease:"power2.inOut"}, ${L("That's called autoplay").toFixed(2)});`,
      `tl.to("#sc-hint .finger", {opacity:0, duration:0.3}, ${L("That's called autoplay").toFixed(2)});`,
      `tl.to("#sc-hint .dax-hint", {scale:1, x:0, duration:0.6}, ${L("That's called autoplay").toFixed(2)});`,
      `tl.fromTo("#sc-hint .diagram", {opacity:0, y:60}, {opacity:1, y:0, duration:0.6}, ${L("That's called autoplay").toFixed(2)});`,
      `tl.fromTo("#sc-hint .dg-box", {scale:0.7}, {scale:1, duration:0.3, stagger:0.4, ease:"back.out(2)"}, ${(L("That's called autoplay") + 0.3).toFixed(2)});`,
      `tl.fromTo("#sc-hint .dg-label", {opacity:0}, {opacity:1, duration:0.4}, ${L("starts all by itself").toFixed(2)});`,
      D.pointAt(L("Lots of apps"), -90), ...D.shrug(L("even grown-ups")),
      `tl.to("#sc-hint .owl-hint", {y:-30, duration:0.3, yoyo:true, repeat:1}, ${L("even grown-ups").toFixed(2)});`,
      D.headShake(L("It's not because I'm bad"), 3, 7), D.pointAt(L("It's how it's built"), -80), D.nod(L("It's how it's built")),
    ],
    test: () => [
      `tl.fromTo("#sc-test .owl-test", {opacity:0}, {opacity:1, duration:0.3}, ${S});`,
      `tl.fromTo("#sc-test .dax-test", {opacity:0}, {opacity:1, duration:0.3}, ${S});`,
      D.pointAt(L("Let's test it"), -170), D.glow(1.3, L("Let's test it")), D.glow(1, L("Let's test it") + 0.8),
      `tl.fromTo("#sc-test .switch", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:"back.out(2)"}, ${L("can you switch autoplay off").toFixed(2)});`,
      D.look(-6, -2, L("can you switch autoplay off")), D.pointAt(L("can you switch autoplay off"), -40),
      `tl.to("#sc-test .owl-test", {x:180, y:-40, rotation:-10, duration:0.6, ease:"power2.inOut"}, ${(L("can you switch autoplay off") + 0.5).toFixed(2)});`,
      `tl.to("#sc-test .sw-knob", {x:-150, duration:0.25, ease:"power2.inOut"}, ${(L("can you switch autoplay off") + 1.2).toFixed(2)});`,
      `tl.to("#sc-test .sw-track", {backgroundColor:"#6b6b8a", duration:0.25}, ${(L("can you switch autoplay off") + 1.2).toFixed(2)});`,
      `tl.to("#sc-test .sw-state", {text:"OFF", duration:0.01}, ${(L("can you switch autoplay off") + 1.3).toFixed(2)});`,
      `tl.to("#sc-test .owl-test", {x:0, y:0, rotation:0, duration:0.6}, ${(L("can you switch autoplay off") + 1.7).toFixed(2)});`,
      `tl.fromTo("#sc-test .tab-test .vid", {x:0}, {x:-420, duration:0.4, ease:"power2.in"}, ${(L("Ooh.") - 0.5).toFixed(2)});`,
      `tl.fromTo("#sc-test .waits", {opacity:0}, {opacity:1, duration:0.3, yoyo:true, repeat:5}, ${L("Ooh.").toFixed(2)});`,
      D.look(6, 2, L("Ooh.")), D.brows(-8, L("Ooh.")),
      D.jump(L("nothing happens") , 60),
      D.pointAt(L("I get to choose"), -170), D.glow(1.4, L("I get to choose")), D.glow(1, L("I get to choose") + 0.8),
      ...D.chin(L("And I choose…")),
      ...D.rest(L("rocket!")), D.jump(L("rocket!"), 120, 360),
      `tl.to("#sc-test .tab-test", {y:500, opacity:0, duration:0.5, ease:"power2.in"}, ${L("rocket!").toFixed(2)});`,
    ],
    bedtime: () => [
      `tl.fromTo("#sc-bedtime .dax-bedtime", {x:-400}, {x:0, duration:0.6, ease:"power3.out"}, ${S});`,
      ...D.runCycle(S, 0.6), ...D.rest(S + 0.6),
      D.pointAt(L("you know when else"), -95), D.brows(-6, L("you know when else")),
      `tl.fromTo("#sc-bedtime .moon-clock", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.6, ease:"back.out(1.8)"}, ${L("Bedtime.").toFixed(2)});`,
      `tl.to("#sc-bedtime .mc-fill", {strokeDashoffset:${628 * (1 - 12 / 24)}, duration:1.6, ease:"power1.inOut"}, ${L("9 to 12 hours").toFixed(2)});`,
      `tl.fromTo("#sc-bedtime .sleep-note", {opacity:0, y:30}, {opacity:1, y:0, duration:0.5}, ${L("9 to 12 hours").toFixed(2)});`,
      D.look(-5, -3, L("9 to 12 hours")),
      ...D.chin(L("scientists found")), D.look(0, -4, L("scientists found")),
      `tl.fromTo("#sc-bedtime .tab-bedtime", {opacity:0, y:300}, {opacity:1, y:0, duration:0.5, ease:"back.out(1.6)"}, ${L("use screens at bedtime").toFixed(2)});`,
      `tl.to("#sc-bedtime .dax-bedtime .daxter-lids ellipse", {attr:{ry:9, cy:60}, duration:0.4}, ${L("feel sleepier").toFixed(2)});`,
      `tl.to("#sc-bedtime .dax-bedtime .daxter-lids ellipse", {attr:{ry:0, cy:58}, duration:0.3}, ${L("So tonight").toFixed(2)});`,
      ...D.rest(L("So tonight")),
      `tl.fromTo("#sc-bedtime .timer", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:"back.out(2)"}, ${L("setting a timer").toFixed(2)});`,
      D.pointAt(L("setting a timer"), -120),
      `tl.to("#sc-bedtime .timer", {rotation:8, duration:0.08, yoyo:true, repeat:9}, ${L("when it rings").toFixed(2)});`,
      `tl.fromTo("#sc-bedtime .basket", {opacity:0, y:80}, {opacity:1, y:0, duration:0.5}, ${L("my tablet goes to bed").toFixed(2)});`,
      `tl.to("#sc-bedtime .tab-bedtime", {x:620, y:120, scale:0.55, rotation:-90, duration:0.9, ease:"power2.inOut"}, ${L("my tablet goes to bed").toFixed(2)});`,
      `tl.fromTo("#sc-bedtime .bk-blanket", {scaleY:0}, {scaleY:1, duration:0.5, ease:"power2.out"}, ${L("Goodnight, tablet").toFixed(2)});`,
      `tl.fromTo("#sc-bedtime .bk-zz", {opacity:0, y:0}, {opacity:1, y:-40, duration:1.2}, ${(L("Goodnight, tablet") + 0.4).toFixed(2)});`,
      ...D.wave(L("Goodnight, tablet"), 2, D.FRONT_ARM, -120),
    ],
    launch: () => [
      `tl.fromTo("#sc-launch .dax-launch", {opacity:0}, {opacity:1, duration:0.3}, ${S});`,
      `tl.fromTo("#sc-launch .countdown", {scale:0}, {scale:1, duration:0.3, ease:"back.out(2)"}, ${L("Three").toFixed(2)});`,
      `tl.to("#sc-launch .countdown", {text:"2", duration:0.01}, ${L("two").toFixed(2)});`,
      `tl.to("#sc-launch .countdown", {text:"1", duration:0.01}, ${L("one").toFixed(2)});`,
      `tl.to("#sc-launch .countdown", {opacity:0, duration:0.2}, ${L("We did it!").toFixed(2)});`,
      ...D.hero(L("Three")),
      `tl.to("#sc-launch .rk-flame", {opacity:1, duration:0.2}, ${(L("We did it!") - 0.2).toFixed(2)});`,
      `tl.to("#sc-launch .rocket-launch", {y:-1300, x:120, rotation:6, duration:2.6, ease:"power3.in"}, ${(L("We did it!") - 0.1).toFixed(2)});`,
      `tl.to("#sc-launch .rk-flame", {scaleY:1.6, svgOrigin:"100 320", duration:0.15, yoyo:true, repeat:15}, ${(L("We did it!") - 0.1).toFixed(2)});`,
      D.jump(L("We did it!"), 140, 360), D.glow(1.5, L("We did it!")), D.glow(1, L("We did it!") + 1),
      `tl.to("#sc-launch .owl-launch", {y:-60, rotation:15, duration:0.3, yoyo:true, repeat:3}, ${L("We did it!").toFixed(2)});`,
      ...D.chin(L("what did we discover")),
      `tl.fromTo("#sc-launch .recap", {opacity:0}, {opacity:1, duration:0.3}, ${L("you can be the boss").toFixed(2)});`,
      ...D.rest(L("you can be the boss")), D.pointAt(L("you can be the boss"), -95),
      ...["switch autoplay off", "use a timer", "give your screen a bedtime"].map((p, i) =>
        `tl.fromTo("#sc-launch .rc${i}", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.45, ease:"back.out(2.5)"}, ${L(p).toFixed(2)});`),
      D.nod(L("give your screen a bedtime")),
      `tl.to("#sc-launch .recap", {y:-170, scale:0.8, duration:0.6, ease:"power2.inOut"}, ${L("Your mission").toFixed(2)});`,
      `tl.fromTo("#sc-launch .mission", {opacity:0, y:60}, {opacity:1, y:0, duration:0.6, ease:"back.out(1.6)"}, ${L("Your mission").toFixed(2)});`,
      D.pointAt(L("Your mission"), -95), D.look(4, 3, L("find the autoplay switch")),
      `tl.to("#sc-launch .mission", {opacity:0, y:-40, duration:0.4}, ${L("Want to read this story again").toFixed(2)});`,
      `tl.fromTo("#sc-launch .url", {opacity:0, scale:0.6}, {opacity:1, scale:1, duration:0.5, ease:"back.out(2)"}, ${L("dexty dot live").toFixed(2)});`,
      D.pointAt(L("dexty dot live"), -60),
      `tl.to("#sc-launch .url", {opacity:0, duration:0.4}, ${L("Did you know that?").toFixed(2)});`,
      ...D.rest(L("Did you know that?")), D.brows(-6, L("Did you know that?")), D.glow(1.3, L("Now you do")), D.glow(1, L("Now you do") + 0.8),
      ...D.wave(L("Bye for now!"), 4),
      `tl.to("#sc-launch .owl-launch", {rotation:-10, duration:0.25, yoyo:true, repeat:5}, ${L("Bye for now!").toFixed(2)});`,
    ],
    closing: () => [
      `tl.fromTo("#sc-closing .closing-logo", {scale:0.6, opacity:0}, {scale:1, opacity:1, duration:0.6, ease:"back.out(1.6)"}, ${S + 0.1});`,
      `tl.fromTo("#sc-closing .closing-title", {opacity:0, y:30}, {opacity:1, y:0, duration:0.5}, ${S + 0.5});`,
      `tl.fromTo("#sc-closing .closing-sub", {opacity:0}, {opacity:1, duration:0.5}, ${S + 1.2});`,
      `tl.to("#sc-closing", {opacity:0, duration:0.8}, ${E - 0.8});`,
    ],
  };
  const talk = s.voAt === undefined ? [] : [D.mouth(S + s.voAt, vo[s.id].len), ...D.blinks(S + 0.8, E - 0.5)];
  return [...per[s.id](), ...talk].join("\n      ");
};

const css = readFileSync("scenes.css", "utf8");
const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Did You Know That? · Ep 1 Kids · Who Keeps Pressing Play?</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet" />
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
