// Episode 1 · The House of Family. Meeting Dexter, the world, the cottage, the
// television with its storybook, the
// five scene challenges with supportive retries, the Heart of Kindness, the
// kindness mission and the way out. Touch-first, voiced, nothing shames a child.
// Content: js/data/family-episode.js. English pilot.

import { LINES, CHALLENGES, STORYBOOK } from "../data/family-episode.js";
import { DAXTER_SVG } from "./character.js";

const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Dexter's line with the child's name where the brief uses it (only on the device).
const EXTRA = Object.freeze({
  ...Object.fromEntries(CHALLENGES.flatMap((c) => [[`${c.id}-prompt`, c.prompt], [`${c.id}-right`, c.right], [`${c.id}-wrong`, c.wrong]])),
  ...Object.fromEntries(STORYBOOK.scenes.map((sc) => [`story-${sc.id}`, sc.heading])),
});
const say = (id, name) => {
  const text = LINES[id] ?? EXTRA[id];
  if (!name) return text;
  const named = { "world-1": `${name}, look at this beautiful place! This is our Adventure World!`, "arrive-1": `${name}, we've arrived at our first house! This is the House of Family.`, "tv-1": `Look, ${name}! There's a television! I have a very special story for you. It's about a family, two children, and something really important.`, "after-1": `Wow, ${name}! That was such a beautiful story!`, "reward-1": `YOU DID IT, ${name}! I'm so proud of how carefully you listened!`, "retry-1": `Almost, ${name}! Let's think about what happened in our story.`, "kindness-1": `${name}, before we visit our next house, I have one tiny mission for you. Today, tell someone in your family something you love about them.`, "leave-1": `That was a wonderful first adventure, ${name}! Today, we learned that being part of a family means caring, helping, listening, and showing love.` };
  return named[id] ?? text;
};

// ---------------------------------------------------------------- scenes (original vector art)
// A friendly cartoon face in Dexter's style: big eyes with highlights, blush,
// and a mouth, brows and tear that follow the mood.
const face = (mood, x, y, scale = 1, hair = "#5a3a1a", girl = false) => {
  const mouth = {
    happy: `<path d="M-13 10 q13 16 26 0Z" fill="#7a1f12" stroke="#3a2412" stroke-width="3.5" stroke-linejoin="round"/>`,
    calm: `<path d="M-10 12 q10 8 20 0" fill="none" stroke="#3a2412" stroke-width="3.5" stroke-linecap="round"/>`,
    sad: `<path d="M-11 17 q11 -11 22 0" fill="none" stroke="#3a2412" stroke-width="3.5" stroke-linecap="round"/>`,
    angry: `<path d="M-11 14 q11 -5 22 0" fill="none" stroke="#3a2412" stroke-width="3.5" stroke-linecap="round"/>`,
  }[mood];
  const brows = {
    happy: `<path d="M-22 -18 q8 -7 16 -1 M22 -18 q-8 -7 -16 -1" fill="none" stroke="#3a2412" stroke-width="3.5" stroke-linecap="round"/>`,
    calm: `<path d="M-22 -17 q8 -5 16 -1 M22 -17 q-8 -5 -16 -1" fill="none" stroke="#3a2412" stroke-width="3.5" stroke-linecap="round"/>`,
    sad: `<path d="M-22 -14 q8 -8 16 -4 M22 -14 q-8 -8 -16 -4" fill="none" stroke="#3a2412" stroke-width="3.5" stroke-linecap="round"/>`,
    angry: `<path d="M-22 -22 l16 7 M22 -22 l-16 7" fill="none" stroke="#3a2412" stroke-width="4" stroke-linecap="round"/>`,
  }[mood];
  const eye = (cx) => `<ellipse cx="${cx}" cy="-2" rx="8" ry="10" fill="#fff" stroke="#3a2412" stroke-width="2.5"/><circle cx="${cx + 1}" cy="0" r="5" fill="#3a2412"/><circle cx="${cx + 3}" cy="-3" r="2" fill="#fff"/>`;
  const tear = mood === "sad" ? `<path d="M19 6 q6 10 0 14 q-6 -4 0 -14Z" fill="#4fc3ff" stroke="#1c7fbf" stroke-width="1.5"/>` : "";
  const hairShape = girl
    ? `<path d="M-38 -4 q0 -44 38 -44 q38 0 38 44 q-12 -24 -38 -22 q-26 -2 -38 22Z" fill="${hair}"/><circle cx="-38" cy="8" r="13" fill="${hair}"/><circle cx="38" cy="8" r="13" fill="${hair}"/><circle cx="-38" cy="-2" r="4" fill="#ff3fa4"/><circle cx="38" cy="-2" r="4" fill="#ff3fa4"/>`
    : `<path d="M-37 -6 q2 -42 37 -42 q35 0 37 42 q-14 -20 -37 -18 q-23 -2 -37 18Z" fill="${hair}"/><path d="M-6 -46 q8 -12 18 -4" fill="none" stroke="${hair}" stroke-width="7" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})"><circle r="36" fill="#ffd9b3" stroke="#3a2412" stroke-width="3.5"/>${hairShape}<ellipse cx="-22" cy="10" rx="7" ry="4" fill="#ff8fc7" opacity="0.55"/><ellipse cx="22" cy="10" rx="7" ry="4" fill="#ff8fc7" opacity="0.55"/>${brows}${eye(-13)}${eye(13)}${tear}${mouth}</g>`;
};
// A whole cartoon person: head at (x, y), body below, feet about 130 px down (before scale).
const person = (mood, x, y, { scale = 1, shirt = "#4fc3ff", hair = "#5a3a1a" } = {}) => {
  const girl = shirt === "#ff8fc7";
  const arms = mood === "happy"
    ? `<path d="M-28 52 l-22 -26 M28 52 l22 -26" stroke="#ffd9b3" stroke-width="12" stroke-linecap="round"/><path d="M-28 52 l-22 -26 M28 52 l22 -26" stroke="#3a2412" stroke-width="15" stroke-linecap="round" opacity="0" />`
    : `<path d="M-28 50 l-12 34 M28 50 l12 34" stroke="#ffd9b3" stroke-width="12" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-16 88 v34 M16 88 v34" stroke="#3d7bff" stroke-width="18" stroke-linecap="round"/>
    <rect x="-27" y="112" width="22" height="14" rx="6" fill="#3a2412"/><rect x="5" y="112" width="22" height="14" rx="6" fill="#3a2412"/>
    ${arms}
    ${girl ? `<path d="M-30 40 h60 l12 58 h-84Z" fill="${shirt}" stroke="#3a2412" stroke-width="3.5" stroke-linejoin="round"/>` : `<rect x="-30" y="40" width="60" height="60" rx="16" fill="${shirt}" stroke="#3a2412" stroke-width="3.5"/>`}
    <path d="M-14 40 q14 10 28 0" fill="none" stroke="#3a2412" stroke-width="3" stroke-linecap="round"/>
    ${face(mood, 0, 0, 1, hair, girl)}
  </g>`;
};
const room = (inner) => `<svg class="fh-scene" viewBox="0 0 600 340" role="img" aria-hidden="true"><rect width="600" height="340" fill="#fff4dc"/><rect y="250" width="600" height="90" fill="#c98a3a"/><rect x="30" y="40" width="130" height="100" rx="10" fill="#bfe6ff" stroke="#8a5a2b" stroke-width="6"/><path d="M60 110 l25 -30 l20 20 l30 -45 l45 55Z" fill="#7ccf6a"/>${inner}</svg>`;
const SCENES = {
  "leo-sad": room(`${person("calm", 190, 150, { shirt: "#ff8fc7", hair: "#8a4a1a" })}<rect x="150" y="190" width="90" height="60" rx="8" fill="#fff" stroke="#3a2412" stroke-width="3"/><path d="M165 235 q20 -40 55 -10" stroke="#ff3fa4" stroke-width="4" fill="none"/>${person("sad", 380, 170, { scale: 0.85, shirt: "#ffd84a" })}<text x="330" y="110" font-size="28" font-family="Fredoka, sans-serif" fill="#3a2412">“Not now, Leo.”</text>`),
  tower: room(`${person("calm", 170, 150, { shirt: "#ff8fc7", hair: "#8a4a1a" })}${person("sad", 420, 170, { scale: 0.85, shirt: "#ffd84a" })}<g transform="translate(290 250)"><rect x="-40" y="-20" width="40" height="40" rx="6" fill="#3d7bff" transform="rotate(-25)"/><rect x="10" y="-60" width="40" height="40" rx="6" fill="#ff8a1f" transform="rotate(18)"/><rect x="-20" y="-100" width="40" height="40" rx="6" fill="#3ee07a" transform="rotate(-8)"/></g><text x="190" y="80" font-size="26" font-family="Fredoka, sans-serif" fill="#3a2412">Oops! The tower fell.</text>`),
  bags: room(`${person("calm", 330, 150, { shirt: "#3d7bff", hair: "#3a2412" })}<g fill="#c98a3a" stroke="#3a2412" stroke-width="3"><rect x="240" y="200" width="46" height="60" rx="8"/><rect x="372" y="200" width="46" height="60" rx="8"/><rect x="300" y="215" width="40" height="50" rx="8" fill="#ffd84a"/></g><text x="150" y="80" font-size="26" font-family="Fredoka, sans-serif" fill="#3a2412">Dad has a lot of bags…</text>`),
  play: room(`${person("calm", 190, 150, { shirt: "#ff8fc7", hair: "#8a4a1a" })}${person("happy", 400, 170, { scale: 0.85, shirt: "#ffd84a" })}<text x="300" y="90" font-size="26" font-family="Fredoka, sans-serif" fill="#3a2412">“Emma, can I play too?”</text>`),
  families: `<svg class="fh-scene" viewBox="0 0 600 340" role="img" aria-hidden="true"><rect width="600" height="340" fill="#fff4dc"/>${person("happy", 70, 120, { scale: 0.6, shirt: "#3d7bff" })}${person("happy", 140, 120, { scale: 0.6, shirt: "#ff8fc7", hair: "#8a4a1a" })}${person("happy", 105, 230, { scale: 0.45, shirt: "#ffd84a" })}${person("happy", 300, 120, { scale: 0.6, shirt: "#3ee07a", hair: "#ddd" })}${person("happy", 300, 230, { scale: 0.45, shirt: "#ff8a1f", hair: "#3a2412" })}${person("happy", 460, 120, { scale: 0.6, shirt: "#a040ff", hair: "#3a2412" })}${person("happy", 520, 230, { scale: 0.45, shirt: "#4fc3ff", hair: "#8a4a1a" })}${person("happy", 420, 230, { scale: 0.45, shirt: "#ffd84a", hair: "#5a3a1a" })}<path d="M300 60 c-10 -24 -44 -14 -40 10 c4 20 40 40 40 40 c0 0 36 -20 40 -40 c4 -24 -30 -34 -40 -10Z" fill="#ff3fa4"/></svg>`,
};
const COTTAGE = `<svg class="fh-cottage" viewBox="0 0 600 360" role="img" aria-label="A cottage with flowers and a heart above the door"><rect width="600" height="360" fill="#bfe6ff"/><circle cx="500" cy="70" r="40" fill="#ffe36b"/><rect y="280" width="600" height="80" fill="#7ccf6a"/><path d="M140 180 L300 60 L460 180Z" fill="#c0392b" stroke="#3a2412" stroke-width="6" stroke-linejoin="round"/><rect x="170" y="180" width="260" height="120" fill="#fff1c9" stroke="#3a2412" stroke-width="6"/><rect x="275" y="210" width="50" height="90" rx="6" fill="#8a5a2b" stroke="#3a2412" stroke-width="5"/><circle cx="313" cy="258" r="4" fill="#ffd84a"/><rect x="195" y="205" width="50" height="45" fill="#bfe6ff" stroke="#3a2412" stroke-width="5"/><rect x="355" y="205" width="50" height="45" fill="#bfe6ff" stroke="#3a2412" stroke-width="5"/><path d="M300 150 c-6 -14 -26 -8 -24 6 c2 12 24 24 24 24 c0 0 22 -12 24 -24 c2 -14 -18 -20 -24 -6Z" fill="#ff3fa4"/>${[200, 240, 360, 400, 440].map((x) => `<g transform="translate(${x} 292)"><rect x="-2" y="0" width="4" height="24" fill="#2f8f5b"/><circle r="8" fill="${["#ff3fa4", "#ffd84a", "#a040ff", "#ff8a1f", "#4fc3ff"][(x / 40) % 5]}"/></g>`).join("")}<g transform="translate(120 120)"><ellipse rx="10" ry="14" fill="#ffd84a" transform="rotate(-30)"/><ellipse rx="10" ry="14" fill="#ff8fc7" transform="rotate(30)"/></g></svg>`;
// The whole house, cut open like a dollhouse: Emma and Leo's bedroom and the
// bathroom upstairs, the kitchen and the living room with the television
// downstairs. Only the television is a control.
const HOUSE_INSIDE = (tvOn) => `<svg class="fh-house" viewBox="0 0 600 420" role="img" aria-label="Inside the House of Family: a bedroom and bathroom upstairs, a kitchen and a living room with a television downstairs">
  <rect width="600" height="420" fill="#bfe6ff"/><circle cx="60" cy="50" r="28" fill="#ffe36b"/><rect y="398" width="600" height="22" fill="#7ccf6a"/>
  <path d="M14 152 L300 18 L586 152Z" fill="#c0392b" stroke="#3a2412" stroke-width="6" stroke-linejoin="round"/><circle cx="300" cy="100" r="16" fill="#bfe6ff" stroke="#3a2412" stroke-width="4"/>
  <rect x="40" y="152" width="520" height="248" fill="#fff1c9" stroke="#3a2412" stroke-width="6"/>
  <rect x="43" y="155" width="257" height="118" fill="#ffe6f0"/><rect x="300" y="155" width="257" height="118" fill="#dff3ff"/><rect x="43" y="281" width="257" height="116" fill="#fff4dc"/><rect x="300" y="281" width="257" height="116" fill="#fff9e8"/>
  <rect x="43" y="273" width="514" height="8" fill="#8a5a2b"/><rect x="297" y="155" width="6" height="242" fill="#8a5a2b"/><rect x="43" y="265" width="257" height="8" fill="#c98a3a"/><rect x="43" y="389" width="514" height="8" fill="#c98a3a"/>
  <g aria-hidden="true"><rect x="70" y="168" width="50" height="40" rx="5" fill="#bfe6ff" stroke="#8a5a2b" stroke-width="4"/><path d="M95 168v40M70 188h50" stroke="#8a5a2b" stroke-width="3"/>
    <rect x="62" y="228" width="80" height="38" rx="8" fill="#3d7bff" stroke="#3a2412" stroke-width="3"/><rect x="66" y="218" width="26" height="16" rx="6" fill="#fff" stroke="#3a2412" stroke-width="3"/>
    <rect x="180" y="228" width="80" height="38" rx="8" fill="#ffd84a" stroke="#3a2412" stroke-width="3"/><rect x="184" y="218" width="26" height="16" rx="6" fill="#fff" stroke="#3a2412" stroke-width="3"/>
    <circle cx="240" cy="222" r="9" fill="#c98a3a" stroke="#3a2412" stroke-width="3"/><circle cx="233" cy="214" r="4" fill="#c98a3a"/><circle cx="247" cy="214" r="4" fill="#c98a3a"/>
    <text x="165" y="195" font-size="20" fill="#ffd84a">★</text><text x="215" y="178" font-size="16" fill="#ff8fc7">★</text><text x="140" y="180" font-size="14" fill="#a040ff">★</text></g>
  <g aria-hidden="true"><rect x="330" y="236" width="120" height="32" rx="14" fill="#fff" stroke="#3a2412" stroke-width="3"/><path d="M340 236 q0 -22 22 -22" fill="none" stroke="#3a2412" stroke-width="4"/>
    <circle cx="500" cy="190" r="22" fill="#e9f7ff" stroke="#8a5a2b" stroke-width="4"/><rect x="470" y="236" width="24" height="30" rx="4" fill="#ff8fc7" stroke="#3a2412" stroke-width="3"/><rect x="330" y="200" width="70" height="8" rx="4" fill="#c98a3a"/>
    <circle cx="345" cy="196" r="7" fill="#ff3fa4"/><circle cx="365" cy="196" r="7" fill="#3ee07a"/></g>
  <g aria-hidden="true"><rect x="60" y="296" width="50" height="40" rx="5" fill="#bfe6ff" stroke="#8a5a2b" stroke-width="4"/>
    <rect x="56" y="346" width="110" height="43" fill="#e0a24a" stroke="#3a2412" stroke-width="3"/><rect x="60" y="340" width="102" height="8" fill="#8a5a2b"/><circle cx="80" cy="356" r="7" fill="#3a2412"/><circle cx="104" cy="356" r="7" fill="#3a2412"/>
    <rect x="186" y="350" width="96" height="10" rx="4" fill="#8a5a2b"/><rect x="194" y="360" width="8" height="29" fill="#8a5a2b"/><rect x="266" y="360" width="8" height="29" fill="#8a5a2b"/>
    <rect x="176" y="362" width="12" height="27" rx="3" fill="#ff8a1f"/><rect x="280" y="362" width="12" height="27" rx="3" fill="#ff8a1f"/>
    <ellipse cx="234" cy="348" rx="22" ry="7" fill="#3ee07a"/><circle cx="226" cy="343" r="6" fill="#ff3fa4"/><circle cx="240" cy="342" r="6" fill="#ffd84a"/>
    <rect x="130" y="300" width="60" height="30" rx="4" fill="#fff" stroke="#8a5a2b" stroke-width="3"/></g>
  <g aria-hidden="true"><rect x="318" y="340" width="130" height="50" rx="16" fill="#ff8fc7" stroke="#3a2412" stroke-width="4"/><rect x="330" y="348" width="40" height="24" rx="8" fill="#ffd84a"/><rect x="384" y="348" width="40" height="24" rx="8" fill="#a040ff"/>
    <rect x="320" y="296" width="44" height="34" rx="4" fill="#fff" stroke="#8a5a2b" stroke-width="4"/>${face("happy", 334, 313, 0.28)}${face("happy", 350, 313, 0.28, "#8a4a1a")}
    <rect x="378" y="300" width="36" height="28" rx="4" fill="#fff" stroke="#8a5a2b" stroke-width="4"/>${face("happy", 396, 314, 0.24, "#ddd")}
    <rect x="536" y="330" width="4" height="60" fill="#3a2412"/><path d="M520 330 l18 -24 l18 24Z" fill="#ffd84a" stroke="#3a2412" stroke-width="3"/>
    <rect x="462" y="370" width="60" height="20" rx="3" fill="#8a5a2b"/></g>
  <g class="fh-tv" data-tv role="button" tabindex="0" aria-label="Turn on the television">
    <rect x="452" y="302" width="82" height="62" rx="8" fill="#1a1030" stroke="#3a2412" stroke-width="5"/><rect class="fh-screen" x="459" y="309" width="68" height="46" rx="5" fill="${tvOn ? "#4fc3ff" : "#0e0a22"}"/>
    ${tvOn ? `<text x="493" y="340" text-anchor="middle" font-size="26">▶</text>` : `<circle class="fh-tap" cx="493" cy="332" r="34" fill="none" stroke="#ffd84a" stroke-width="4"/><text x="493" y="337" text-anchor="middle" font-size="13" font-family="Fredoka, sans-serif" fill="#ffd84a">tap me</text>`}
  </g>
</svg>`;

// ---------------------------------------------------------------- the layer
function openLayer(layer, html) {
  layer.innerHTML = html;
  layer.hidden = false;
  requestAnimationFrame(() => layer.classList.add("is-open"));
}
const closeLayer = (layer) => {
  layer.classList.remove("is-open");
  layer.hidden = true;
  layer.innerHTML = "";
};
const dexter = (cls = "") => `<div class="fh-dexter ${cls}" aria-hidden="true">${DAXTER_SVG}</div>`;
const frame = ({ kicker, title, body, actions = "", bubble = "" }) => `
  <div class="fh" role="dialog" aria-modal="true" aria-labelledby="fh-title">
    <button class="fh-close" type="button" data-close aria-label="Leave for now">✕</button>
    ${kicker ? `<p class="fh-kicker">${kicker}</p>` : ""}
    ${title ? `<h2 id="fh-title">${title}</h2>` : `<h2 id="fh-title" class="visually-hidden">Dexter</h2>`}
    <div class="fh-stage">
      ${dexter()}
      <p class="fh-bubble" aria-live="polite">${bubble}</p>
    </div>
    ${body}
    <div class="fh-actions">${actions}</div>
  </div>`;

// `speak(ids)` plays Dexter's recorded lines in order (the app supplies it);
// the bubble shows each line's text as it starts.
async function narrate(layer, speak, ids, name) {
  const bubble = layer.querySelector(".fh-bubble"); // the bubble of this view; a new view has a new one
  for (const id of ids) {
    if (!layer.contains(bubble)) return; // the child moved on
    bubble.textContent = say(id, name);
    const page = layer.querySelector(`[data-scene="${id}"]`); // the storybook scene being read
    if (page) {
      layer.querySelectorAll(".is-reading").forEach((el) => el.classList.remove("is-reading"));
      page.classList.add("is-reading");
      page.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    layer.querySelector(".fh-dexter")?.classList.add("is-talking");
    await speak([id], say(id, name));
    layer.querySelector(".fh-dexter")?.classList.remove("is-talking");
  }
}

// ---------------------------------------------------------------- meeting Dexter + the world
export function openIntro(layer, { playerName = "", speak, onDone }) {
  const name = escape(playerName);
  let gone = false;
  const finish = () => { if (!gone) { gone = true; closeLayer(layer); onDone?.(); } };
  layer.onclick = (event) => {
    const btn = event.target.closest("[data-intro]");
    if (!btn) return;
    const action = btn.dataset.intro;
    if (action === "yes" || action === "more") return reply(action);
    if (action === "world") return world();
    if (action === "go") return finish();
  };
  const intro = async () => {
    openLayer(layer, frame({ kicker: "Meeting Dexter", bubble: playerName ? `Hello, ${name}!` : "Hello!", body: `<p class="fh-hint">Dexter is talking… tap when you're ready.</p>`, actions: `<button class="btn-gold big" data-intro="yes">YES, DEXTER! ❤️</button><button class="btn-ink big" data-intro="more">TELL ME MORE!</button>` }));
    await narrate(layer, speak, ["intro-1", "intro-2", "intro-3", "intro-4", "intro-ask"], playerName);
  };
  const reply = async (action) => {
    layer.querySelectorAll("[data-intro]").forEach((b) => (b.disabled = true));
    await narrate(layer, speak, [action === "yes" ? "intro-yes" : "intro-more"], playerName);
    world();
  };
  const world = async () => {
    openLayer(layer, frame({ kicker: "Our Adventure World", bubble: "", body: `<div class="fh-world"><span>🌲</span><span>🏡</span><span>🦋</span><span>🏠</span><span>🌼</span><span>🏘️</span></div>`, actions: `<button class="btn-gold big" data-intro="go">LET'S GO TO THE FIRST HOUSE! 🏡</button>` }));
    await narrate(layer, speak, ["world-1", "world-2", "world-3", "world-4"], playerName);
  };
  intro();
}

// ---------------------------------------------------------------- the House of Family
export function openFamilyHouse(layer, { playerName = "", speak, stopSpeech, completed = false, kindnessDone = false, onAttempt, onComplete, onKindness, onClose }) {
  const name = escape(playerName);
  let step = completed ? "inside" : "arrive";
  let challenge = 0;
  let tries = 0;

  const close = () => {
    stopSpeech?.();
    closeLayer(layer);
    onClose?.();
  };
  layer.onclick = (event) => {
    if (event.target.closest("[data-close]")) return close();
    const go = event.target.closest("[data-go]");
    if (go) return show(go.dataset.go);
    const tv = event.target.closest("[data-tv]");
    if (tv) return turnOn();
    const pick = event.target.closest("[data-option]");
    if (pick) return answer(pick.dataset.option, pick);
    if (event.target.closest("[data-kindness]")) return kindness();
  };
  layer.onkeydown = (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.closest("[data-tv]")) { event.preventDefault(); turnOn(); }
  };

  const KICKER = "🏡 Episode 1 · The House of Family";
  const VIEW = {
    arrive: () => ({ kicker: KICKER, title: "Family Is Where Love Begins", body: COTTAGE, actions: `<button class="btn-gold big" data-go="inside">COME INSIDE 🚪</button>`, lines: ["arrive-1", "arrive-2", "arrive-3", "arrive-4"] }),
    inside: () => ({ kicker: KICKER, title: "Inside the house", body: HOUSE_INSIDE(false), actions: completed ? `<button class="btn-ink" data-go="story">📖 Read the story again</button><button class="btn-gold" data-go="leave">Back to the road</button>` : "", lines: ["tv-1", "tv-2"] }),
    story: () => ({ kicker: KICKER, title: STORYBOOK.title, body: `<div class="fh-storybook">${STORYBOOK.scenes.map((sc) => `<section data-scene="story-${sc.id}"><h3>${escape(sc.heading)}</h3><p>${escape(sc.text)}</p></section>`).join("")}</div>`, actions: `<button class="btn-gold big" data-go="after">THE END ✓</button>`, lines: ["tv-on", ...STORYBOOK.scenes.map((sc) => `story-${sc.id}`)] }),
    after: () => ({ kicker: KICKER, title: "What a story!", body: SCENES.play, actions: `<button class="btn-gold big" data-go="challenge">LET'S PLAY, DEXTER! 🎲</button>`, lines: ["after-1", "after-2", "after-3"] }),
    challenge: () => {
      const c = CHALLENGES[challenge];
      return { kicker: `${KICKER} · ${challenge + 1} of ${CHALLENGES.length}`, title: c.title, body: `${SCENES[c.scene]}<div class="fh-options">${c.options.map((o) => `<button class="fh-option" type="button" data-option="${o.id}"><span class="fh-icon" aria-hidden="true">${o.icon}</span><span>${escape(o.label)}</span></button>`).join("")}</div><p class="fh-feedback" aria-live="polite"></p>`, actions: "", lines: [], bubble: c.prompt };
    },
    reward: () => ({ kicker: KICKER, title: "The Heart of Kindness", body: `<div class="fh-reward"><div class="fh-heart" aria-hidden="true">❤️</div><div class="fh-certificate"><small>Friend of Dexter</small><b>${name || "Explorer"}</b><span>Guardian of the Heart of Kindness</span><em>Completed: The House of Family</em></div></div>`, actions: `<button class="btn-gold big" data-go="kindness">CONTINUE ✦</button>`, lines: ["reward-1", "reward-2", "reward-3"] }),
    kindness: () => ({ kicker: KICKER, title: "A tiny mission for real life", body: `<div class="fh-mission"><span aria-hidden="true">💌</span><p>Today, tell someone in your family something you love about them.</p></div>`, actions: kindnessDone ? `<button class="btn-gold big" data-go="leave">DONE ✓</button>` : `<button class="btn-gold big" data-kindness>I'LL TRY, DEXTER! 💛</button><button class="btn-ink" data-go="leave">Maybe later</button>`, lines: ["kindness-1", "kindness-2"] }),
    leave: () => ({ kicker: KICKER, title: "Back to the road", body: COTTAGE, actions: `<button class="btn-gold big" data-close>TO THE NEXT ADVENTURE! 🌟</button>`, lines: ["leave-1", "leave-2"] }),
  };

  async function show(next) {
    step = next;
    stopSpeech?.();
    const view = VIEW[step]();
    openLayer(layer, frame({ ...view, bubble: view.bubble ?? "" }));
    if (step === "challenge") {
      tries = 0;
      await narrate(layer, speak, [], playerName);
      layer.querySelector(".fh-bubble").textContent = CHALLENGES[challenge].prompt;
      await speak([`${CHALLENGES[challenge].id}-prompt`], CHALLENGES[challenge].prompt);
      return;
    }
    await narrate(layer, speak, view.lines, playerName);
  }

  async function turnOn() {
    const screen = layer.querySelector(".fh-screen");
    screen?.setAttribute("fill", "#4fc3ff");
    await sleep(500);
    show("story");
  }

  async function answer(optionId, button) {
    const c = CHALLENGES[challenge];
    const option = c.options.find((o) => o.id === optionId);
    const feedback = layer.querySelector(".fh-feedback");
    layer.querySelectorAll(".fh-option").forEach((b) => (b.disabled = true));
    onAttempt?.(c.id, optionId, Boolean(option?.correct));
    if (option?.correct) {
      button.classList.add("is-right");
      feedback.textContent = c.right;
      await speak([`${c.id}-right`], c.right);
      challenge += 1;
      if (challenge < CHALLENGES.length) return show("challenge");
      challenge = 0;
      onComplete?.();
      completed = true;
      return show("reward");
    }
    button.classList.add("is-wrong");
    tries += 1;
    feedback.textContent = c.wrong;
    await narrate(layer, speak, [tries === 1 ? "retry-1" : "retry-2"], playerName);
    if (!layer.contains(feedback)) return;
    feedback.textContent = c.wrong;
    await speak([`${c.id}-wrong`], c.wrong);
    layer.querySelectorAll(".fh-option").forEach((b) => { if (!b.classList.contains("is-wrong")) b.disabled = false; });
  }

  async function kindness() {
    kindnessDone = true;
    onKindness?.();
    await narrate(layer, speak, ["kindness-yes"], playerName);
    show("leave");
  }

  show(step);
}
