// Public, account-free discovery pages: /e/<slug>/index.html, one per episode
// and audience. Static HTML so link previews (which don't run scripts) see the
// right title, description and image. Pure: returns { path: html }.

import { STORIES } from "../js/data/stories.js";
import { LOCALES } from "../js/i18n/index.js";
import { localizeStory, AUDIENCES } from "../js/lib/localize.js";
import { catalogFor, isPlayable } from "../js/lib/episode-schema.js";

export const SITE = "https://dexty.live";
const SOCIAL_IMAGE = `${SITE}/assets/icons/icon-512.png`;
const LANGUAGE_NAMES = { en: "English", ro: "Română", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", zh: "中文" };
const AUDIENCE_LABEL = { kids: "Kids", adults: "Teens & Adults" };

const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const plain = (text) => String(text ?? "").replace(/\[\[(.+?)\]\]/g, "$1").replace(/<[^>]+>/g, "");
const ui = LOCALES.en.ui;

function readable(story) {
  return story.pages
    .filter((page) => page.type === "story")
    .map((page) => `<section><h3>${escape(page.heading)}</h3>${(page.text ?? []).map((p) => `<p>${escape(plain(p))}</p>`).join("")}</section>`)
    .join("");
}

function videoBlock(story, publication) {
  if (isPlayable(publication)) {
    const id = escape(publication.youtubeId);
    return `<div class="ep-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${escape(story.title)} (YouTube)" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>
      <p class="ep-video-link"><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">▶ Open in YouTube</a></p>`;
  }
  return `<div class="ep-soon" role="status"><b>🎬 Coming soon</b><p>Dexter is still making this episode. You can read the whole story below and save its card today.</p></div>`;
}

function page(story, publication, audience, related) {
  const url = `${SITE}/e/${publication.slug}/`;
  const title = `${story.title} · Did You Know That?`;
  const description = plain(story.teaser);
  const narration = publication.narrationLanguages.map((code) => LANGUAGE_NAMES[code] ?? code).join(", ") || "not yet recorded";
  const relatedHtml = related.length
    ? `<section class="ep-related"><h2>More discoveries</h2><ul>${related.map((r) => `<li><a href="/e/${escape(r.publication.slug)}/">${escape(r.title)}</a></li>`).join("")}</ul></section>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Did You Know That?" />
    <meta property="og:title" content="${escape(story.title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SOCIAL_IMAGE}" />
    <meta name="twitter:card" content="summary" />
    <meta name="theme-color" content="#0b0726" />
    <link rel="icon" href="/assets/logo.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/css/episode.css" />
  </head>
  <body>
    <header class="ep-top"><a href="/" class="ep-brand"><img src="/assets/logo.png" alt="" width="36" height="36" /> Did You Know That?</a></header>
    <main class="ep" data-card="${escape(story.card.id)}" data-audience="${audience}" data-url="${url}" data-title="${escape(story.title)}">
      <p class="ep-badge">${AUDIENCE_LABEL[audience]} · Episode ${story.episode}</p>
      <h1>${escape(story.title)}</h1>
      <p class="ep-hook">${escape(description)}</p>
      ${videoBlock(story, publication)}
      <p class="ep-langs">Video language: ${LANGUAGE_NAMES[publication.videoLanguage] ?? publication.videoLanguage} · Book narration: ${escape(narration)}</p>
      <section class="ep-card" aria-labelledby="card-title">
        <h2 id="card-title">🃏 ${escape(story.card.name)}</h2>
        <p>${escape(plain(story.card.fact))}</p>
        <div class="ep-actions">
          <button class="ep-btn gold" type="button" data-save>Save this card</button>
          <button class="ep-btn" type="button" data-share>🔗 Share</button>
        </div>
        <p class="ep-msg" aria-live="polite"></p>
        <p class="ep-note">Your card stays on this device; you can back it up in the app's Settings.</p>
      </section>
      <section class="ep-read" aria-labelledby="read-title">
        <h2 id="read-title">📖 Read the story</h2>
        ${readable(story)}
      </section>
      <section class="ep-sources"><h2>Sources</h2><p>Being checked for publication; every source will be listed here with a link.</p></section>
      ${relatedHtml}
      <p class="ep-open"><a class="ep-btn gold" href="/?audience=${audience}&amp;story=${escape(story.id)}">Open this story in the app →</a></p>
    </main>
    <script type="module" src="/js/episode-page.js"></script>
  </body>
</html>
`;
}

// { "e/<slug>/index.html": html } for every episode with publication data.
export function renderEpisodePages() {
  const files = {};
  for (const audience of AUDIENCES) {
    const entries = catalogFor(STORIES, audience).map(({ id, publication }) => ({
      publication,
      story: localizeStory(STORIES.find((s) => s.id === id), LOCALES.en, LOCALES.en, audience),
    }));
    for (const { story, publication } of entries) {
      const related = entries.filter((other) => other.story.id !== story.id).map((other) => ({ title: other.story.title, publication: other.publication }));
      files[`e/${publication.slug}/index.html`] = page(story, publication, audience, related);
    }
  }
  return files;
}
