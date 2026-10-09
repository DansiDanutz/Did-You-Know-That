// Dexter acts out every sentence of his opening monologue (no idle loops):
// runs in, waves, points at the viewer, thinks, shrugs, strikes a superhero
// pose, lights up with an idea, points at the phone, whispers a secret,
// spins for the bonus and runs off. Seek-safe GSAP, cued to the narration.
//
// Pivots are in Dexter's SVG coordinates (viewBox 160×220):
// shoulders (46,120) back / (112,120) front, hips (69,162) / (91,162), neck (80,105).

const PART = (part) => `#sc-start .dax-start .daxter-${part}`;
const FRONT_ARM = { sel: PART("arm-front"), origin: "112.5 120" };
const BACK_ARM = { sel: PART("arm-back"), origin: "46.5 120" };
const FRONT_LEG = { sel: PART("leg-front"), origin: "91 162" };
const BACK_LEG = { sel: PART("leg-back"), origin: "69 162" };
const HEAD = { sel: PART("head"), origin: "80 105" };
const ROOT = "#sc-start .dax-start";
const BLINK_EVERY = 3.7;

const pose = (limb, rotation, at, duration = 0.35, ease = "back.out(2)") =>
  `tl.to("${limb.sel}", {rotation:${rotation}, svgOrigin:"${limb.origin}", duration:${duration}, ease:"${ease}"}, ${at.toFixed(2)});`;

// Arm (front arm by default) waves `times` times around `angle`.
const wave = (at, times = 3, limb = FRONT_ARM, angle = -150) => [
  pose(limb, angle, at, 0.25),
  `tl.to("${limb.sel}", {rotation:${angle + 30}, svgOrigin:"${limb.origin}", duration:0.18, yoyo:true, repeat:${times * 2 - 1}, ease:"sine.inOut"}, ${(at + 0.25).toFixed(2)});`,
];

const runCycle = (at, duration) => {
  const steps = 2 * Math.max(1, Math.round(duration / 0.32)) - 1; // odd: every cycle ends at rest
  return [
    `tl.fromTo("${FRONT_LEG.sel}", {rotation:-28, svgOrigin:"${FRONT_LEG.origin}"}, {rotation:28, svgOrigin:"${FRONT_LEG.origin}", duration:0.16, yoyo:true, repeat:${steps}, ease:"sine.inOut"}, ${at.toFixed(2)});`,
    `tl.fromTo("${BACK_LEG.sel}", {rotation:28, svgOrigin:"${BACK_LEG.origin}"}, {rotation:-28, svgOrigin:"${BACK_LEG.origin}", duration:0.16, yoyo:true, repeat:${steps}, ease:"sine.inOut"}, ${at.toFixed(2)});`,
    `tl.fromTo("${FRONT_ARM.sel}", {rotation:30, svgOrigin:"${FRONT_ARM.origin}"}, {rotation:-30, svgOrigin:"${FRONT_ARM.origin}", duration:0.16, yoyo:true, repeat:${steps}, ease:"sine.inOut"}, ${at.toFixed(2)});`,
    `tl.fromTo("${BACK_ARM.sel}", {rotation:-30, svgOrigin:"${BACK_ARM.origin}"}, {rotation:30, svgOrigin:"${BACK_ARM.origin}", duration:0.16, yoyo:true, repeat:${steps}, ease:"sine.inOut"}, ${at.toFixed(2)});`,
    `tl.to("${ROOT}", {y:-14, duration:0.16, yoyo:true, repeat:${steps}, ease:"sine.inOut"}, ${at.toFixed(2)});`,
  ];
};

const rest = (at) => [pose(FRONT_ARM, 0, at), pose(BACK_ARM, 0, at), pose(FRONT_LEG, 0, at, 0.2), pose(BACK_LEG, 0, at, 0.2), pose(HEAD, 0, at)];

const jump = (at, height = 120, spin = 0) =>
  `tl.to("${ROOT}", {y:-${height}, rotation:${spin}, duration:0.35, ease:"power2.out"}, ${at.toFixed(2)}); tl.to("${ROOT}", {y:0, duration:0.3, ease:"bounce.out"}, ${(at + 0.35).toFixed(2)});`;

const look = (x, y, at) => `tl.to("${PART("pupils")}", {x:${x}, y:${y}, duration:0.2}, ${at.toFixed(2)});`;
const brows = (y, at) => `tl.to("${PART("brows")}", {y:${y}, duration:0.2}, ${at.toFixed(2)});`;
const glow = (scale, at, duration = 0.4) =>
  `tl.to("${PART("halo")}", {scale:${scale}, svgOrigin:"80 58", opacity:1, duration:${duration}, ease:"power2.out"}, ${at.toFixed(2)});`;

const blinks = (from, to) => {
  const lines = [];
  for (let at = from; at < to; at += BLINK_EVERY) {
    lines.push(`tl.to("${PART("lids")} ellipse", {attr:{ry:13, cy:62}, duration:0.07, yoyo:true, repeat:1}, ${at.toFixed(2)});`);
  }
  return lines;
};

export function startChoreography(S, cue, length) {
  const end = S + length;
  return [
    // runs in from the left, then a big hello wave with the bulb flashing
    ...runCycle(S + 1, 1.2),
    ...rest(S + 2.2),
    ...wave(Math.max(cue("Hi! I'm Dexter"), S + 2.4), 4),
    glow(1.35, cue("the brightest lightbulb")),
    glow(1, cue("the brightest lightbulb") + 0.6),
    jump(cue("the brightest lightbulb") + 0.2, 70),
    // "And you?": points straight at the viewer and leans in
    pose(FRONT_ARM, -95, cue("And you?"), 0.3),
    `tl.to("${ROOT}", {scale:1.12, duration:0.4, ease:"back.out(2)"}, ${cue("And you?").toFixed(2)});`,
    brows(-6, cue("And you?")),
    `tl.to("${ROOT}", {scale:1, duration:0.4}, ${(cue("My goal") - 0.3).toFixed(2)});`,
    // "My goal": hand to chin, thinking, eyes up
    pose(FRONT_ARM, 0, cue("My goal") - 0.3),
    pose(BACK_ARM, 165, cue("My goal"), 0.4),
    look(0, -4, cue("My goal")),
    pose(HEAD, -8, cue("My goal")),
    brows(0, cue("My goal")),
    // "brain time": taps his head and the bulb glows
    glow(1.3, cue("brain time")),
    glow(1, cue("brain time") + 0.8),
    look(0, 0, cue("brain time")),
    // "Did you know that nobody…": big shrug, shaking his head
    pose(BACK_ARM, 70, cue("Did you know that nobody"), 0.3),
    pose(FRONT_ARM, -70, cue("Did you know that nobody"), 0.3),
    `tl.to("${HEAD.sel}", {rotation:8, svgOrigin:"${HEAD.origin}", duration:0.2, yoyo:true, repeat:5, ease:"sine.inOut"}, ${cue("not your parents").toFixed(2)});`,
    // "not even superheroes": superhero pose with both arms up and a jump
    pose(BACK_ARM, 165, cue("not even superheroes"), 0.25),
    pose(FRONT_ARM, -165, cue("not even superheroes"), 0.25),
    jump(cue("not even superheroes"), 110),
    // "can stop kids from scrolling?": arms out again, eyebrows up
    pose(BACK_ARM, 60, cue("can stop kids"), 0.3),
    pose(FRONT_ARM, -60, cue("can stop kids"), 0.3),
    brows(-8, cue("can stop kids")),
    // "So I had a crazy idea": lights up and jumps with a finger up
    ...rest(cue("So I had a crazy idea") - 0.2),
    brows(0, cue("So I had a crazy idea")),
    glow(1.6, cue("crazy idea"), 0.3),
    pose(FRONT_ARM, -170, cue("crazy idea"), 0.25),
    jump(cue("crazy idea"), 140),
    glow(1, cue("crazy idea") + 1),
    // "what if we made your scrolling smart?": walks toward the phone and points at it
    look(5, 0, cue("What if we didn't stop you")),
    ...runCycle(cue("What if we didn't stop you"), 0.9),
    `tl.to("${ROOT}", {x:260, duration:0.9, ease:"power1.inOut"}, ${cue("What if we didn't stop you").toFixed(2)});`,
    ...rest(cue("What if we didn't stop you") + 0.9),
    pose(FRONT_ARM, -95, cue("made your scrolling smart"), 0.3),
    // "And here's a secret": crouches, hand to his mouth, looks around
    pose(FRONT_ARM, 0, cue("And here's a secret") - 0.2),
    `tl.to("${ROOT}", {scaleY:0.9, y:20, duration:0.3}, ${cue("And here's a secret").toFixed(2)});`,
    pose(BACK_ARM, 150, cue("And here's a secret"), 0.3),
    look(-5, 0, cue("And here's a secret")),
    look(5, 0, cue("just for you")),
    look(0, 0, cue("somewhere in this video")),
    // "somewhere in this video, a glowing card…": stands tall, both arms up in wonder
    `tl.to("${ROOT}", {scaleY:1, y:0, duration:0.3, ease:"back.out(2)"}, ${cue("somewhere in this video").toFixed(2)});`,
    pose(BACK_ARM, 140, cue("a glowing card"), 0.3),
    pose(FRONT_ARM, -140, cue("a glowing card"), 0.3),
    glow(1.4, cue("magic word")),
    glow(1, cue("magic word") + 0.8),
    // "Watch for it": hands around his glasses like binoculars
    pose(BACK_ARM, 175, cue("Watch for it"), 0.3),
    pose(FRONT_ARM, -175, cue("Watch for it"), 0.3),
    `tl.to("${ROOT}", {scale:1.08, duration:0.3}, ${cue("Watch for it").toFixed(2)});`,
    `tl.to("${ROOT}", {scale:1, duration:0.3}, ${cue("It's a bonus").toFixed(2)});`,
    // "It's a bonus": a happy spin in the air
    ...rest(cue("It's a bonus")),
    jump(cue("a secret surprise"), 130, 360),
    // "Ready, explorer?": thumbs up, then runs off to the right
    ...wave(cue("Ready, explorer?"), 1),
    look(5, 0, cue("Let's go!")),
    ...runCycle(cue("Let's go!"), end - cue("Let's go!") - 0.2),
    `tl.to("${ROOT}", {x:1500, duration:${(end - cue("Let's go!") - 0.2).toFixed(2)}, ease:"power2.in"}, ${cue("Let's go!").toFixed(2)});`,
    ...blinks(S + 2.5, end - 1),
  ].join("\n      ");
}
