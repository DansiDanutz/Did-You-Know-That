// Episode 1 · The House of Family. Meeting Dexter, the world, the cottage, the
// television with its storybook, the
// five scene challenges with supportive retries, the Heart of Kindness, the
// kindness mission and the way out. Touch-first, voiced, nothing shames a child.
// Content: js/data/family-episode.js. English pilot.

import { PACK_EN } from "../data/family-episode.js";
import { DAXTER_SVG } from "./character.js";
import { CAST_DEFS, PROPS, member, room, bubble } from "./family-cast.js";

const OUTLINE = "#2a1406";

const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

// Dexter's line in the pack's language; English shows the child's name where the brief uses it (only on the device).
const say = (id, name, pack) => {
  const text = pack.lines[id] ?? EXTRA(pack)[id];
  if (!name || !pack.named) return text;
  return pack.named(name)[id] ?? text;
};
const EXTRA = (pack) => ({
  ...Object.fromEntries(pack.challenges.flatMap((c) => [[`${c.id}-prompt`, c.prompt], [`${c.id}-right`, c.right], [`${c.id}-wrong`, c.wrong]])),
  ...Object.fromEntries(pack.story.scenes.map((sc) => [`story-${sc.id}`, sc.heading])),
});

// ---------------------------------------------------------------- scenes (original vector art)
// ---------------------------------------------------------------- scenes (the family, drawn in js/ui/family-cast.js)
export const scenes = (ui) => ({
  // Emma at her drawing; Leo, with his teddy, has just been told "Not now".
  "leo-sad": room(`
    <rect x="130" y="196" width="150" height="14" rx="5" fill="#b8662a" stroke="${OUTLINE}" stroke-width="2.4"/><rect x="142" y="210" width="10" height="60" fill="#8a4a1a"/><rect x="258" y="210" width="10" height="60" fill="#8a4a1a"/>
    ${member("emma", "calm", 205, 96, { scale: 0.78, arms: ["down", "out"], prop: "paper", propAt: [-10, 92] })}
    <rect x="164" y="182" width="30" height="8" rx="3" fill="#ff3fa4"/><rect x="200" y="182" width="30" height="8" rx="3" fill="#3d7bff"/>
    ${member("leo", "sad", 400, 128, { scale: 0.62, arms: ["down", "out"], prop: "teddy", propAt: [-6, 92], lids: 0 })}
    ${bubble(ui.notNow, 250, 48, 215, 62)}`),
  // The tower of blocks has just fallen.
  tower: room(`
    ${member("emma", "calm", 160, 96, { scale: 0.78, arms: ["down", "up"] })}
    ${member("leo", "sad", 430, 128, { scale: 0.62, arms: "down" })}
    <g transform="translate(300 262)" stroke="${OUTLINE}" stroke-width="2.4"><rect x="-70" y="-36" width="40" height="40" rx="7" fill="#3d7bff" transform="rotate(-24 -50 -16)"/><rect x="-20" y="-30" width="40" height="40" rx="7" fill="#ff8a1f" transform="rotate(16 0 -10)"/><rect x="30" y="-40" width="40" height="40" rx="7" fill="#3ee07a" transform="rotate(-10 50 -20)"/><rect x="-46" y="-84" width="40" height="40" rx="7" fill="#ffd84a" transform="rotate(32 -26 -64)"/><circle cx="-10" cy="-70" r="18" fill="#ff3fa4"/></g>
    <text x="248" y="150" font-size="30" font-family="Fredoka, sans-serif" font-weight="700" fill="#ff8a1f">${ui.oops}</text>
    ${bubble(ui.towerFell, 190, 46, 172, 62, 22)}`),
  // Dad with the groceries; Emma nearby.
  bags: room(`
    ${member("dad", "calm", 330, 84, { scale: 0.92, arms: ["out", "out"], lids: 3 })}
    <g transform="translate(276 170)">${PROPS.bag("#e0a24a")}</g><g transform="translate(384 170)">${PROPS.bag("#c98a3a")}</g>
    <g transform="translate(470 262)">${PROPS.bag("#ffd84a")}</g>
    ${member("emma", "calm", 120, 96, { scale: 0.78, arms: ["down", "down"] })}
    ${bubble(ui.manyBags, 370, 30, 345, 48, 22)}`),
  // Leo asks to join Emma's game.
  play: room(`
    <ellipse cx="200" cy="290" rx="70" ry="18" fill="#fff" opacity=".6"/><rect x="156" y="262" width="88" height="28" rx="6" fill="#7ccf6a" stroke="${OUTLINE}" stroke-width="2.4"/><circle cx="178" cy="276" r="7" fill="#ff3fa4"/><circle cx="200" cy="276" r="7" fill="#3d7bff"/><circle cx="222" cy="276" r="7" fill="#ffd84a"/>
    ${member("emma", "calm", 160, 96, { scale: 0.78, arms: ["down", "out"] })}
    ${member("leo", "happy", 420, 128, { scale: 0.62, arms: ["up", "up"], prop: "teddy", propAt: [-30, 86] })}
    ${bubble(ui.canIPlay, 300, 50, 412, 92, 22)}`),
  // Families of different shapes, all held by one big heart.
  families: `<svg class="fh-scene" viewBox="0 0 600 340" role="img" aria-hidden="true">${CAST_DEFS}
    <rect width="600" height="340" fill="url(#fc-wall)"/><rect y="250" width="600" height="90" fill="url(#fc-floor)"/><rect y="244" width="600" height="8" fill="#8a5a2b"/>
    <path d="M300 86 c-14 -34 -62 -22 -56 14 c6 28 56 56 56 56 c0 0 50 -28 56 -56 c6 -36 -42 -48 -56 -14Z" fill="#ff3fa4" stroke="${OUTLINE}" stroke-width="2.6"/><path d="M262 92 q6 -16 22 -18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    ${member("dad", "happy", 82, 128, { scale: 0.5, arms: ["down", "up"] })}${member("emma", "happy", 140, 158, { scale: 0.4, arms: ["up", "down"] })}
    ${member("mom", "happy", 262, 150, { scale: 0.48, arms: ["down", "down"] })}${member("leo", "happy", 318, 178, { scale: 0.36, arms: ["up", "up"] })}${member("emma", "happy", 360, 164, { scale: 0.4, arms: ["down", "up"] })}
    ${member("grandma", "happy", 480, 134, { scale: 0.5, arms: ["down", "out"] })}${member("leo", "happy", 540, 178, { scale: 0.36, arms: ["up", "down"] })}
  </svg>`,
});
const cottage = (ui) => `<svg class="fh-cottage" viewBox="0 0 600 360" role="img" aria-label="${ui.cottageLabel}"><rect width="600" height="360" fill="#bfe6ff"/><circle cx="500" cy="70" r="40" fill="#ffe36b"/><rect y="280" width="600" height="80" fill="#7ccf6a"/><path d="M140 180 L300 60 L460 180Z" fill="#c0392b" stroke="#3a2412" stroke-width="6" stroke-linejoin="round"/><rect x="170" y="180" width="260" height="120" fill="#fff1c9" stroke="#3a2412" stroke-width="6"/><rect x="275" y="210" width="50" height="90" rx="6" fill="#8a5a2b" stroke="#3a2412" stroke-width="5"/><circle cx="313" cy="258" r="4" fill="#ffd84a"/><rect x="195" y="205" width="50" height="45" fill="#bfe6ff" stroke="#3a2412" stroke-width="5"/><rect x="355" y="205" width="50" height="45" fill="#bfe6ff" stroke="#3a2412" stroke-width="5"/><path d="M300 150 c-6 -14 -26 -8 -24 6 c2 12 24 24 24 24 c0 0 22 -12 24 -24 c2 -14 -18 -20 -24 -6Z" fill="#ff3fa4"/>${[200, 240, 360, 400, 440].map((x) => `<g transform="translate(${x} 292)"><rect x="-2" y="0" width="4" height="24" fill="#2f8f5b"/><circle r="8" fill="${["#ff3fa4", "#ffd84a", "#a040ff", "#ff8a1f", "#4fc3ff"][(x / 40) % 5]}"/></g>`).join("")}<g transform="translate(120 120)"><ellipse rx="10" ry="14" fill="#ffd84a" transform="rotate(-30)"/><ellipse rx="10" ry="14" fill="#ff8fc7" transform="rotate(30)"/></g></svg>`;
// The whole house, cut open like a dollhouse: Emma and Leo's bedroom and the
// bathroom upstairs, the kitchen and the living room with the television
// downstairs. Only the television is a control.
const houseInside = (tvOn, ui) => `<svg class="fh-house" viewBox="0 0 600 420" role="img" aria-label="${ui.houseLabel}">
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
    <rect x="320" y="296" width="44" height="34" rx="4" fill="#fff" stroke="#8a5a2b" stroke-width="4"/><path d="M342 322 c-4 -9 -16 -5 -14 4 c2 7 14 13 14 13 c0 0 12 -6 14 -13 c2 -9 -10 -13 -14 -4Z" fill="#ff3fa4"/>
    <rect x="378" y="300" width="36" height="28" rx="4" fill="#fff" stroke="#8a5a2b" stroke-width="4"/><circle cx="390" cy="310" r="5" fill="#ffd84a"/><path d="M382 324 l6 -8 l5 5 l7 -9 l8 12Z" fill="#7ccf6a"/>
    <rect x="536" y="330" width="4" height="60" fill="#3a2412"/><path d="M520 330 l18 -24 l18 24Z" fill="#ffd84a" stroke="#3a2412" stroke-width="3"/>
    <rect x="462" y="370" width="60" height="20" rx="3" fill="#8a5a2b"/></g>
  <g class="fh-tv" data-tv role="button" tabindex="0" aria-label="${ui.tvLabel}">
    <rect x="452" y="302" width="82" height="62" rx="8" fill="#1a1030" stroke="#3a2412" stroke-width="5"/><rect class="fh-screen" x="459" y="309" width="68" height="46" rx="5" fill="${tvOn ? "#4fc3ff" : "#0e0a22"}"/>
    ${tvOn ? `<text x="493" y="340" text-anchor="middle" font-size="26">▶</text>` : `<circle class="fh-tap" cx="493" cy="332" r="34" fill="none" stroke="#ffd84a" stroke-width="4"/><text x="493" y="337" text-anchor="middle" font-size="13" font-family="Fredoka, sans-serif" fill="#ffd84a">${ui.tapMe}</text>`}
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
const frame = (ui, { kicker, title, body, actions = "", bubble = "" }) => `
  <div class="fh" role="dialog" aria-modal="true" aria-labelledby="fh-title">
    <button class="fh-close" type="button" data-close aria-label="${escape(ui.leave)}">✕</button>
    ${kicker ? `<p class="fh-kicker">${kicker}</p>` : ""}
    ${title ? `<h2 id="fh-title">${title}</h2>` : `<h2 id="fh-title" class="visually-hidden">${escape(ui.dexterName)}</h2>`}
    <div class="fh-stage">
      ${dexter()}
      <p class="fh-bubble" aria-live="polite">${bubble}</p>
    </div>
    ${body}
    <div class="fh-actions">${actions}</div>
  </div>`;

// `speak(ids)` plays Dexter's recorded lines in order (the app supplies it);
// the bubble shows each line's text as it starts.
async function narrate(layer, speak, ids, name, pack) {
  const bubble = layer.querySelector(".fh-bubble"); // the bubble of this view; a new view has a new one
  for (const id of ids) {
    if (!layer.contains(bubble)) return; // the child moved on
    bubble.textContent = say(id, name, pack);
    const page = layer.querySelector(`[data-scene="${id}"]`); // the storybook scene being read
    if (page) {
      layer.querySelectorAll(".is-reading").forEach((el) => el.classList.remove("is-reading"));
      page.classList.add("is-reading");
      page.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    layer.querySelector(".fh-dexter")?.classList.add("is-talking");
    await speak([id], say(id, name, pack));
    layer.querySelector(".fh-dexter")?.classList.remove("is-talking");
  }
}

// ---------------------------------------------------------------- meeting Dexter + the world
export function openIntro(layer, { playerName = "", speak, onDone, pack = PACK_EN }) {
  const ui = pack.ui;
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
    openLayer(layer, frame(ui, { kicker: escape(ui.meeting), bubble: playerName ? fill(ui.hello, { name }) : ui.helloAnon, body: `<p class="fh-hint">${escape(ui.hint)}</p>`, actions: `<button class="btn-gold big" data-intro="yes">${escape(ui.yes)}</button><button class="btn-ink big" data-intro="more">${escape(ui.more)}</button>` }));
    await narrate(layer, speak, ["intro-1", "intro-2", "intro-3", "intro-4", "intro-ask"], playerName, pack);
  };
  const reply = async (action) => {
    layer.querySelectorAll("[data-intro]").forEach((b) => (b.disabled = true));
    await narrate(layer, speak, [action === "yes" ? "intro-yes" : "intro-more"], playerName, pack);
    world();
  };
  const world = async () => {
    openLayer(layer, frame(ui, { kicker: escape(ui.worldKicker), bubble: "", body: `<div class="fh-world"><span>🌲</span><span>🏡</span><span>🦋</span><span>🏠</span><span>🌼</span><span>🏘️</span></div>`, actions: `<button class="btn-gold big" data-intro="go">${escape(ui.go)}</button>` }));
    await narrate(layer, speak, ["world-1", "world-2", "world-3", "world-4"], playerName, pack);
  };
  intro();
}

// ---------------------------------------------------------------- the House of Family
export function openFamilyHouse(layer, { playerName = "", speak, stopSpeech, completed = false, kindnessDone = false, onAttempt, onComplete, onKindness, onClose, pack = PACK_EN }) {
  const { ui, challenges: CHALLENGES, story: STORYBOOK } = pack;
  const SCENES = scenes(ui);
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

  const KICKER = `🏡 ${escape(ui.episode)}`;
  const VIEW = {
    arrive: () => ({ kicker: KICKER, title: escape(ui.arriveTitle), body: cottage(ui), actions: `<button class="btn-gold big" data-go="inside">${escape(ui.comeInside)}</button>`, lines: ["arrive-1", "arrive-2", "arrive-3", "arrive-4"] }),
    inside: () => ({ kicker: KICKER, title: escape(ui.insideTitle), body: houseInside(false, ui), actions: completed ? `<button class="btn-ink" data-go="story">${escape(ui.readAgain)}</button><button class="btn-gold" data-go="leave">${escape(ui.backRoad)}</button>` : "", lines: ["tv-1", "tv-2"] }),
    story: () => ({ kicker: KICKER, title: escape(STORYBOOK.title), body: `<div class="fh-storybook">${STORYBOOK.scenes.map((sc) => `<section data-scene="story-${sc.id}"><h3>${escape(sc.heading)}</h3><p>${escape(sc.text)}</p></section>`).join("")}</div>`, actions: `<button class="btn-gold big" data-go="after">${escape(ui.theEnd)}</button>`, lines: ["tv-on", ...STORYBOOK.scenes.map((sc) => `story-${sc.id}`)] }),
    after: () => ({ kicker: KICKER, title: escape(ui.afterTitle), body: SCENES.play, actions: `<button class="btn-gold big" data-go="challenge">${escape(ui.letsPlay)}</button>`, lines: ["after-1", "after-2", "after-3"] }),
    challenge: () => {
      const c = CHALLENGES[challenge];
      return { kicker: `${KICKER} · ${escape(fill(ui.progress, { n: challenge + 1, total: CHALLENGES.length }))}`, title: escape(c.title), body: `${SCENES[c.scene]}<div class="fh-options">${c.options.map((o) => `<button class="fh-option" type="button" data-option="${o.id}"><span class="fh-icon" aria-hidden="true">${o.icon}</span><span>${escape(o.label)}</span></button>`).join("")}</div><p class="fh-feedback" aria-live="polite"></p>`, actions: "", lines: [], bubble: c.prompt };
    },
    reward: () => ({ kicker: KICKER, title: escape(ui.rewardTitle), body: `<div class="fh-reward"><div class="fh-heart" aria-hidden="true">❤️</div><div class="fh-certificate"><small>${escape(ui.friend)}</small><b>${name || escape(ui.explorer)}</b><span>${escape(ui.guardian)}</span><em>${escape(ui.completed)}</em></div></div>`, actions: `<button class="btn-gold big" data-go="kindness">${escape(ui.cont)}</button>`, lines: ["reward-1", "reward-2", "reward-3"] }),
    kindness: () => ({ kicker: KICKER, title: escape(ui.kindTitle), body: `<div class="fh-mission"><span aria-hidden="true">💌</span><p>${escape(ui.kindText)}</p></div>`, actions: kindnessDone ? `<button class="btn-gold big" data-go="leave">${escape(ui.done)}</button>` : `<button class="btn-gold big" data-kindness>${escape(ui.kindYes)}</button><button class="btn-ink" data-go="leave">${escape(ui.later)}</button>`, lines: ["kindness-1", "kindness-2"] }),
    leave: () => ({ kicker: KICKER, title: escape(ui.backRoad), body: cottage(ui), actions: `<button class="btn-gold big" data-close>${escape(ui.next)}</button>`, lines: ["leave-1", "leave-2"] }),
  };

  async function show(next) {
    step = next;
    stopSpeech?.();
    const view = VIEW[step]();
    openLayer(layer, frame(ui, { ...view, bubble: view.bubble ?? "" }));
    if (step === "challenge") {
      tries = 0;
      await narrate(layer, speak, [], playerName, pack);
      layer.querySelector(".fh-bubble").textContent = CHALLENGES[challenge].prompt;
      await speak([`${CHALLENGES[challenge].id}-prompt`], CHALLENGES[challenge].prompt);
      return;
    }
    await narrate(layer, speak, view.lines, playerName, pack);
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
    await narrate(layer, speak, [tries === 1 ? "retry-1" : "retry-2"], playerName, pack);
    if (!layer.contains(feedback)) return;
    feedback.textContent = c.wrong;
    await speak([`${c.id}-wrong`], c.wrong);
    layer.querySelectorAll(".fh-option").forEach((b) => { if (!b.classList.contains("is-wrong")) b.disabled = false; });
  }

  async function kindness() {
    kindnessDone = true;
    onKindness?.();
    await narrate(layer, speak, ["kindness-yes"], playerName, pack);
    show("leave");
  }

  show(step);
}
