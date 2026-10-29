// Reusable HTML pieces for the generated pages.
import { html, raw } from "./html.mjs";
import { episodeNumber, episodePath, subjectPath, isPublished, isLocalAsset, thumbnailSources, embedUrl } from "./site.mjs";
import { LANGUAGES, DEFAULT_LANGUAGE } from "../../js/lib/player-prefs.js";
import { languageGroups } from "../../js/lib/localizations.js";

const ICONS = {
  youtube:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/></svg>',
  play: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
  search:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="m20 20-4.6-4.6M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"/></svg>',
  lock: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>',
  comment:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 1-2Z"/></svg>',
  home: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1v-9.5Z"/></svg>',
  grid: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
  sun: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
  cards: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="3" width="13" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4 7v11.5A2.5 2.5 0 0 0 6.5 21H15"/></svg>',
  gem: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M6.5 3.5h11l4 5.5L12 21 2.5 9l4-5.5ZM2.5 9h19M9 3.5 12 21l3-17.5"/></svg>',
  share: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  bulb: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Zm-3 18h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1Z"/></svg>',
};

export const icon = (name) => raw(ICONS[name]);

/** Neon accent colour classes cycle so neighbouring subjects never share a colour. */
const ACCENTS = ["orange", "magenta", "cyan", "green", "purple", "blue"];
export const accentFor = (index) => `accent-${ACCENTS[index % ACCENTS.length]}`;

export const statusPill = (episode) =>
  isPublished(episode)
    ? html`<span class="pill pill-live">Watch now</span>`
    : html`<span class="pill pill-soon">Coming soon</span>`;

/** Episode artwork: self-hosted <picture> (webp + png/jpg) or, failing that, YouTube's thumbnail. */
export function thumbnailImage(episode, { sizes = "(min-width: 1200px) 1150px, 100vw", lazy = true } = {}) {
  const loading = lazy ? html` loading="lazy"` : "";
  if (isLocalAsset(episode.thumbnail)) {
    const { fallback, webp, webpSmall } = thumbnailSources(episode.thumbnail, episode.thumbnailVersion);
    return html`<picture><source type="image/webp" srcset="${webpSmall} 640w, ${webp} 1280w" sizes="${sizes}"><img src="${fallback}" alt="" width="1280" height="720"${loading} decoding="async"></picture>`;
  }
  return html`<img src="${episode.thumbnail}" alt="" width="1280" height="720"${loading} decoding="async" data-thumb-fallback="https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg">`;
}

/** `data-localizations='{"ro":{"subtitles":"…"}}'` when the episode has localizations (js/ui/player.js); nothing otherwise. */
function localizationsAttribute(episode) {
  const localizations = episode.localizations;
  return localizations && Object.keys(localizations).length ? html` data-localizations='${JSON.stringify(localizations)}'` : "";
}

/** Click-to-play YouTube facade: nothing loads from YouTube until the button is pressed (js/ui/player.js). */
export const videoFacade = (episode, { sizes } = {}) => html`<div class="facade" data-facade data-embed="${embedUrl(episode)}"${localizationsAttribute(episode)} data-title="${episode.title}">
    ${thumbnailImage(episode, { lazy: false, ...(sizes ? { sizes } : {}) })}
    <button class="facade-play" type="button" data-play>${icon("play")}<span class="visually-hidden">Play “${episode.title}” (loads the YouTube player)</span></button>
  </div>`;

/**
 * Mute toggle + language picker for an episode player (js/ui/player.js). Hidden until the script runs;
 * choosing only saves a preference — nothing loads from YouTube until play is pressed. The picker groups
 * the languages for this episode: our subtitles (and voice-over) versus YouTube's auto-translated captions.
 */
export const playerControls = (episode = {}) => {
  const { localized, auto } = languageGroups(episode.localizations);
  const english = LANGUAGES.find(({ code }) => code === DEFAULT_LANGUAGE);
  const option = ({ code, label }, text = label) => html`<option value="${code}" lang="${code}">${text}</option>`;
  return html`<div class="player-controls" data-player-controls hidden>
    <button class="btn btn-ghost btn-small player-mute" type="button" data-player-mute aria-pressed="false"><span aria-hidden="true" data-mute-icon>🔊</span><span>Mute</span></button>
    <label class="player-lang"><span>Language</span>
      <select data-player-lang>
        <option value="${english.code}" lang="${english.code}" selected>${english.label}</option>
        ${localized.length ? html`<optgroup label="Subtitles and voice-over by Dexty">${localized.map((language) => option(language, `${language.label} · ${language.voiceOver ? "subtitles + voice-over" : "subtitles"}`))}</optgroup>` : ""}
        <optgroup label="YouTube auto-translated captions">${auto.map((language) => option(language))}</optgroup>
      </select>
    </label>
  </div>
  <p class="player-hint" data-player-hint aria-live="polite" hidden></p>`;
};

export function episodeCard(episode, index, { newest = false } = {}) {
  const published = isPublished(episode);
  const badge = published ? "" : html`<span class="card-badge">Coming soon</span>`;
  const art = episode.thumbnail
    ? html`<span class="card-thumb">${thumbnailImage(episode, { sizes: "(min-width: 1000px) 380px, 100vw" })}${published ? html`<span class="card-play">${icon("play")}</span>` : ""}${badge}</span>`
    : html`<span class="card-art"><span class="card-art-no">${episodeNumber(episode)}</span><span class="card-art-word">${episode.subject}</span><span class="card-art-span">1500 → 2100</span>${badge}</span>`;
  return html`<li class="card ${accentFor(index)}${published ? "" : " is-draft"}">
  <a class="card-link" href="${episodePath(episode)}">
    ${art}
    <span class="card-body">
      <span class="card-kicker">No. ${episodeNumber(episode)} · ${statusPill(episode)}${newest && published ? html` <span class="pill pill-new">New episode</span>` : ""}</span>
      <span class="card-title">${episode.title}</span>
      <span class="card-hook">${episode.hook}</span>
      <span class="card-progress" data-ep-progress="${episode.slug}" hidden></span>
      <span class="card-cta">${published ? "Play the episode" : "Guess before it premieres"} <span aria-hidden="true">→</span></span>
    </span>
  </a>
</li>`;
}

/** The subject marked "next" in data/episodes.json: a teaser only (a question, never a claim). */
export const comingNextCard = (request) => html`<li class="card card-next accent-purple">
  <a class="card-link" href="${subjectPath(request.slug)}">
    <span class="card-art"><span class="card-art-no">Next</span><span class="card-art-word">${request.subject}</span><span class="card-art-span">1500 → 2100</span><span class="card-badge">Coming next</span></span>
    <span class="card-body">
      <span class="card-kicker">Next episode · in production</span>
      <span class="card-title">${request.subject}</span>
      <span class="card-hook">${request.pitch}</span>
      <span class="card-cta">See the teaser <span aria-hidden="true">→</span></span>
    </span>
  </a>
</li>`;

/** "You choose the next subject": the subject asked for most in the comments becomes an episode. */
export const suggestCard = (href) => html`<li class="card card-suggest">
  <a class="card-link" href="${href}" rel="noopener">
    <span class="card-art"><span class="card-art-no">??</span><span class="card-art-word">You choose</span><span class="card-art-span">the next subject</span></span>
    <span class="card-body">
      <span class="card-kicker">Suggest a subject</span>
      <span class="card-title">Your subject here</span>
      <span class="card-hook">Write the subject you want traced from 1500 to 2100 in the YouTube comments. The one asked for most becomes a future episode.</span>
      <span class="card-cta">Suggest it on YouTube <span aria-hidden="true">→</span></span>
    </span>
  </a>
</li>`;

/** Numbered heading of one journey step on the episode page. */
export const stepHead = (number, id, title, lede = "") => html`<div class="step-head">
    <span class="step-num" aria-hidden="true">${number}</span>
    <div><h2 class="step-title" id="${id}">${title}</h2>${lede ? html`<p class="step-lede">${lede}</p>` : ""}</div>
  </div>`;

export const hasLadder = (episode) => episode.eras.some((era) => era.rung);

/**
 * "How we saw it": the episode's eras as a ladder you climb, 1500 at the bottom. Without JavaScript
 * every rung's panel is visible; js/ui/ladder.js turns it into a keyboard-friendly tab list.
 */
export function ladder(episode, { titleId = "ladder-title" } = {}) {
  const eras = episode.eras;
  const panelId = (i) => `${episode.slug}-rung-${i}`;
  return html`<div class="ladder" data-ladder>
    <ol class="ladder-rungs" role="list" data-ladder-rungs aria-labelledby="${titleId}">
      ${eras.map((era, i) => html`<li class="rung${era.prediction ? " is-prediction" : ""}"><a class="rung-btn" href="#${panelId(i)}" data-rung="${i}"><span class="rung-year">${era.year}</span><span class="rung-label">${era.rung}</span></a></li>`)}
    </ol>
    <div class="ladder-panels">
      ${eras.map((era, i) => html`<section class="rung-panel${era.prediction ? " is-prediction" : ""}" id="${panelId(i)}" data-rung-panel="${i}" aria-label="${era.year}: ${era.rung}">
        <p class="rung-panel-kicker">${era.year} · ${era.prediction ? "Prediction · a scenario, not a fact" : `You wake up: ${era.place}`}</p>
        <p class="rung-panel-rung">${era.rung}</p>
        <blockquote class="rung-panel-saw">“${era.saw}”</blockquote>
        <p class="rung-panel-line">${era.line}</p>
      </section>`)}
    </div>
  </div>`;
}

function boardNode({ href, label, glyph, state, kind, accent }) {
  return html`<li class="node node-${kind} ${accent}">
  <a href="${href}">
    <span class="node-orb" aria-hidden="true"><span class="node-glyph">${glyph}</span></span>
    <span class="node-label">${label}</span>
    <span class="node-state">${state}</span>
  </a>
</li>`;
}

/** The subject map: published = lit, coming soon = dim "?", requested = locked. */
export function subjectBoard(catalog) {
  const episodeNodes = catalog.episodes.map((episode, i) =>
    boardNode({
      href: episodePath(episode),
      label: episode.subject,
      glyph: isPublished(episode) ? episodeNumber(episode) : "?",
      state: isPublished(episode) ? `No. ${episodeNumber(episode)} · Play` : `No. ${episodeNumber(episode)} · Coming soon`,
      kind: isPublished(episode) ? "lit" : "dim",
      accent: accentFor(i),
    }),
  );
  const requestNodes = (catalog.requested ?? []).map((request, i) =>
    boardNode({
      href: subjectPath(request.slug),
      label: request.subject,
      glyph: request.status === "next" ? "?" : icon("lock"),
      state: request.status === "next" ? "Coming next" : request.status === "requested" ? "Requested · vote in the comments" : "Locked · vote in the comments",
      kind: request.status === "next" ? "dim" : "locked",
      accent: accentFor(i + catalog.episodes.length),
    }),
  );
  return html`<ol class="board" aria-label="Subject map">${episodeNodes}${requestNodes}</ol>`;
}

/** A "Did you know that…" fact card in the neon style of the videos. */
export function factCard(card, episode, { locked = false, shareable = false } = {}) {
  const label = `No. ${episodeNumber(episode)} · ${episode.subject}`;
  if (locked) {
    return html`<li class="fact-card is-locked" data-card-id="${card.id}">
  <span class="fact-head">${icon("lock")} Locked card</span>
  <span class="fact-year">${card.year}</span>
  <span class="fact-text" data-fact-text>${episode.quiz?.questions?.length ? html`Unlocks when you answer its question in the <a href="${episodePath(episode)}">${episode.title}</a> quiz.` : html`Unlocks with the quiz for <a href="${episodePath(episode)}">${episode.title}</a> — coming soon.`}</span>
  <span class="fact-foot">${label}</span>
</li>`;
  }
  return html`<li class="fact-card" data-card-id="${card.id}">
  <span class="fact-head">${icon("bulb")} Did you know that…</span>
  <span class="fact-year">${card.year}</span>
  <span class="fact-text">${card.fact}</span>
  <span class="fact-foot">${label} · <span class="fact-source">${card.source}</span></span>
  ${shareable ? html`<button class="btn btn-ghost btn-small" type="button" data-share-card="${card.id}">Share this card</button>` : ""}
</li>`;
}

export const keywordChips = (keywords, limit = keywords.length) =>
  html`<ul class="chips">${keywords.slice(0, limit).map((word) => html`<li><a class="chip" href="/?q=${encodeURIComponent(word)}#map">${word}</a></li>`)}</ul>`;
