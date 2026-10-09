// Original 2D character rig for "The Little Things That Make a Family":
// Emma (7), Leo (4), Mom and Dad as simple, warm vector puppets with a head,
// brows, eyes, mouth, two arms and legs, animated seek-safely with GSAP.
// Coordinates: a character is drawn in a 200×300 box, feet at y=300, neck at
// (100,150), shoulders at (62,170) and (138,170).

const MOUTH = {
  happy: "M86 118 q14 16 28 0",
  big: "M82 114 q18 24 36 0 q-18 10 -36 0Z",
  sad: "M86 124 q14 -12 28 0",
  angry: "M86 122 q14 -4 28 0",
  neutral: "M88 120 q12 5 24 0",
  surprised: "M92 112 q8 -10 16 0 q-8 16 -16 0Z",
};
export const MOUTHS = MOUTH;

const HAIR = {
  emma: (c) => `<path d="M62 102 q8 -58 48 -56 q36 2 40 50 q-6 -16 -22 -22 q-22 10 -46 4 q-14 8 -20 24Z" fill="${c}"/><path d="M52 110 q-10 40 4 70 q10 -30 14 -60Z" fill="${c}"/><path d="M148 110 q10 40 -4 70 q-10 -30 -14 -60Z" fill="${c}"/>`,
  leo: (c) => `<path d="M60 104 q6 -52 44 -52 q38 0 44 50 q-12 -18 -30 -14 q-14 -12 -28 0 q-16 -4 -30 16Z" fill="${c}"/><circle cx="66" cy="96" r="10" fill="${c}"/><circle cx="134" cy="96" r="10" fill="${c}"/><circle cx="100" cy="52" r="11" fill="${c}"/>`,
  mom: (c) => `<path d="M60 104 q6 -54 40 -56 q38 0 44 54 q-10 -22 -28 -24 q-24 6 -36 0 q-14 6 -20 26Z" fill="${c}"/><circle cx="100" cy="46" r="20" fill="${c}"/>`,
  dad: (c) => `<path d="M62 100 q8 -42 38 -44 q36 0 42 44 q-12 -12 -26 -12 q-16 -8 -30 0 q-12 -2 -24 12Z" fill="${c}"/>`,
};
const EXTRA = {
  dad: `<path d="M78 128 q22 20 44 0 q-6 20 -22 22 q-16 -2 -22 -22Z" fill="#6b4a2a" opacity=".85"/><circle cx="84" cy="100" r="13" fill="none" stroke="#3a2412" stroke-width="3"/><circle cx="116" cy="100" r="13" fill="none" stroke="#3a2412" stroke-width="3"/><path d="M97 100 h6" stroke="#3a2412" stroke-width="3"/>`,
  mom: `<circle cx="70" cy="114" r="4" fill="#ff8fc7" opacity=".7"/><circle cx="130" cy="114" r="4" fill="#ff8fc7" opacity=".7"/>`,
  emma: `<circle cx="70" cy="114" r="5" fill="#ff8fc7" opacity=".6"/><circle cx="130" cy="114" r="5" fill="#ff8fc7" opacity=".6"/><circle cx="58" cy="70" r="7" fill="#ffd84a"/>`,
  leo: `<circle cx="70" cy="114" r="5" fill="#ff8fc7" opacity=".6"/><circle cx="130" cy="114" r="5" fill="#ff8fc7" opacity=".6"/>`,
};

export const CAST = {
  emma: { skin: "#ffd9b3", hair: "#8a4a1a", shirt: "#ff8fc7", pants: "#5b4fcf", scale: 1.6 },
  leo: { skin: "#ffd9b3", hair: "#3a2412", shirt: "#ffd84a", pants: "#3d7bff", scale: 1.2 },
  mom: { skin: "#f1c9a5", hair: "#5a3a1a", shirt: "#3ee07a", pants: "#2a1470", scale: 1.95 },
  dad: { skin: "#e8b990", hair: "#3a2412", shirt: "#3d7bff", pants: "#4a3a2a", scale: 2.05 },
};

// A character at (x, y) = feet position, facing right (flip to face left).
export function character(id, { x, y, scale = 1, flip = false, mood = "happy", prop = "" } = {}) {
  const c = CAST[id];
  const s = scale * c.scale;
  return `
  <g class="ch-pos ch-pos-${id}" transform="translate(${x} ${y})"><g class="ch-bob"><g class="ch ch-${id}" transform="scale(${flip ? -s : s} ${s}) translate(-100 -300)">
    <g class="ch-legs"><rect x="76" y="226" width="20" height="74" rx="8" fill="${c.pants}"/><rect x="104" y="226" width="20" height="74" rx="8" fill="${c.pants}"/><rect x="70" y="288" width="30" height="14" rx="6" fill="#3a2412"/><rect x="100" y="288" width="30" height="14" rx="6" fill="#3a2412"/></g>
    <g class="ch-arm ch-arm-l" style="transform-box: fill-box; transform-origin: 50% 8%;"><rect x="48" y="166" width="22" height="78" rx="11" fill="${c.shirt}"/><circle cx="59" cy="244" r="12" fill="${c.skin}"/></g>
    <rect class="ch-body" x="62" y="156" width="76" height="86" rx="22" fill="${c.shirt}" stroke="#3a2412" stroke-width="3"/>
    <g class="ch-arm ch-arm-r" style="transform-box: fill-box; transform-origin: 50% 8%;"><rect x="130" y="166" width="22" height="78" rx="11" fill="${c.shirt}"/><circle cx="141" cy="244" r="12" fill="${c.skin}"/>${prop}</g>
    <g class="ch-head" style="transform-box: fill-box; transform-origin: 50% 92%;">
      <rect x="92" y="138" width="16" height="22" fill="${c.skin}"/>
      <circle cx="100" cy="104" r="48" fill="${c.skin}" stroke="#3a2412" stroke-width="3"/>
      ${HAIR[id](c.hair)}
      ${EXTRA[id] ?? ""}
      <g class="ch-brows" stroke="#3a2412" stroke-width="4" stroke-linecap="round" fill="none"><path d="M76 86 q8 -6 16 0"/><path d="M108 86 q8 -6 16 0"/></g>
      <g class="ch-eyes"><circle cx="84" cy="100" r="5" fill="#3a2412"/><circle cx="116" cy="100" r="5" fill="#3a2412"/></g>
      <g class="ch-lids" fill="${c.skin}"><ellipse cx="84" cy="94" rx="7" ry="0"/><ellipse cx="116" cy="94" rx="7" ry="0"/></g>
      <path class="ch-mouth" d="${MOUTH[mood]}" fill="#7a1f12" stroke="#3a2412" stroke-width="3" stroke-linecap="round" style="transform-box: fill-box; transform-origin: 50% 0%;"/>
    </g>
  </g></g></g>`;
}

// Animation helpers bound to one character inside one scene (selectors).
export function actor(scene, id) {
  const root = `#sc-${scene} .ch-pos-${id}`;
  const f = (n) => Number(n).toFixed(2);
  return {
    root,
    mouth: (shape, at) => `tl.set("${root} .ch-mouth", {attr:{d:"${MOUTH[shape]}"}}, ${f(at)});`,
    talk: (at, len) => `tl.fromTo("${root} .ch-mouth", {scaleY:1}, {scaleY:0.3, duration:0.1, yoyo:true, repeat:${Math.max(1, Math.floor(len / 0.2) * 2 - 1)}, ease:"sine.inOut", immediateRender:false}, ${f(at)});
      tl.to("${root} .ch-head", {rotation:2, duration:0.35, yoyo:true, repeat:${Math.max(1, Math.floor(len / 0.7) * 2 - 1)}, ease:"sine.inOut"}, ${f(at)});`,
    brows: (dy, at, tilt = 0) => `tl.to("${root} .ch-brows", {y:${dy}, rotation:${tilt}, duration:0.25}, ${f(at)});`,
    arm: (side, rot, at, dur = 0.4) => `tl.to("${root} .ch-arm-${side}", {rotation:${rot}, duration:${dur}, ease:"back.out(1.6)"}, ${f(at)});`,
    head: (rot, at) => `tl.to("${root} .ch-head", {rotation:${rot}, duration:0.3}, ${f(at)});`,
    look: (dx, dy, at) => `tl.to("${root} .ch-eyes", {x:${dx}, y:${dy}, duration:0.2}, ${f(at)});`,
    move: (x, at, dur, ease = "power1.inOut") => `tl.to("${root}", {x:${x}, duration:${dur}, ease:"${ease}"}, ${f(at)});`,
    walk: (at, dur) => {
      const steps = 2 * Math.max(1, Math.round(dur / 0.3)) - 1;
      return `tl.to("${root} .ch-legs", {rotation:6, svgOrigin:"100 226", duration:0.15, yoyo:true, repeat:${steps}, ease:"sine.inOut"}, ${f(at)});
      tl.fromTo("${root} .ch-bob", {y:0}, {y:-8, duration:0.15, yoyo:true, repeat:${steps}, ease:"sine.inOut", immediateRender:false}, ${f(at)});`;
    },
    hop: (at, h = 40) => `tl.fromTo("${root} .ch-bob", {y:0}, {y:-${h}, duration:0.22, ease:"power2.out", immediateRender:false}, ${f(at)}); tl.to("${root} .ch-bob", {y:0, duration:0.22, ease:"bounce.out"}, ${f(at + 0.22)});`,
    slump: (at) => `tl.to("${root} .ch-head", {rotation:-10, y:8, duration:0.5}, ${f(at)}); tl.to("${root} .ch-arm-l, ${root} .ch-arm-r", {rotation:0, duration:0.5}, ${f(at)});`,
    kneel: (at) => `tl.to("${root}", {scaleY:0.78, duration:0.5, ease:"power2.inOut"}, ${f(at)});`,
    unkneel: (at) => `tl.to("${root}", {scaleY:1, duration:0.5, ease:"power2.inOut"}, ${f(at)});`,
    blink: (at) => `tl.to("${root} .ch-lids ellipse", {attr:{ry:7}, duration:0.07, yoyo:true, repeat:1}, ${f(at)});`,
    blinks: (from, to, every = 3.3) => { const out = []; for (let t = from; t < to; t += every) out.push(`tl.to("${root} .ch-lids ellipse", {attr:{ry:7}, duration:0.07, yoyo:true, repeat:1}, ${f(t)});`); return out.join("\n"); },
    shake: (at) => `tl.to("${root} .ch-head", {rotation:6, duration:0.12, yoyo:true, repeat:5, ease:"sine.inOut"}, ${f(at)});`,
    nod: (at) => `tl.to("${root} .ch-head", {y:6, duration:0.16, yoyo:true, repeat:3, ease:"sine.inOut"}, ${f(at)});`,
  };
}
