// The home page: banner hero, featured episode + newsletter, episode rail, subject search + map, the rule, about.
import { html } from "./html.mjs";
import { page } from "./layout.mjs";
import {
  SITE, SUBSCRIBE_URL, CHANNEL_URL, HANDLE_URL, commentUrl, absolute, featuredEpisode, latestPublished, isPublished, episodeNumber, episodePath, watchUrl,
} from "./site.mjs";
import { icon, episodeCard, comingNextCard, suggestCard, subjectBoard, videoFacade, thumbnailImage } from "./components.mjs";
import { newsletterBlock } from "./newsletter.mjs";

const SEARCH_EXAMPLES = ["time", "sun", "sleep", "weekend", "phone"];

// The real channel banner is the hero. Phones get a tighter crop so the wordmark stays legible;
// both sources are preloaded by media query so the LCP image starts downloading with the HTML.
const BANNER = {
  mobile: { media: "(max-width: 639px)", srcset: "/assets/brand/hero-mobile-800.webp 800w, /assets/brand/hero-mobile-1200.webp 1200w", sizes: "100vw", width: 1200, height: 272 },
  wide: { media: "(min-width: 640px)", srcset: "/assets/brand/hero-1600.webp 1600w, /assets/brand/hero-2560.webp 2560w", sizes: "143vw", width: 1600, height: 238 },
};
const heroPreloads = [BANNER.mobile, BANNER.wide].map(({ media, srcset, sizes }) => ({ type: "image/webp", media, srcset, sizes }));

const HOW_IT_WORKS = [
  ["bulb", "Guess", "Lock a guess before the answer."],
  ["play", "Watch", "Seven centuries in ten minutes."],
  ["comment", "Quiz", "One question per era."],
  ["cards", "Collect", "Right answers unlock fact cards."],
];

const hero = (catalog) => {
  const episode = featuredEpisode(catalog);
  const start = episode ? `${episodePath(episode)}#guess` : "/episodes/";
  return html`<section class="hero" aria-labelledby="hero-title">
  <div class="hero-sky" aria-hidden="true"><span class="nebula n1"></span><span class="nebula n2"></span><span class="nebula n3"></span><canvas class="hero-dust" data-dust></canvas></div>
  <h1 id="hero-title" class="hero-banner">
    <span class="hero-glow" aria-hidden="true"></span>
    <picture>
      <source type="image/webp" media="${BANNER.mobile.media}" srcset="${BANNER.mobile.srcset}" sizes="${BANNER.mobile.sizes}" width="${BANNER.mobile.width}" height="${BANNER.mobile.height}">
      <source type="image/jpeg" media="${BANNER.mobile.media}" srcset="/assets/brand/hero-mobile-1200.jpg" width="${BANNER.mobile.width}" height="${BANNER.mobile.height}">
      <source type="image/webp" srcset="${BANNER.wide.srcset}" sizes="${BANNER.wide.sizes}" width="${BANNER.wide.width}" height="${BANNER.wide.height}">
      <img class="hero-banner-img" src="/assets/brand/hero-1600.jpg" width="${BANNER.wide.width}" height="${BANNER.wide.height}" alt="Did You Know That?" fetchpriority="high" decoding="async">
    </picture>
  </h1>
  <div class="wrap hero-inner">
    <p class="lede hero-lede">A history mystery game. Every episode follows one thing — time, the Sun, school, money, whatever you vote for — from 1500 to 2100.</p>
    <ol class="how" aria-label="How it works">
      ${HOW_IT_WORKS.map(([glyph, title, text], i) => html`<li class="how-step"><span class="how-icon" aria-hidden="true">${icon(glyph)}</span><span class="how-text"><strong>${i + 1}. ${title}</strong><span>${text}</span></span></li>`)}
    </ol>
    <div class="cta-row">
      <a class="btn btn-primary btn-big" href="${start}">${icon("play")}<span>${episode && isPublished(episode) ? "Play the newest episode" : "Guess the first episode"}</span></a>
      <a class="btn btn-ghost" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a>
    </div>
    <p class="hero-note">Free. No account, no tracking — your points stay on this device.</p>
  </div>
</section>`;
};

function featuredMedia(episode) {
  if (isPublished(episode)) return videoFacade(episode, { sizes: FEATURE_SIZES });
  const art = episode.thumbnail
    ? html`<span class="poster-art" aria-hidden="true">${thumbnailImage(episode, { lazy: false, sizes: FEATURE_SIZES })}</span>`
    : html`<span class="poster-word" aria-hidden="true">${episode.subject}</span>`;
  return html`<div class="poster featured-poster${episode.thumbnail ? " has-art" : ""}">${art}<span class="pill pill-soon">Premieres soon</span></div>`;
}

const FEATURE_SIZES = "(min-width: 1200px) 720px, (min-width: 960px) 60vw, 100vw";

function featured(catalog) {
  const episode = featuredEpisode(catalog);
  if (!episode) return "";
  const published = isPublished(episode);
  return html`<section class="section section-featured" id="featured" aria-labelledby="featured-title">
  <div class="wrap featured">
    <div class="featured-media">${featuredMedia(episode)}</div>
    <div class="featured-body">
      <p class="section-kicker">${published ? html`<span class="pill pill-new">New</span> Newest episode` : "Premieres soon"} · No. ${episodeNumber(episode)}</p>
      <h2 id="featured-title" class="featured-title">${episode.title}</h2>
      <p class="featured-hook">${episode.hook}</p>
      <p class="featured-question">${episode.question}</p>
      <p class="cta-row">
        ${published
          ? html`<a class="btn btn-primary" href="${episodePath(episode)}#guess">${icon("bulb")}<span>Start: guess, then watch</span></a><a class="btn btn-ghost" href="${watchUrl(episode)}" rel="noopener">${icon("youtube")}<span>Watch on YouTube</span></a>`
          : html`<a class="btn btn-primary" href="${episodePath(episode)}#guess">${icon("bulb")}<span>Guess before it premieres</span></a><a class="btn btn-ghost" href="${episodePath(episode)}"><span>Episode details</span></a>`}
      </p>
      ${published ? html`<p class="player-note">Nothing loads from YouTube until you press play (youtube-nocookie.com).</p>` : ""}
    </div>
  </div>
</section>`;
}

/** Returning players only: js/ui/progress-ui.js fills this from local progress (hidden for first visits). */
const continueCard = () => html`<section class="section-tight wrap" id="continue" aria-labelledby="continue-title" data-continue hidden>
  <a class="continue" href="/episodes/" data-continue-link>
    <span class="continue-kicker" id="continue-title" data-continue-kicker>Continue where you left off</span>
    <strong class="continue-title" data-continue-episode></strong>
    <span class="continue-meta" data-continue-meta></span>
    <span class="continue-go"><span data-continue-step>Continue</span> <span aria-hidden="true">→</span></span>
  </a>
</section>`;

/** "Did you know?" of the day (js/ui/daily.js). The fallback text is what shows without JavaScript. */
const daily = () => html`<section class="section section-daily" id="daily" aria-labelledby="daily-title">
  <div class="wrap">
    <p class="section-kicker">${icon("sun")} Every day</p>
    <h2 id="daily-title" class="section-title">Did you know? Fact of the day</h2>
    <p class="section-lede">One question a day from the episodes. Answer it right first time for 5 points — or just read the fact. Skipping costs nothing.</p>
    <div class="daily" data-daily>
      <p class="daily-loading" data-daily-loading>Loading today’s question…</p>
      <noscript><p class="quiz-wait">Turn on JavaScript for the daily question.</p></noscript>
    </div>
  </div>
</section>`;

const collect = (catalog) => {
  const total = catalog.episodes.reduce((sum, e) => sum + e.facts.length, 0);
  return html`<section class="section section-collect" id="collect" aria-labelledby="collect-title">
  <div class="wrap collect">
    <div>
      <p class="section-kicker">${icon("cards")} Your collection</p>
      <h2 id="collect-title" class="section-title">Collect every card</h2>
      <p class="section-lede">Every right quiz answer unlocks a “Did you know that…” card. Points climb your rank and open Special Cards in the Vault. They never expire and can’t be bought.</p>
      <div class="set-meter" data-collection-meter data-total="${total}">
        <p class="set-meter-text"><strong data-set-count>0</strong> of ${total} cards · rank <strong data-rank-name>Curious</strong></p>
        <progress class="rank-meter" max="${total}" value="0" data-set-progress aria-label="Cards collected">0</progress>
      </div>
      <p class="cta-row"><a class="btn btn-primary" href="/collection/">${icon("cards")}<span>Your collection</span></a><a class="btn btn-ghost" href="/vault/">${icon("gem")}<span>Card Vault</span></a></p>
    </div>
    <div class="collect-fan" aria-hidden="true">
      <span class="fan-card fan-1">1500</span><span class="fan-card fan-2">1800</span><span class="fan-card fan-3">2100</span>
    </div>
  </div>
</section>`;
};

const community = (catalog) => {
  const latest = latestPublished(catalog);
  return html`<section class="section section-community" id="community" aria-labelledby="community-title">
  <div class="wrap">
    <p class="section-kicker">${icon("comment")} Join in</p>
    <h2 id="community-title" class="section-title">Your comment could be next</h2>
    <div class="features">
      <article class="feature">
        <h3>Comment of the Week</h3>
        <p>Every episode ends with the best comment from the one before, read out on screen.${latest ? html` This week’s question: <em>“${latest.commentPrompt}”</em>` : ""}</p>
        <p class="cta-row"><a class="btn btn-primary btn-small" href="${commentUrl(catalog)}" rel="noopener">${icon("comment")}<span>Answer on YouTube</span></a></p>
      </article>
      <article class="feature">
        <h3>Suggest the next subject</h3>
        <p>Tell us what you want traced from 1500 to 2100. The subject asked for most becomes a future episode.</p>
        <p class="cta-row"><a class="btn btn-ghost btn-small" href="${commentUrl(catalog)}" rel="noopener">${icon("bulb")}<span>Suggest a subject</span></a></p>
      </article>
    </div>
  </div>
</section>`;
};

const newsletter = (catalog) => html`<section class="wrap section-tight" aria-label="Newsletter">${newsletterBlock(catalog.newsletter, { id: "home", className: "newsletter-home" })}</section>`;

/** Where "Surprise me" sends people before anything is published: the next premiere's guess. */
const nextGuessUrl = (catalog) => {
  const episode = featuredEpisode(catalog);
  return episode ? `${episodePath(episode)}#guess` : "/#featured";
};

const subjects = (catalog) => html`<section class="section section-map" id="map" aria-labelledby="map-title">
  <div class="wrap">
    <p class="section-kicker">${icon("search")} Find a subject</p>
    <h2 id="map-title" class="section-title">Any word. One mystery.</h2>
    <p class="section-lede">Every episode is one subject. Type a word to jump straight to its video — or explore the map: lit stars are playable, dim ones are coming soon, locked ones are waiting for your votes.</p>
    <form class="search" role="search" action="/" method="get" data-search>
      <label class="search-label" for="q">Search by subject word</label>
      <div class="search-box">
        ${icon("search")}
        <input id="q" name="q" type="search" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="time, sun, sleep, weekend…" aria-describedby="search-hint" aria-controls="search-results">
        <button class="btn btn-primary btn-small" type="submit">Go</button>
      </div>
      <p class="search-hint" id="search-hint">Try ${SEARCH_EXAMPLES.map((word, i) => html`${i ? ", " : ""}<a href="/?q=${word}#map" data-example="${word}">${word}</a>`)}.</p>
    </form>
    <div class="surprise" data-surprise data-next="${nextGuessUrl(catalog)}">
      <button class="btn btn-ghost btn-small" type="button" data-surprise-button hidden>${icon("bulb")}<span>Surprise me</span></button>
      <p class="surprise-out" role="status" aria-live="polite" data-surprise-out></p>
    </div>
    <p class="search-status" id="search-status" role="status" aria-live="polite"></p>
    <ul class="results" id="search-results" aria-label="Search results" hidden></ul>
    ${subjectBoard(catalog)}
  </div>
</section>`;

const series = (catalog) => {
  const newest = latestPublished(catalog)?.slug;
  const comingNext = (catalog.requested ?? []).find((r) => r.status === "next");
  return html`<section class="section section-series" id="series" aria-labelledby="series-title">
  <div class="wrap">
    <p class="section-kicker">All episodes</p>
    <h2 id="series-title" class="section-title">Pick an episode</h2>
    <p class="section-lede">Seven mornings, seven lives, one question you will want to answer before the end.</p>
    <ul class="cards rail" aria-label="All episodes">
      ${catalog.episodes.map((episode, i) => episodeCard(episode, i, { newest: episode.slug === newest }))}
      ${comingNext ? comingNextCard(comingNext) : ""}
      ${suggestCard(commentUrl(catalog))}
    </ul>
  </div>
</section>`;
};

const about = () => html`<section class="section section-about" id="about" aria-labelledby="about-title">
  <div class="wrap about-grid">
    <div class="about-bulb" aria-hidden="true">
      <span class="bulb-glow"></span>
      <img src="/assets/brand/avatar-384.webp" srcset="/assets/brand/avatar-384.webp 384w, /assets/brand/avatar-640.webp 640w" sizes="(min-width: 1000px) 320px, 220px" width="384" height="384" alt="" loading="lazy" decoding="async">
    </div>
    <div>
      <p class="section-kicker">About</p>
      <h2 id="about-title" class="section-title">Questions you never asked. Answers you won’t forget.</h2>
      <p>Did You Know That? is a YouTube series about how ordinary life changed. Each episode follows one subject — time, the Sun, school, money and whatever you vote for next — from the year 1500 to today, then looks at 2100 using published data from sources like the UN and NASA.</p>
      <p>In every era you wake up as someone else: <em>what people believed, what they did every day, and what changed it.</em> Every number on screen has a source. Predictions are always labelled: <strong>a scenario, not a fact.</strong></p>
      <p class="sign-off">${SITE.signOff}</p>
      <p class="cta-row"><a class="btn btn-ghost" href="${HANDLE_URL}" rel="noopener">${icon("youtube")}<span>${SITE.handle}</span></a></p>
    </div>
  </div>
</section>`;

export function homePage(catalog) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: absolute("/"),
      potentialAction: { "@type": "SearchAction", target: `${absolute("/")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name,
      url: absolute("/"),
      logo: absolute(SITE.logo),
      description: SITE.description,
      sameAs: [CHANNEL_URL, HANDLE_URL],
    },
  ];
  return page({
    title: `${SITE.name} — amazing facts, incredible stories, endless curiosity`,
    description: SITE.description,
    path: "/",
    structuredData,
    preloads: heroPreloads,
    newsletter: catalog.newsletter,
    main: html`${hero(catalog)}${featured(catalog)}${continueCard()}${series(catalog)}${daily()}${collect(catalog)}${community(catalog)}${newsletter(catalog)}${subjects(catalog)}${about()}`,
  });
}
