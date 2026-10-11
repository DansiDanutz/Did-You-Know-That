// Collection page, 404 page, sitemap.xml.
import { html } from "./html.mjs";
import { page } from "./layout.mjs";
import { SITE, episodeNumber, episodePath, subjectPath, absolute } from "./site.mjs";
import { icon, factCard } from "./components.mjs";
import { RANKS, maxPointsFor } from "../../js/lib/progress.js";

export function collectionPage(catalog) {
  const total = catalog.episodes.reduce((sum, e) => sum + e.facts.length, 0);
  const maxPoints = maxPointsFor(catalog);
  const main = html`<section class="wrap collection-hero" aria-labelledby="collection-title">
  <p class="section-kicker">Your collection</p>
  <h1 id="collection-title" class="section-title">“Did you know that…” cards</h1>
  <p class="section-lede">Lock a guess, then answer the episode quiz: every right answer unlocks a card and right-first-time answers earn points. Everything stays in this browser: no account, no tracking.</p>
  <p class="profile-greeting" data-profile-greeting hidden></p>
  <div class="rank-panel" data-rank-panel>
    <p class="rank-title">Explorer rank: <strong data-rank-name>${RANKS[0].name}</strong></p>
    <p class="rank-progress"><strong data-points>0</strong> points · <span data-collected>0</span> of ${total} cards collected</p>
    <progress class="rank-meter" max="${maxPoints}" value="0" data-rank-meter aria-label="Points">0</progress>
    <ol class="rank-ladder">${RANKS.map((rank) => html`<li data-rank-step="${rank.min}"><strong>${rank.name}</strong> <span>${rank.min === 0 ? "start" : `${rank.min}+ points`}</span></li>`)}</ol>
    <p class="rank-note">Points come from quiz answers — never from watching. They never expire and can’t be bought.</p>
  </div>
</section>
<section class="wrap shared-card" data-shared-card hidden aria-labelledby="shared-title">
  <h2 id="shared-title" class="small-title">Someone shared a card with you</h2>
  <ul class="fact-grid fact-grid-single" data-shared-slot></ul>
  <p class="cta-row"><a class="btn btn-primary" href="/#series" data-shared-play>Play the episode and collect it</a></p>
</section>
${catalog.episodes.map((episode) => html`<section class="wrap collection-set" aria-labelledby="set-${episode.slug}">
  <h2 id="set-${episode.slug}" class="small-title">No. ${episodeNumber(episode)} · <a href="${episodePath(episode)}">${episode.title}</a></h2>
  <ul class="fact-grid" data-collection-scope="${episode.slug}">${episode.facts.map((card) => factCard(card, episode, { locked: true }))}</ul>
</section>`)}
<section class="wrap collection-tools">
  <p class="collection-status" role="status" aria-live="polite" data-collection-status></p>
  <button class="btn btn-ghost btn-small" type="button" data-forget>Forget my progress</button>
</section>`;
  return page({
    newsletter: catalog.newsletter,
    title: `Your collection · ${SITE.name}`,
    description: "Collect the “Did you know that…” cards from every episode of Did You Know That? Guess first, then answer the quiz.",
    path: "/collection/",
    currentPath: "/collection/",
    main,
  });
}

export function notFoundPage(catalog) {
  const main = html`<section class="wrap not-found" data-not-found>
  <p class="section-kicker">404</p>
  <h1 class="section-title">Did you know that… this page doesn’t exist?</h1>
  <p class="section-lede" data-not-found-message>Try a subject word instead.</p>
  <p class="cta-row"><a class="btn btn-primary" href="/#map">${icon("search")}<span>Search by subject</span></a><a class="btn btn-ghost" href="/">Home</a></p>
</section>`;
  return page({ newsletter: catalog.newsletter, title: `Page not found · ${SITE.name}`, description: "This page does not exist.", path: "/404.html", noindex: true, main });
}

/** Served by the service worker when a page is requested offline and not in the cache. */
export function offlinePage(catalog) {
  const main = html`<section class="wrap not-found offline">
  <img class="offline-bulb" src="/assets/brand/avatar-384.webp" width="192" height="192" alt="">
  <p class="section-kicker">Offline</p>
  <h1 class="section-title">Did you know that… you’re offline?</h1>
  <p class="section-lede">This page isn’t saved on your device yet. Pages you’ve opened before still work — and your guesses and cards are safe in this browser.</p>
  <p class="cta-row"><a class="btn btn-primary" href="/">Home</a><a class="btn btn-ghost" href="/collection/">Your collection</a></p>
</section>`;
  return page({ newsletter: catalog.newsletter, title: `Offline · ${SITE.name}`, description: "You are offline.", path: "/offline/", noindex: true, main });
}

export function sitemap(catalog) {
  const paths = [
    "/",
    "/collection/",
    ...catalog.episodes.map(episodePath),
    ...catalog.episodes.map((e) => subjectPath(e.subjectSlug)),
    ...(catalog.requested ?? []).map((r) => subjectPath(r.slug)),
  ];
  const urls = paths.map((path) => `  <url><loc>${absolute(path)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
