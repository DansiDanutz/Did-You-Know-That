// Renders each book face to HTML. Faces are pure functions of the story, the
// session and the translator `t`, so re-rendering after any action is safe.

import { art } from "./art.js";
import { cardMarkup } from "./card.js";

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const LETTERS = "ABCD";

export function buildFaces(story) {
  const faces = [{ type: "cover" }, { type: "inside" }, ...story.pages];
  if (faces.length % 2 === 1) faces.push({ type: "blank" });
  return [...faces, { type: "blank" }, { type: "backcover" }];
}

function withSpark(text, page, found) {
  return escapeHtml(text).replace(/\[\[(.+?)\]\]/g, (_, word) => {
    const isFound = found.has(page.spark?.id);
    return `<button class="spark-word${isFound ? " is-found" : ""}" data-action="spark" data-spark="${page.spark?.id}">${word}</button>`;
  });
}

const folio = (n) => `<span class="folio">${n}</span>`;

const RENDERERS = {
  cover: ({ story, t }) => `
    <div class="cover">
      <div class="cover-frame">
        <span class="cover-episode">${t("cover.episode", { n: story.episode })}</span>
        <img class="cover-logo" src="assets/logo.png" alt="" />
        <h2 class="cover-title">${escapeHtml(story.title)}</h2>
        <div class="cover-medallion">${art(story.card.art)}</div>
        <button class="cover-open" data-action="next">${t("cover.open")}</button>
      </div>
    </div>`,

  inside: ({ story, t }) => `
    <div class="page-inner inside">
      <p class="ex-libris">${t("inside.exlibris")}</p>
      <h3>${t("inside.title")}</h3>
      <ol class="quest-steps">
        ${[1, 2, 3, 4].map((n) => `<li>${t(`inside.step${n}`)}</li>`).join("")}
      </ol>
      <p class="inside-teaser">“${escapeHtml(story.teaser)}”</p>
    </div>`,

  title: ({ page }) => `
    <div class="page-inner title-page">
      <span class="chapter">${escapeHtml(page.chapter)}</span>
      <div class="title-art">${art(page.art)}</div>
      <h2>${escapeHtml(page.heading)}</h2>
      <span class="flourish">❦</span>
    </div>`,

  story: ({ page, session, index, t }) => {
    const found = session.sparks;
    const note = found.has(page.spark.id)
      ? `<aside class="spark-note"><b>${t("story.didyouknow")}</b> ${escapeHtml(page.spark.note)}</aside>`
      : `<p class="spark-hint">${t("story.hint")}</p>`;
    return `
      <div class="page-inner story-page">
        <div class="story-art">${art(page.art)}</div>
        <h3>${escapeHtml(page.heading)}</h3>
        ${page.text.map((text, i) => `<p class="${i === 0 ? "drop-cap" : ""}">${withSpark(text, page, found)}</p>`).join("")}
        ${note}
        ${folio(index - 1)}
      </div>`;
  },

  mission: ({ story, index, t }) => `
    <div class="page-inner mission-page">
      <span class="chapter">${t("mission.kicker")}</span>
      <h3>🔍 ${t("mission.title")}</h3>
      <ol class="mission-list">
        ${story.mission.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ol>
      <p class="mission-note">${t("mission.note")}</p>
      ${folio(index - 1)}
    </div>`,

  gate: ({ story, session, gate, index, t }) => {
    if (session.gateOpen) {
      return `
        <div class="page-inner gate-page is-open">
          <div class="seal-wrap broken">${art("seal", "art seal-half left")}${art("seal", "art seal-half right")}</div>
          <h3>${t("gate.broken")}</h3>
          <p>${t("gate.brokenText")}</p>
          ${folio(index - 1)}
        </div>`;
    }
    return `
      <div class="page-inner gate-page">
        <div class="seal-wrap">${art("seal")}</div>
        <h3>${t("gate.title")}</h3>
        <p>${t("gate.sealed")}</p>
        <button class="btn-gold" data-action="listen">${t(story.youtubeId ? "gate.listen" : "gate.channel")}</button>
        <form class="secret-form" data-action="secret">
          <label for="secret-${story.id}">${t("gate.secretLabel")}</label>
          <div class="secret-row">
            <input id="secret-${story.id}" name="secret" autocomplete="off" placeholder="${t("gate.secretPlaceholder")}" maxlength="24" />
            <button type="submit" class="btn-ink">${t("gate.break")}</button>
          </div>
          <p class="secret-msg" aria-live="polite">${gate.message ? t(gate.message) : ""}</p>
        </form>
        ${folio(index - 1)}
      </div>`;
  },

  quiz: ({ page, session, index, t }) => {
    const state = session.quiz[page.id] ?? { picked: [], solved: false };
    const choices = page.choices
      .map((choice, i) => {
        const picked = state.picked.includes(i);
        const cls = picked ? (i === page.answer ? "is-right" : "is-wrong") : "";
        const disabled = state.solved || picked ? "disabled" : "";
        return `<button class="choice ${cls}" data-action="answer" data-quiz="${page.id}" data-choice="${i}" ${disabled}>
          <span class="choice-letter">${LETTERS[i]}</span>${escapeHtml(choice)}</button>`;
      })
      .join("");
    const verdict = ["", "quiz.first", "quiz.second"][state.picked.length] || "quiz.later";
    const result = state.solved ? `<p class="quiz-explain"><b>${t(verdict)}</b> ${escapeHtml(page.explain)}</p>` : "";
    return `
      <div class="page-inner quiz-page${page.choices.length > 3 ? " is-dense" : ""}">
        <div class="guardian" aria-hidden="true">🦉</div>
        <span class="chapter">${t("quiz.asks")}</span>
        <h3>${escapeHtml(page.question)}</h3>
        <div class="choices">${choices}</div>
        ${result}
        ${folio(index - 1)}
      </div>`;
  },

  reward: ({ story, session, rarity, firstSeason, sparkCount, maxSparks, playerName, index, t }) => `
    <div class="page-inner reward-page">
      <span class="chapter">${t("reward.kicker")}</span>
      ${session.cardClaimed
        ? `<div class="mini-card">${cardMarkup(story.card, rarity, { t, firstSeason })}</div>
           <p>${playerName ? `${t("name.wellDone", { name: escapeHtml(playerName) })} ` : ""}${t("reward.saved")}</p>
           ${story.youtubeId ? `<button class="btn-gold" data-action="listen">${t("home.watch")}</button>` : ""}`
        : `<button class="card-back-btn" data-action="reveal" aria-label="${t("reward.aria")}">
             <span class="card-back-face"><img src="assets/logo.png" alt="" /></span>
           </button>
           <p>${t("reward.tap", { n: sparkCount, max: maxSparks })}</p>`}
      ${folio(index - 1)}
    </div>`,

  end: ({ session, index, t }) => `
    <div class="page-inner end-page">
      <h2>${t("end.title")}</h2>
      <p class="for-now">${t("end.forNow")}</p>
      <p>${t("end.text")}</p>
      <button class="btn-gold" data-action="continue" ${session.cardClaimed ? "" : "disabled"}>${t("end.continue")}</button>
      <button class="btn-ink" data-action="inventory">${t("end.album")}</button>
      ${folio(index - 1)}
    </div>`,

  blank: () => `<div class="page-inner blank-page"><span class="flourish">❦</span></div>`,
  backcover: () => `<div class="cover back"></div>`,
};

export function renderFace(face, ctx) {
  const render = RENDERERS[face.type] ?? RENDERERS.blank;
  return render({ ...ctx, page: face });
}

export function isFaceComplete(face, session) {
  if (face.type === "reward") return session.cardClaimed;
  return true;
}

export const BLOCKED_HINT = {
  reward: "blocked.reward",
};
