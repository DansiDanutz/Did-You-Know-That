// Builds index.html + timeline.json for Episode 1 (Kids) "The Scroll Monster".
// Timing comes from the real narration lengths (assets/vo/*.mp3), so the
// picture always matches Brian's voice. Art is shared with the website game.
//   node build.mjs   (then: python3 ../../tools/make_ep01_kids_audio.py)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { art } from "../../website/js/ui/art.js";
import { DAXTER_SVG } from "../../website/js/ui/character.js";
import { startChoreography } from "./choreography.mjs";

const lines = JSON.parse(readFileSync("vo-lines.json", "utf8")).lines;
const dur = (path) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString());
const vo = Object.fromEntries(lines.map((l) => [l.id, { text: l.text, len: dur(`assets/vo/${l.id}.mp3`) }]));

// Cue = the moment a phrase is spoken, estimated from its position in the line.
const plain = (t) => t.replace(/<[^>]+>/g, "");
const cue = (id, phrase) => {
  const text = plain(vo[id].text);
  const at = text.indexOf(phrase);
  if (at < 0) throw new Error(`cue "${phrase}" not in ${id}`);
  return (at / text.length) * vo[id].len;
};

const TITLE = 3; // "LEVEL n" title card
const INTRO = 7;
const NEON = 8;
const END = 15;

// ---------------------------------------------------------------- timeline
let t = 0;
const scenes = [];
const add = (scene) => {
  scenes.push({ ...scene, start: +t.toFixed(3) });
  t += scene.length;
};
add({ id: "start", kind: "scene", length: 1.5 + vo.start.len + 1, voAt: 1.5 });
add({ id: "intro", kind: "video", src: "assets/intro.mp4", length: INTRO });
add({ id: "tower", kind: "scene", level: 1, title: "THE SCREEN-TIME TOWER", length: TITLE + vo.tower.len + 1.5, voAt: TITLE });
add({ id: "videoland", kind: "scene", level: 2, title: "ENDLESS VIDEO LAND", length: TITLE + vo.videoland.len + 3, voAt: TITLE });
add({ id: "neon", kind: "video", src: "assets/neon-kids.mp4", length: NEON });
add({ id: "boss", kind: "scene", level: 3, title: "BOSS FIGHT!", length: TITLE + vo.boss.len + 1.5, voAt: TITLE });
add({ id: "deal", kind: "scene", level: 4, title: "DEXTER'S DEAL", length: TITLE + vo.deal.len + 1, voAt: TITLE });
add({ id: "finale", kind: "scene", length: vo.finale.len + 3.5, voAt: 0.5 });
add({ id: "end", kind: "video", src: "assets/endscreen.mp4", length: END });
const TOTAL = +t.toFixed(3);
const at = (id) => scenes.find((s) => s.id === id);
const g = (id, phrase) => +(at(id).start + at(id).voAt + cue(id, phrase)).toFixed(2); // global cue time

// Sound-effect cues for the audio builder.
const sfx = [
  ["coin", 0.2], ["whoosh", at("start").start + at("start").length - 0.6],
  ...[1, 2, 3, 4].map((n) => ["levelup", at(["tower", "videoland", "boss", "deal"][n - 1]).start + 0.1]),
  ["boing", g("tower", "Floor one")], ["ding", g("tower", "About two")],
  ["boing", g("tower", "Floor two")], ["ding", g("tower", "More than three")],
  ["boing", g("tower", "Floor three")], ["ding", g("tower", "five and a half")],
  ["boing", g("tower", "And the top floor")], ["brass", g("tower", "Almost nine")],
  ["autoplay", g("videoland", "automatically")], ["rumble", g("videoland", "The Scroll Monster")],
  ["yoink", g("boss", "He steals dinner")], ["yoink", g("boss", "He steals sleep")], ["yoink", g("boss", "And he steals friends")],
  ["victory", g("boss", "Yoink!")], ["hoot", g("deal", "Professor Hoot")], ["card", g("deal", "win Special Cards")],
  ["fanfare", at("finale").start + 0.3], ["fireworks", at("finale").start + 1.2],
];
const voClips = scenes.filter((s) => s.voAt !== undefined).map((s) => ({ id: s.id, start: +(s.start + s.voAt).toFixed(3), len: vo[s.id].len }));
writeFileSync("timeline.json", JSON.stringify({ total: TOTAL, scenes, vo: voClips, sfx, moods: {
  start: "play", tower: "play", videoland: "villain", boss: "battle", deal: "warm", finale: "victory" } }, null, 2));

// Finale mission board: one row per spoken step (cue = phrase in the finale line).
const FINALE_STEPS = [
  ["🌐", "Open <b>dexty.live</b> · pick <b>Kids</b> · press <b>Start</b>"],
  ["🏠", "Walk <b>◀ ▶</b> to the house <b>Episode 1</b> · tap it"],
  ["📖", "<b>Bonus:</b> find the seal · type <b>SUN</b> ☀️"],
  ["🦉", "Answer <b>3 questions</b> · win the <b>Scroll Tamer</b>"],
  ["🎒", "Tap the <b>backpack</b> · see your <b>collection</b>"],
];
const FINALE_CUES = ["Step one", "Step two", "Step three", "Step four", "Step five"];

// ---------------------------------------------------------------- scene markup
const hud = (level) => `
  <div class="hud">
    <div class="xp"><b>XP</b><span class="xp-bar"><i class="xp-fill" data-level="${level}"></i></span></div>
    <div class="hearts">❤️ ❤️ ❤️</div>
    <div class="lvl">LEVEL ${level}/4</div>
  </div>`;
const titleCard = (s) => `<div class="title-card"><span class="tc-level">LEVEL ${s.level}</span><span class="tc-name">${s.title}</span></div>`;
// Each Daxter copy gets its own gradient ids so hidden scenes can't break visible ones.
const daxter = (cls = "") => {
  const svg = DAXTER_SVG.replace(/id="(daxter\w+)"/g, `id="$1-${cls}"`).replace(/url\(#(daxter\w+)\)/g, `url(#$1-${cls})`);
  return `<div class="dax ${cls}">${svg}</div>`;
};
const score = (cls, label, value) => `<div class="score ${cls}"><span>${label}</span><b>${value}</b></div>`;

const BODY = {
  start: () => `
    <div class="grid-floor"></div>
    <div class="phone-big">${art("phone")}</div>
    <div class="press-start">PRESS START</div>
    ${daxter("dax-start")}
    <div class="hello">Hi! I'm <b>DEXTER</b></div>
    <div class="question">My goal: turn your <b>screen time</b> into <b>brain time!</b></div>
    <div class="hint">✨ Watch for the glowing card with the <b>MAGIC WORD</b>! ✨</div>`,
  tower: (s) => `${hud(1)}${titleCard(s)}
    <div class="tower">${[0, 1, 2, 3].map((i) => `<div class="floor f${i}"><span>${["AGES 2–4", "AGES 5–8", "AGES 8–12", "TEENS"][i]}</span></div>`).join("")}</div>
    <div class="clock-art">${art("clocktower")}</div>
    ${daxter("dax-tower")}
    ${score("s0", "Ages 2–4", "≈ 2½ h")}${score("s1", "Ages 5–8", "3+ h")}${score("s2", "Ages 8–12", "5 h 33")}${score("s3", "Teens", "8 h 39")}
    <div class="source">Source: Common Sense Media Census 2020 & 2021 (U.S.)</div>`,
  videoland: (s) => `${hud(2)}${titleCard(s)}
    <div class="belt"><div class="belt-track">${Array.from({ length: 14 }, (_, i) => `<div class="thumb t${i % 4}">▶</div>`).join("")}</div></div>
    <div class="autoplay">AUTOPLAY ▶▶</div>
    <div class="monster">${art("monster")}</div>
    ${daxter("dax-land")}`,
  boss: (s) => `${hud(3)}${titleCard(s)}
    <div class="monster boss-monster">${art("monster")}</div>
    <div class="chests">${[["🍽️", "DINNER"], ["🌙", "SLEEP"], ["🤝", "FRIENDS"]].map(([icon, name], i) => `<div class="chest c${i}"><div class="chest-art">${icon}</div><b>${name}</b></div>`).join("")}</div>
    ${daxter("dax-boss")}
    <div class="who">Ages 2–5: <b>max 1 hour</b> of screens a day</div>
    <div class="word-banner">MAGIC WORD: <b>SUN</b> ☀️</div>
    <div class="source">Source: WHO 2019 · American Academy of Pediatrics</div>`,
  deal: (s) => `${hud(4)}${titleCard(s)}
    <div class="owl">${art("owl")}</div>
    <div class="road"><span class="house h0">🏠</span><span class="house h1">🏛️</span><span class="house h2">🌊</span><span class="house h3">⚡</span></div>
    <div class="deal-card">${art("phone")}<b>SPECIAL CARD</b></div>
    <div class="three">3 VIDEOS<br/><small>A DAY</small></div>
    ${daxter("dax-deal")}`,
  finale: () => `
    <div class="stamp">LEVEL COMPLETE!</div>
    <div class="fireworks">${Array.from({ length: 24 }, (_, i) => `<i class="fw fw${i % 6}" style="--a:${i * 15}deg"></i>`).join("")}</div>
    <div class="reward"><div class="reward-card">${art("phone")}<b>SCROLL TAMER</b><small>CARD #001</small></div></div>
    ${daxter("dax-finale")}
    <ol class="steps">${FINALE_STEPS.map(([icon, html], i) => `<li class="step st${i}"><span class="st-num">${i + 1}</span><span class="st-icon">${icon}</span><span class="st-text">${html}</span></li>`).join("")}</ol>
    <div class="url">🌐 dexty.live</div>`,
};

const sceneHtml = (s) => {
  if (s.kind === "video") {
    return `<video id="v-${s.id}" class="clip media" src="${s.src}" data-start="${s.start}" data-duration="${s.length}" data-track-index="1" data-has-audio="true" playsinline></video>`;
  }
  return `<section id="sc-${s.id}" class="clip scene bg-${s.id}" data-start="${s.start}" data-duration="${s.length.toFixed(3)}" data-track-index="0">${BODY[s.id](s)}</section>`;
};
const audioHtml = [
  `<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="5" data-volume="0.6"></audio>`,
  ...voClips.map((v) => `<audio id="vo-${v.id}" src="assets/vo/${v.id}.mp3" data-start="${v.start}" data-duration="${v.len.toFixed(3)}" data-track-index="6" data-volume="1"></audio>`),
].join("\n      ");

// ---------------------------------------------------------------- animation (GSAP, seek-safe)
const anim = (s) => {
  const S = s.start;
  const L = (id, phrase) => g(id, phrase);
  const common = s.level
    ? `tl.fromTo("#sc-${s.id} .title-card", {scale:0.3, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:"back.out(2)"}, ${S + 0.1});
       tl.to("#sc-${s.id} .title-card", {opacity:0, y:-60, duration:0.4}, ${S + TITLE - 0.5});
       tl.fromTo("#sc-${s.id} .xp-fill", {scaleX:${(s.level - 1) / 4}}, {scaleX:${s.level / 4}, duration:${s.length - 1}, ease:"none"}, ${S + 0.5});`
    : "";
  const per = {
    start: `
      tl.fromTo("#sc-start .press-start", {opacity:0}, {opacity:1, duration:0.25, yoyo:true, repeat:10}, ${S});
      tl.fromTo("#sc-start .phone-big", {y:300, rotation:-10}, {y:0, rotation:0, duration:1, ease:"back.out(1.6)"}, ${S + 0.2});
      tl.fromTo("#sc-start .dax-start", {x:-700}, {x:0, duration:1.2, ease:"power3.out"}, ${S + 1});
      ${startChoreography(S, (phrase) => L("start", phrase), s.length)}
      tl.fromTo("#sc-start .hello", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.6, ease:"back.out(2.5)"}, ${S + 1.6});
      tl.fromTo("#sc-start .question", {opacity:0, y:40}, {opacity:1, y:0, duration:0.6}, ${L("start", "My goal")});
      tl.to("#sc-start .question", {opacity:0, duration:0.4}, ${L("start", "And here's a secret")});
      tl.fromTo("#sc-start .hint", {opacity:0, scale:0.6}, {opacity:1, scale:1, duration:0.6, ease:"back.out(2)"}, ${L("start", "And here's a secret")});
      tl.to("#sc-${s.id}", {scale:1.6, opacity:0, duration:0.6, ease:"power2.in"}, ${S + s.length - 0.6});`,
    tower: `
      ${[0, 1, 2, 3].map((i) => {
        const when = L("tower", ["Floor one", "Floor two", "Floor three", "And the top floor"][i]);
        const num = L("tower", ["About two", "More than three", "five and a half", "Almost nine"][i]);
        return `tl.to("#sc-tower .dax-tower", {y:${-i * 150 - 40}, x:${i * 40}, duration:0.6, ease:"back.out(2.5)"}, ${when});
        tl.fromTo("#sc-tower .floor.f${i}", {backgroundColor:"#3a2a8a"}, {backgroundColor:"#ffd84a", duration:0.3}, ${when + 0.4});
        tl.fromTo("#sc-tower .score.s${i}", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.45, ease:"back.out(3)"}, ${num});`;
      }).join("\n")}
      tl.to("#sc-tower .clock-art", {rotation:4, duration:0.25, yoyo:true, repeat:7}, ${L("tower", "Almost nine")});`,
    videoland: `
      tl.fromTo("#sc-videoland .belt-track", {x:0}, {x:-2600, duration:${s.length}, ease:"none"}, ${S});
      tl.fromTo("#sc-videoland .autoplay", {opacity:0.2}, {opacity:1, duration:0.4, yoyo:true, repeat:${Math.floor(s.length / 0.8)}}, ${S + TITLE});
      tl.fromTo("#sc-videoland .dax-land", {x:-300}, {x:200, duration:2, ease:"power2.out"}, ${S + TITLE});
      tl.fromTo("#sc-videoland .monster", {y:700, scale:0.6}, {y:0, scale:1, duration:1.4, ease:"back.out(1.4)"}, ${L("videoland", "The Scroll Monster")} - 0.4);
      tl.fromTo("#sc-videoland", {x:0}, {x:16, duration:0.06, yoyo:true, repeat:15}, ${L("videoland", "The Scroll Monster")});
      tl.to("#sc-videoland .dax-land", {x:-120, rotation:-12, duration:0.4}, ${L("videoland", "The Scroll Monster")});`,
    boss: `
      tl.fromTo("#sc-boss .word-banner", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.6, ease:"back.out(2.5)"}, ${L("boss", "Sun!")});
      tl.to("#sc-boss .word-banner", {scale:0.6, opacity:0, duration:0.4}, ${L("boss", "Now… boss fight!")});
      tl.fromTo("#sc-boss .chests", {opacity:0}, {opacity:1, duration:0.5}, ${L("boss", "Now… boss fight!")});
      tl.fromTo("#sc-boss .boss-monster", {x:-500}, {x:0, duration:1, ease:"power2.out"}, ${L("boss", "Now… boss fight!")});
      tl.to("#sc-boss .boss-monster", {y:-20, duration:0.6, yoyo:true, repeat:${Math.floor(s.length / 1.2)}, ease:"sine.inOut"}, ${S + TITLE + 1});
      ${["He steals dinner", "He steals sleep", "And he steals friends"].map((p, i) => `tl.to("#sc-boss .chest.c${i}", {x:${-560 - i * 260}, y:-60, scale:0.55, rotation:-20, duration:0.7, ease:"power3.in"}, ${L("boss", p)});`).join("\n")}
      tl.fromTo("#sc-boss .who", {opacity:0, y:30}, {opacity:1, y:0, duration:0.5}, ${L("boss", "Doctors")});
      tl.to("#sc-boss .chest", {x:0, y:0, scale:1, rotation:0, duration:0.8, ease:"back.out(1.6)", stagger:0.15}, ${L("boss", "Yoink!")});
      tl.to("#sc-boss .dax-boss", {y:-120, rotation:360, duration:0.8, ease:"power2.out", yoyo:true, repeat:1}, ${L("boss", "Yoink!")});
      tl.to("#sc-boss .boss-monster", {x:-900, rotation:-30, opacity:0, duration:1}, ${L("boss", "Yoink!")} + 0.4);`,
    deal: `
      tl.fromTo("#sc-deal .owl", {x:900, y:-400, rotation:25}, {x:0, y:0, rotation:0, duration:1.4, ease:"power2.out"}, ${L("deal", "Professor Hoot")});
      tl.fromTo("#sc-deal .road", {opacity:0, y:60}, {opacity:1, y:0, duration:0.8}, ${L("deal", "the Road of Wonders")});
      tl.fromTo("#sc-deal .house", {scale:0}, {scale:1, duration:0.4, ease:"back.out(3)", stagger:0.2}, ${L("deal", "the Road of Wonders")} + 0.3);
      tl.fromTo("#sc-deal .deal-card", {rotationY:180, scale:0.5, opacity:0}, {rotationY:0, scale:1, opacity:1, duration:0.9, ease:"back.out(1.6)"}, ${L("deal", "win Special Cards")});
      tl.fromTo("#sc-deal .three", {scale:0, rotation:-20}, {scale:1, rotation:0, duration:0.6, ease:"back.out(3)"}, ${L("deal", "only three videos")});
      tl.to("#sc-deal .dax-deal", {y:-30, duration:0.4, yoyo:true, repeat:${Math.floor(s.length / 0.8)}, ease:"sine.inOut"}, ${S + TITLE});`,
    finale: `
      tl.fromTo("#sc-finale .stamp", {scale:3, opacity:0, rotation:-12}, {scale:1, opacity:1, rotation:-6, duration:0.5, ease:"back.out(2)"}, ${S + 0.3});
      tl.fromTo("#sc-finale .fw", {scale:0, opacity:1}, {scale:1, opacity:0, duration:1.4, stagger:0.04, ease:"power2.out"}, ${S + 1.2});
      tl.fromTo("#sc-finale .fw", {scale:0, opacity:1}, {scale:1.2, opacity:0, duration:1.4, stagger:0.04, ease:"power2.out", immediateRender:false}, ${S + 5});
      tl.to("#sc-finale .stamp", {scale:0.55, y:-40, duration:0.6, ease:"power2.inOut"}, ${L("finale", "Now listen")});
      tl.fromTo("#sc-finale .url", {opacity:0, scale:0.6}, {opacity:1, scale:1, duration:0.6, ease:"back.out(2)"}, ${L("finale", "dexty dot live")});
      ${FINALE_CUES.map((p, i) => `tl.fromTo("#sc-finale .st${i}", {opacity:0, x:200}, {opacity:1, x:0, duration:0.5, ease:"back.out(1.8)"}, ${L("finale", p)});
      tl.fromTo("#sc-finale .st${i}", {borderColor:"#ffffff", scale:1}, {borderColor:"#ffd84a", scale:1.04, duration:0.3}, ${L("finale", p)} + 0.3);
      ${i > 0 ? `tl.to("#sc-finale .st${i - 1}", {borderColor:"#ffffff", scale:1, opacity:0.75, duration:0.3}, ${L("finale", p)});` : ""}`).join("\n")}
      tl.fromTo("#sc-finale .st2 .st-text b", {color:"#ffd84a"}, {color:"#ffffff", duration:0.2, yoyo:true, repeat:5}, ${L("finale", "SUN!")});
      tl.fromTo("#sc-finale .reward-card", {rotationY:180, y:200, opacity:0}, {rotationY:0, y:0, opacity:1, duration:1, ease:"back.out(1.5)"}, ${L("finale", "the Scroll Tamer")});
      tl.to("#sc-finale .step", {opacity:1, duration:0.4}, ${L("finale", "Did you know that?")});
      tl.to("#sc-finale .dax-finale", {y:-60, duration:0.35, yoyo:true, repeat:${Math.floor(s.length / 0.7)}, ease:"sine.inOut"}, ${S + 0.5});`,
  };
  const talk = s.voAt === undefined ? "" : `tl.fromTo("#sc-${s.id} .daxter-mouth", {scaleY:1}, {scaleY:0.35, duration:0.11, yoyo:true, repeat:${Math.floor(vo[s.id].len / 0.22) * 2 - 1}, ease:"sine.inOut"}, ${S + s.voAt});`;
  return common + (per[s.id] ?? "") + talk;
};

const css = readFileSync("scenes.css", "utf8");
const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Did You Know That? · Ep 1 Kids · The Scroll Monster</title>
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
      ${scenes.filter((s) => s.kind === "scene").map(anim).join("\n")}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync("index.html", html);
console.log(`total ${TOTAL.toFixed(1)}s · neon card at ${at("neon").start.toFixed(1)}s · ${scenes.length} scenes · ${sfx.length} sfx cues`);
