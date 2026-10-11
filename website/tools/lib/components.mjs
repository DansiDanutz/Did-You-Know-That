// Reusable HTML pieces for the generated pages.
import { html, raw } from "./html.mjs";
import { episodeNumber, episodePath, subjectPath, isPublished, isLocalAsset, thumbnailSources, embedUrl } from "./site.mjs";

const ICONS = {
  youtube:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/></svg>',
  play: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
  search:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="m20 20-4.6-4.6M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"/></svg>',
  lock: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>',
  comment:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 1-2Z"/></svg>',
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
    const { fallback, webp, webpSmall } = thumbnailSources(episode.thumbnail);
    return html`<picture><source type="image/webp" srcset="${webpSmall} 640w, ${webp} 1280w" sizes="${sizes}"><img src="${fallback}" alt="" width="1280" height="720"${loading} decoding="async"></picture>`;
  }
  return html`<img src="${episode.thumbnail}" alt="" width="1280" height="720"${loading} decoding="async" data-thumb-fallback="https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg">`;
}

/** Click-to-play YouTube facade: nothing loads from YouTube until the button is pressed (js/ui/player.js). */
export const videoFacade = (episode, { sizes } = {}) => html`<div class="facade" data-facade data-embed="${embedUrl(episode)}" data-title="${episode.title}">
    ${thumbnailImage(episode, { lazy: false, ...(sizes ? { sizes } : {}) })}
    <button class="facade-play" type="button" data-play>${icon("play")}<span class="visually-hidden">Play “${episode.title}” (loads the YouTube player)</span></button>
  </div>`;

export function episodeCard(episode, index) {
  const art = episode.thumbnail
    ? html`<span class="card-thumb">${thumbnailImage(episode, { sizes: "(min-width: 1000px) 380px, 100vw" })}${isPublished(episode) ? html`<span class="card-play">${icon("play")}</span>` : html`<span class="card-badge">Coming soon</span>`}</span>`
    : html`<span class="card-art"><span class="card-art-no">${episodeNumber(episode)}</span><span class="card-art-word">${episode.subject}</span><span class="card-art-span">1500 → 2100</span></span>`;
  return html`<li class="card ${accentFor(index)}${isPublished(episode) ? "" : " is-draft"}">
  <a class="card-link" href="${episodePath(episode)}">
    ${art}
    <span class="card-body">
      <span class="card-kicker">No. ${episodeNumber(episode)} · ${statusPill(episode)}</span>
      <span class="card-title">${episode.title}</span>
      <span class="card-hook">${episode.hook}</span>
      <span class="card-cta">${isPublished(episode) ? "Play the episode" : "Guess before it premieres"} <span aria-hidden="true">→</span></span>
    </span>
  </a>
</li>`;
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
      glyph: icon("lock"),
      state: request.status === "requested" ? "Requested · vote in the comments" : "Locked · vote in the comments",
      kind: "locked",
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
