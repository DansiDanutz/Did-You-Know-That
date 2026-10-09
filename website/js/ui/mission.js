// "The Missing Shadow" — the first independent kids mission
// (DEXTY-CHARACTER-AND-ADULT-PROGRESSION.md). Everything needed is here in the
// app: no video, no video-only answer. Steps: story → predict → experiment →
// apply → the real sky → choose a reward → finish. Wrong answers get an
// explanation and another try; hints are free and never lower the reward.
// English pilot (master plan: approve the English version before translating).

import { castShadow, covers } from "../lib/shadow.js";
import { ITEMS, MISSIONS } from "../lib/progression.js";
import { DAXTER_SVG } from "./character.js";

const MISSION = MISSIONS["missing-shadow"];
const GROUND_Y = 470; // svg y of the ground line
const TREE = { x: 500, height: 200 };
const LONG = 300;
const SHORT = 60;
const BLANKET = { from: 250, to: 400 };
// Light height is kept inside the picture (ground at y 470, top of sky at 0).
const LIGHT_LIMITS = { minX: 60, maxX: 940, minY: 230, maxY: 440 };

const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

const PREDICT = {
  question: "Dexter moves the lamp lower, close to the ground. What happens to the tree's shadow?",
  choices: [
    { text: "It gets longer", correct: true, feedback: "Yes! Low light hits the tree from the side, so the shadow stretches far across the ground." },
    { text: "It gets shorter", feedback: "Good guess, but try it: when the light is LOW, the shadow gets LONGER. High light makes short shadows." },
    { text: "It disappears", feedback: "Not quite. As long as the tree blocks the light, there is a shadow. Let's test it in the experiment!" },
  ],
};

function sceneSvg({ withBlanket = false } = {}) {
  return `
    <svg class="mission-scene" viewBox="0 0 1000 560" role="img" aria-label="A tree on the ground, a lamp and the tree's shadow">
      <rect x="0" y="0" width="1000" height="${GROUND_Y}" fill="#bfe6ff"/>
      <rect x="0" y="${GROUND_Y}" width="1000" height="${560 - GROUND_Y}" fill="#7ccf6a"/>
      <rect class="m-shadow" x="0" y="${GROUND_Y - 4}" width="0" height="22" rx="11" fill="#1f3b2a" opacity=".55"/>
      ${withBlanket ? `<rect class="m-blanket" x="${BLANKET.from}" y="${GROUND_Y + 2}" width="${BLANKET.to - BLANKET.from}" height="26" rx="6" fill="#ff8fc7" stroke="#b8126a" stroke-width="3"/>` : ""}
      <rect x="${TREE.x - 14}" y="${GROUND_Y - TREE.height}" width="28" height="${TREE.height}" rx="8" fill="#8a5a2b"/>
      <circle cx="${TREE.x}" cy="${GROUND_Y - TREE.height - 10}" r="62" fill="#2f8f5b"/>
      <g class="m-lamp" tabindex="-1">
        <circle class="m-glow" r="44" fill="#ffd44d" opacity=".35"/>
        <circle r="24" fill="#ffd44d" stroke="#b8780c" stroke-width="4"/>
      </g>
    </svg>`;
}

const controlsHtml = () => `
  <div class="mission-controls">
    <label>Light: left ↔ right <input type="range" data-light="x" min="${LIGHT_LIMITS.minX}" max="${LIGHT_LIMITS.maxX}" step="5" /></label>
    <label>Light: low ↕ high <input type="range" data-light="y" min="${LIGHT_LIMITS.minY}" max="${LIGHT_LIMITS.maxY}" step="5" /></label>
    <p class="mission-readout" aria-live="polite"></p>
  </div>`;

function outfitCard(id) {
  const item = ITEMS[id];
  return `<button class="outfit-choice" type="button" data-choice="${id}" aria-label="Choose the ${escape(item.name)}">
      <span class="outfit-preview outfit-${id}">${DAXTER_SVG}</span><b>${escape(item.name)}</b></button>`;
}

export function openMission(layer, { onAttempt, onHint, onComplete, onClose, completed = false, playerName = "" }) {
  let light = { x: 300, y: 420 };
  let step = completed ? "replay" : "story";
  let tasks = { long: false, short: false };

  const close = () => {
    layer.classList.remove("is-open");
    layer.hidden = true;
    layer.innerHTML = "";
    onClose?.();
  };

  function drawShadow() {
    const shade = castShadow(TREE, light, { maxLength: 1000 });
    const rect = layer.querySelector(".m-shadow");
    const lamp = layer.querySelector(".m-lamp");
    if (!rect || !lamp) return shade;
    rect.setAttribute("x", String(Math.min(shade.base, shade.tip)));
    rect.setAttribute("width", String(Math.abs(shade.tip - shade.base)));
    lamp.setAttribute("transform", `translate(${light.x} ${GROUND_Y - light.y})`);
    layer.querySelectorAll("[data-light]").forEach((input) => (input.value = String(light[input.dataset.light])));
    const readout = layer.querySelector(".mission-readout");
    if (readout) {
      const side = shade.tip > TREE.x ? "right" : shade.tip < TREE.x ? "left" : "under the tree";
      readout.textContent = `Shadow: ${Math.round(shade.length)} steps long, to the ${side}.`;
    }
    return shade;
  }

  function wireLight(onChange) {
    const svg = layer.querySelector(".mission-scene");
    const toWorld = (event) => {
      const box = svg.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * 1000;
      const y = GROUND_Y - ((event.clientY - box.top) / box.height) * 560;
      return { x: clamp(x, LIGHT_LIMITS.minX, LIGHT_LIMITS.maxX), y: clamp(y, LIGHT_LIMITS.minY, LIGHT_LIMITS.maxY) };
    };
    let dragging = false;
    svg.addEventListener("pointerdown", (event) => {
      dragging = true;
      svg.setPointerCapture(event.pointerId);
      light = toWorld(event);
      onChange(drawShadow());
    });
    svg.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      light = toWorld(event);
      onChange(drawShadow());
    });
    svg.addEventListener("pointerup", () => (dragging = false));
    layer.querySelectorAll("[data-light]").forEach((input) =>
      input.addEventListener("input", () => {
        light = { ...light, [input.dataset.light]: Number(input.value) };
        onChange(drawShadow());
      }),
    );
    onChange(drawShadow());
  }

  const frame = (title, body, actions = "") => `
    <div class="mission" role="dialog" aria-modal="true" aria-labelledby="mission-title">
      <button class="mission-close" type="button" data-close aria-label="Close the mission">✕</button>
      <p class="mission-kicker">🔦 Mission · The Missing Shadow</p>
      <h2 id="mission-title">${title}</h2>
      ${body}
      <div class="mission-actions">${actions}</div>
    </div>`;

  const STEPS = {
    story: () =>
      frame(
        "Who moved the shade?",
        `<p class="mission-text">Dexter put the picnic blanket in the tree's cool shade. Later… the blanket was sitting in the hot sun! The tree didn't move. So who moved the shade? Let's investigate with Dexter's prism lamp.</p>
         <p class="mission-note">🎒 The prism lamp is loaned to you for this mission.</p>`,
        `<button class="btn-gold" data-go="predict">Start investigating →</button>`,
      ),
    predict: () =>
      frame(
        "Make a prediction",
        `${sceneSvg()}<p class="mission-text">${PREDICT.question}</p>
         <div class="mission-choices">${PREDICT.choices.map((c, i) => `<button class="btn-ink" data-predict="${i}">${escape(c.text)}</button>`).join("")}</div>
         <p class="mission-feedback" aria-live="polite"></p>`,
        `<button class="btn-gold" data-go="experiment" hidden>Test it →</button>`,
      ),
    experiment: () =>
      frame(
        "Experiment with the light",
        `${sceneSvg()}${controlsHtml()}
         <ul class="mission-tasks"><li data-task="long">Make the shadow LONG (move the light low)</li><li data-task="short">Make the shadow SHORT (move the light high, above the tree)</li></ul>
         <p class="mission-feedback" aria-live="polite">Drag the lamp, or use the sliders.</p>`,
        `<button class="btn-ink" data-hint>💡 Hint</button><button class="btn-gold" data-go="apply" hidden>Next challenge →</button>`,
      ),
    apply: () =>
      frame(
        "Put the shade on the blanket",
        `${sceneSvg({ withBlanket: true })}${controlsHtml()}
         <p class="mission-text">The picnic blanket is on the LEFT of the tree. Move the light so the tree's shade covers the whole blanket.</p>
         <p class="mission-feedback" aria-live="polite"></p>`,
        `<button class="btn-ink" data-hint>💡 Hint</button><button class="btn-gold" data-go="sky" hidden>Solved! →</button>`,
      ),
    sky: () =>
      frame(
        "So who moved the shade?",
        `<p class="mission-text">Nobody did! The Sun seems to move across the sky during the day, because our Earth is spinning. When the Sun's position changes, the tree's shadow moves too, just like in your experiment. That's how the blanket ended up in the sun.</p>
         <p class="mission-note">☀️ Safety: never look straight at the Sun.</p>`,
        `<button class="btn-gold" data-go="reward">Choose your reward →</button>`,
      ),
    reward: () =>
      frame(
        "Choose your explorer outfit",
        `<p class="mission-text">You solved it on your own! Pick one. You'll also get a golden prism lamp, and a sundial decoration for Dexter's workshop.</p>
         <div class="outfit-row">${MISSION.rewards.choose.map(outfitCard).join("")}</div>
         <p class="mission-feedback" aria-live="polite"></p>`,
      ),
    finish: () =>
      frame(
        playerName ? `Mission complete, ${escape(playerName)}!` : "Mission complete!",
        `<p class="mission-text">Dexter moves the blanket back into the shade and enjoys the picnic. 🧺</p>
         <p class="mission-note">🌍 Try it for real (with a grown-up, on a sunny day): push a stick into the ground and mark the end of its shadow in the morning and again in the afternoon. What changed?</p>`,
        `<button class="btn-gold" data-close>Done</button>`,
      ),
    replay: () =>
      frame(
        "Play again",
        `<p class="mission-text">You've already completed this mission and your rewards are in the backpack. You can replay the experiment any time.</p>`,
        `<button class="btn-gold" data-go="experiment">Replay the experiment</button>`,
      ),
  };

  function render() {
    layer.innerHTML = STEPS[step]();
    layer.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    layer.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    layer.querySelector("[data-hint]")?.addEventListener("click", () => {
      onHint?.();
      layer.querySelector(".mission-feedback").textContent =
        step === "apply" ? "Hint: the shadow goes to the side AWAY from the light. To put shade on the left, where should the light be?" : "Hint: low light (near the ground) makes long shadows; high light makes short ones.";
    });
    if (step === "predict") wirePredict();
    if (step === "experiment") wireLight(checkExperiment);
    if (step === "apply") wireLight(checkApply);
    if (step === "reward") wireReward();
    if (step !== "predict" && layer.querySelector(".m-shadow")) drawShadow();
    if (step === "predict") drawShadow();
  }

  function go(next) {
    if (next === "experiment") {
      tasks = { long: false, short: false };
      light = { x: 300, y: 420 };
      onAttempt?.();
    }
    if (next === "apply") light = { x: 300, y: 400 };
    step = next;
    render();
  }

  function wirePredict() {
    layer.querySelectorAll("[data-predict]").forEach((button) =>
      button.addEventListener("click", () => {
        const choice = PREDICT.choices[Number(button.dataset.predict)];
        layer.querySelector(".mission-feedback").textContent = choice.feedback;
        layer.querySelector('[data-go="experiment"]').hidden = false;
      }),
    );
  }

  function checkExperiment(shade) {
    if (shade.length >= LONG) tasks.long = true;
    if (tasks.long && shade.length <= SHORT) tasks.short = true;
    layer.querySelectorAll("[data-task]").forEach((li) => li.classList.toggle("is-done", tasks[li.dataset.task]));
    const feedback = layer.querySelector(".mission-feedback");
    if (tasks.long && tasks.short) {
      feedback.textContent = "You found it: low light → long shadow, high light → short shadow. And the shadow always points away from the light!";
      layer.querySelector('[data-go="apply"]').hidden = false;
    } else if (tasks.long) feedback.textContent = "Long shadow! Now make it short: move the light up high, above the tree.";
  }

  function checkApply(shade) {
    const solved = covers(shade, BLANKET);
    const blanket = layer.querySelector(".m-blanket");
    blanket?.setAttribute("stroke", solved ? "#2f8f5b" : "#b8126a");
    layer.querySelector(".mission-feedback").textContent = solved
      ? "The whole blanket is in the shade! The light is on the right, so the shadow falls to the left."
      : "";
    layer.querySelector('[data-go="sky"]').hidden = !solved;
  }

  function wireReward() {
    layer.querySelectorAll("[data-choice]").forEach((button) =>
      button.addEventListener("click", async () => {
        layer.querySelectorAll("[data-choice]").forEach((b) => (b.disabled = true));
        const persisted = await onComplete(button.dataset.choice);
        if (!persisted) layer.querySelector(".mission-feedback").textContent = "Saved for this visit only: your browser isn't letting Dexty keep it.";
        setTimeout(() => go("finish"), persisted ? 0 : 1800);
      }),
    );
  }

  layer.hidden = false;
  requestAnimationFrame(() => layer.classList.add("is-open"));
  render();
  return { close };
}
