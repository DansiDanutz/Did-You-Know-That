// Dexter's acting toolkit: a rig bound to one scene's Dexter copy. Every
// helper returns seek-safe GSAP lines cued to the narration (no idle loops).
//
// Pivots are in Dexter's SVG coordinates (viewBox 160×220):
// shoulders (46,120) back / (112,120) front, hips (69,162) / (91,162), neck (80,105).

const BLINK_EVERY = 3.7;

export function rig(root) {
  const PART = (part) => `${root} .daxter-${part}`;
  const FRONT_ARM = { sel: PART("arm-front"), origin: "112.5 120" };
  const BACK_ARM = { sel: PART("arm-back"), origin: "46.5 120" };
  const FRONT_LEG = { sel: PART("leg-front"), origin: "91 162" };
  const BACK_LEG = { sel: PART("leg-back"), origin: "69 162" };
  const HEAD = { sel: PART("head"), origin: "80 105" };
  const f = (n) => Number(n).toFixed(2);

  const pose = (limb, rotation, at, duration = 0.35, ease = "back.out(2)") =>
    `tl.to("${limb.sel}", {rotation:${rotation}, svgOrigin:"${limb.origin}", duration:${duration}, ease:"${ease}"}, ${f(at)});`;

  // Arm (front arm by default) waves `times` times around `angle`.
  const wave = (at, times = 3, limb = FRONT_ARM, angle = -150) => [
    pose(limb, angle, at, 0.25),
    `tl.to("${limb.sel}", {rotation:${angle + 30}, svgOrigin:"${limb.origin}", duration:0.18, yoyo:true, repeat:${times * 2 - 1}, ease:"sine.inOut"}, ${f(at + 0.25)});`,
  ];

  const runCycle = (at, duration) => {
    const steps = 2 * Math.max(1, Math.round(duration / 0.32)) - 1; // odd: every cycle ends at rest
    const swing = (limb, from, to) =>
      `tl.fromTo("${limb.sel}", {rotation:${from}, svgOrigin:"${limb.origin}"}, {rotation:${to}, svgOrigin:"${limb.origin}", duration:0.16, yoyo:true, repeat:${steps}, ease:"sine.inOut", immediateRender:false}, ${f(at)});`;
    return [
      swing(FRONT_LEG, -28, 28),
      swing(BACK_LEG, 28, -28),
      swing(FRONT_ARM, 30, -30),
      swing(BACK_ARM, -30, 30),
      `tl.to("${root}", {y:"-=14", duration:0.16, yoyo:true, repeat:${steps}, ease:"sine.inOut"}, ${f(at)});`,
    ];
  };

  const rest = (at) => [pose(FRONT_ARM, 0, at), pose(BACK_ARM, 0, at), pose(FRONT_LEG, 0, at, 0.2), pose(BACK_LEG, 0, at, 0.2), pose(HEAD, 0, at)];

  const jump = (at, height = 120, spin = 0) =>
    `tl.to("${root}", {y:-${height}, rotation:${spin}, duration:0.35, ease:"power2.out"}, ${f(at)}); tl.to("${root}", {y:0, rotation:${spin}, duration:0.3, ease:"bounce.out"}, ${f(at + 0.35)});`;

  const look = (x, y, at) => `tl.to("${PART("pupils")}", {x:${x}, y:${y}, duration:0.2}, ${f(at)});`;
  const brows = (y, at) => `tl.to("${PART("brows")}", {y:${y}, duration:0.2}, ${f(at)});`;
  const glow = (scale, at, duration = 0.4) =>
    `tl.to("${PART("halo")}", {scale:${scale}, svgOrigin:"80 58", opacity:1, duration:${duration}, ease:"power2.out"}, ${f(at)});`;
  const headShake = (at, times = 3, deg = 8) =>
    `tl.to("${HEAD.sel}", {rotation:${deg}, svgOrigin:"${HEAD.origin}", duration:0.2, yoyo:true, repeat:${times * 2 - 1}, ease:"sine.inOut"}, ${f(at)});`;
  const nod = (at, times = 2) =>
    `tl.to("${HEAD.sel}", {y:6, duration:0.18, yoyo:true, repeat:${times * 2 - 1}, ease:"sine.inOut"}, ${f(at)});`;
  // Dexter slides down "like jelly": squashes and sinks.
  const melt = (at) => [
    `tl.to("${root}", {scaleY:0.55, scaleX:1.25, y:140, rotation:-6, duration:0.9, ease:"power2.in"}, ${f(at)});`,
    pose(FRONT_ARM, -40, at, 0.8, "power2.in"),
    pose(BACK_ARM, 40, at, 0.8, "power2.in"),
    brows(6, at),
  ];
  const unmelt = (at) => `tl.to("${root}", {scaleY:1, scaleX:1, y:0, rotation:0, duration:0.5, ease:"back.out(2)"}, ${f(at)});`;
  const shrug = (at) => [pose(BACK_ARM, 70, at, 0.3), pose(FRONT_ARM, -70, at, 0.3), brows(-6, at)];
  const chin = (at) => [pose(FRONT_ARM, 0, at), pose(BACK_ARM, 165, at, 0.4), look(0, -4, at), pose(HEAD, -8, at)];
  const pointAt = (at, angle = -95) => pose(FRONT_ARM, angle, at, 0.3);
  const hero = (at) => [pose(BACK_ARM, 165, at, 0.25), pose(FRONT_ARM, -165, at, 0.25), jump(at, 100)];
  const mouth = (at, len) =>
    `tl.fromTo("${PART("mouth")}", {scaleY:1}, {scaleY:0.35, duration:0.11, yoyo:true, repeat:${Math.floor(len / 0.22) * 2 - 1}, ease:"sine.inOut", immediateRender:false}, ${f(at)});`;

  const blinks = (from, to) => {
    const lines = [];
    for (let at = from; at < to; at += BLINK_EVERY) {
      lines.push(`tl.to("${PART("lids")} ellipse", {attr:{ry:13, cy:62}, duration:0.07, yoyo:true, repeat:1}, ${f(at)});`);
    }
    return lines;
  };

  return { PART, FRONT_ARM, BACK_ARM, HEAD, pose, wave, runCycle, rest, jump, look, brows, glow, headShake, nod, melt, unmelt, shrug, chin, pointAt, hero, mouth, blinks };
}
