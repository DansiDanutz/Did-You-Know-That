// Painted cut-out puppets: generated character sprites (assets/art/<who>-<pose>.png,
// manifest from tools/make_sprites.py) with three poses that cross-fade, a
// painted-look mouth overlay for lip-sync, and the same seek-safe GSAP acting
// vocabulary the earlier vector rig used, so build.mjs's beats stay valid.
import { readFileSync } from "node:fs";

const MANIFEST = JSON.parse(readFileSync(new URL("assets/art/manifest.json", import.meta.url), "utf8"));
export const POSES = ["neutral", "happy", "sad"];
// Mouth shapes in a 60×40 box centred on the mouth (skin patch behind them).
const MOUTH = {
  neutral: "M-14 0 q14 5 28 0",
  happy: "M-16 -2 q16 16 32 0",
  big: "M-18 -4 q18 24 36 0 q-18 10 -36 0Z",
  sad: "M-14 4 q14 -12 28 0",
  angry: "M-14 2 q14 -4 28 0",
  surprised: "M-9 -6 q9 -8 18 0 q-9 18 -18 0Z",
};
export const MOUTHS = MOUTH;

export const sprite = (who, pose) => MANIFEST[`${who}-${pose}`] ?? MANIFEST[`${who}-neutral`];

// A puppet standing with its feet at (x, y), `height` px tall on the 1920×1080 stage.
export function character(id, { x, y, height, flip = false, mood = "neutral", pose = "neutral" }) {
  const base = sprite(id, "neutral");
  const s = height / base.height;
  const layers = POSES.map((p) => {
    const info = sprite(id, p);
    const ps = height / info.height; // every pose is scaled to the same standing height
    return `<image class="pose pose-${p}" href="assets/art/${info.file}" x="${-(info.width * ps) / 2}" y="${-height}" width="${info.width * ps}" height="${height}" opacity="${p === pose ? 1 : 0}"/>`;
  }).join("");
  const [mx, my] = base.mouth;
  const mouthX = (mx - base.width / 2) * s, mouthY = (my - base.height) * s;
  const ms = Math.max(0.55, height / 520); // mouth overlay scale with the puppet
  return `
  <g class="ch-pos ch-pos-${id}" transform="translate(${x} ${y})"><g class="ch-bob"><g class="ch-flip" transform="scale(${flip ? -1 : 1} 1)"><g class="ch ch-${id}">
    ${layers}
    <g class="ch-mouthbox" transform="translate(${mouthX} ${mouthY}) scale(${ms})">
      <ellipse rx="26" ry="15" fill="${base.skin}" opacity="0.96"/>
      <path class="ch-mouth" d="${MOUTH[mood]}" fill="#7a1f12" stroke="#3a2412" stroke-width="2.4" stroke-linecap="round" style="transform-box: fill-box; transform-origin: 50% 0%;"/>
    </g>
  </g></g></g></g>`;
}

export function actor(scene, id) {
  const root = `#sc-${scene} .ch-pos-${id}`;
  const f = (n) => Number(n).toFixed(2);
  const pose = (p, at, dur = 0.25) => POSES.map((q) => `tl.to("${root} .pose-${q}", {opacity:${q === p ? 1 : 0}, duration:${dur}}, ${f(at)});`).join("\n");
  const steps = (dur) => 2 * Math.max(1, Math.round(dur / 0.3)) - 1;
  return {
    root,
    mouth: (shape, at) => `tl.set("${root} .ch-mouth", {attr:{d:"${MOUTH[shape] ?? MOUTH.neutral}"}}, ${f(at)});`,
    talk: (at, len) => `tl.fromTo("${root} .ch-mouth", {scaleY:1}, {scaleY:0.3, duration:0.1, yoyo:true, repeat:${Math.max(1, Math.floor(len / 0.2) * 2 - 1)}, ease:"sine.inOut", immediateRender:false}, ${f(at)});
      tl.to("${root} .ch", {rotation:1.5, svgOrigin:"0 0", duration:0.35, yoyo:true, repeat:${Math.max(1, Math.floor(len / 0.7) * 2 - 1)}, ease:"sine.inOut"}, ${f(at)});`,
    pose,
    // vocabulary kept from the vector rig: arms up → happy pose, slump → sad pose
    arm: (side, rot, at) => (Math.abs(rot) >= 90 ? pose("happy", at) : Math.abs(rot) <= 40 ? pose("neutral", at) : ""),
    brows: () => "",
    look: () => "",
    head: (rot, at) => `tl.to("${root} .ch", {rotation:${rot / 2}, svgOrigin:"0 0", duration:0.3}, ${f(at)});`,
    move: (x, at, dur, ease = "power1.inOut") => `tl.to("${root}", {x:${x}, duration:${dur}, ease:"${ease}"}, ${f(at)});`,
    walk: (at, dur) => `tl.fromTo("${root} .ch-bob", {y:0}, {y:-10, duration:0.15, yoyo:true, repeat:${steps(dur)}, ease:"sine.inOut", immediateRender:false}, ${f(at)});
      tl.to("${root} .ch", {rotation:3, svgOrigin:"0 0", duration:0.15, yoyo:true, repeat:${steps(dur)}, ease:"sine.inOut"}, ${f(at)});`,
    hop: (at, h = 40) => `tl.fromTo("${root} .ch-bob", {y:0}, {y:-${h}, duration:0.22, ease:"power2.out", immediateRender:false}, ${f(at)}); tl.to("${root} .ch-bob", {y:0, duration:0.22, ease:"bounce.out"}, ${f(at + 0.22)});`,
    slump: (at) => pose("sad", at, 0.5),
    kneel: (at) => `tl.to("${root}", {scaleY:0.82, duration:0.5, ease:"power2.inOut"}, ${f(at)});`,
    unkneel: (at) => `tl.to("${root}", {scaleY:1, duration:0.5, ease:"power2.inOut"}, ${f(at)});`,
    blink: () => "",
    blinks: () => "",
    shake: (at) => `tl.to("${root} .ch", {rotation:4, svgOrigin:"0 0", duration:0.12, yoyo:true, repeat:5, ease:"sine.inOut"}, ${f(at)});`,
    nod: (at) => `tl.fromTo("${root} .ch-bob", {y:0}, {y:6, duration:0.16, yoyo:true, repeat:3, ease:"sine.inOut", immediateRender:false}, ${f(at)});`,
  };
}
