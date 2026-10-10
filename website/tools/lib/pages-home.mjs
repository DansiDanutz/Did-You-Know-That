// The home page: banner hero, featured episode + newsletter, episode rail, subject search + map, the rule, about.
import { html } from "./html.mjs";
import { page } from "./layout.mjs";
import {
  SITE, SUBSCRIBE_URL, CHANNEL_URL, HANDLE_URL, commentUrl, absolute, featuredEpisode, isPublished, episodeNumber, episodePath, watchUrl,
} from "./site.mjs";
import { icon, episodeCard, subjectBoard, videoFacade, thumbnailImage } from "./components.mjs";
import { newsletterBlock } from "./newsletter.mjs";

const SEARCH_EXAMPLES = ["time", "sun", "sleep", "weekend", "phone"];

// The real channel banner is the hero. Phones get a tighter crop so the wordmark stays legible;
// both sources are preloaded by media query so the LCP image starts downloading with the HTML.
const BANNER = {
  mobile: { media: "(max-width: 639px)", srcset: "/assets/brand/hero-mobile-800.webp 800w, /assets/brand/hero-mobile-1200.webp 1200w", sizes: "100vw", width: 1200, height: 272 },
  wide: { media: "(min-width: 640px)", srcset: "/assets/brand/hero-1600.webp 1600w, /assets/brand/hero-2560.webp 2560w", sizes: "143vw", width: 1600, height: 238 },
};
const heroPreloads = [BANNER.mobile, BANNER.wide].map(({ media, srcset, sizes }) => ({ type: "image/webp", media, srcset, sizes }));

const hero = () => html`<section class="hero" aria-labelledby="hero-title">
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
    <p class="tagline">Amazing facts <span aria-hidden="true">•</span> Incredible stories <span aria-hidden="true">•</span> Endless curiosity</p>
    <p class="lede">One subject per episode, traced from 1500 to today — then to 2100 on real data. Guess first. Stay to the end. Check.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a>
      <a class="btn btn-ghost" href="#featured">${icon("play")}<span>Watch the series</span></a>
    </div>
  </div>
</section>`;

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
      <p class="section-kicker">${published ? "Newest episode" : "Premieres soon"} · No. ${episodeNumber(episode)}</p>
      <h2 id="featured-title" class="featured-title">${episode.title}</h2>
      <p class="featured-hook">${episode.hook}</p>
      <p class="featured-question">${episode.question}</p>
      <p class="cta-row">
        ${published
          ? html`<a class="btn btn-primary" href="${episodePath(episode)}#guess">${icon("bulb")}<span>Guess, then watch</span></a><a class="btn btn-ghost" href="${watchUrl(episode)}" rel="noopener">${icon("youtube")}<span>Watch on YouTube</span></a>`
          : html`<a class="btn btn-primary" href="${episodePath(episode)}#guess">${icon("bulb")}<span>Guess before it premieres</span></a><a class="btn btn-ghost" href="${episodePath(episode)}"><span>Episode details</span></a>`}
      </p>
      ${published ? html`<p class="player-note">Nothing loads from YouTube until you press play (youtube-nocookie.com).</p>` : ""}
    </div>
  </div>
  <div class="wrap">${newsletterBlock(catalog.newsletter, { id: "home", className: "newsletter-home" })}</div>
</section>`;
}

/** Where "Surprise me" sends people before anything is published: the next premiere's guess. */
const nextGuessUrl = (catalog) => {
  const episode = featuredEpisode(catalog);
  return episode ? `${episodePath(episode)}#guess` : "/#featured";
};

const subjects = (catalog) => html`<section class="section section-map" id="map" aria-labelledby="map-title">
  <div class="wrap">
    <p class="section-kicker">Level select</p>
    <h2 id="map-title" class="section-title">Pick a subject. Any word.</h2>
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

const series = (catalog) => html`<section class="section section-series" id="series" aria-labelledby="series-title">
  <div class="wrap">
    <p class="section-kicker">All episodes</p>
    <h2 id="series-title" class="section-title">Every episode, one subject</h2>
    <p class="section-lede">From 1500 to today, then on to 2100 — seven mornings, seven lives, one question you will want to answer before the end.</p>
    <ul class="cards rail" aria-label="All episodes">
      ${catalog.episodes.map(episodeCard)}
      <li class="card card-next">
        <a class="card-link" href="#rule">
          <span class="card-art"><span class="card-art-no">??</span><span class="card-art-word">You choose</span><span class="card-art-span">the next subject</span></span>
          <span class="card-body">
            <span class="card-kicker">Next episode</span>
            <span class="card-title">Your subject here</span>
            <span class="card-hook">The subject asked for most in the comments becomes a future episode.</span>
            <span class="card-cta">How it works <span aria-hidden="true">→</span></span>
          </span>
        </a>
      </li>
    </ul>
  </div>
</section>`;

const rule = (catalog) => html`<section class="section section-rule" id="rule" aria-labelledby="rule-title">
  <div class="wrap">
    <p class="section-kicker">How it works</p>
    <h2 id="rule-title" class="section-title">The rule</h2>
    <ol class="steps">
      <li class="step accent-orange"><span class="step-no" aria-hidden="true">1</span><h3>Guess</h3><p>Every episode opens with a question. Lock your guess here — or write it in the comments — before the answer.</p></li>
      <li class="step accent-magenta"><span class="step-no" aria-hidden="true">2</span><h3>Stay to the end</h3><p>Seven centuries, one subject. The answer is not where you think it is.</p></li>
      <li class="step accent-cyan"><span class="step-no" aria-hidden="true">3</span><h3>Check</h3><p>Were you right? Reveal the answer and collect the episode’s “Did you know that…” cards.</p></li>
    </ol>
    <div class="features">
      <article class="feature">
        <h3>Comment of the Week</h3>
        <p>At the end of every episode, the best comment from the one before is read out on screen. Next time, it could be yours.</p>
      </article>
      <article class="feature">
        <h3>You choose the next subject</h3>
        <p>Tell us what you want traced from 1500 to 2100. The subject asked for most becomes a future episode.</p>
      </article>
    </div>
    <p class="cta-row cta-center"><a class="btn btn-primary" href="${commentUrl(catalog)}" rel="noopener">${icon("comment")}<span>Comment on YouTube</span></a></p>
  </div>
</section>`;

const about = () => html`<section class="section section-about" id="about" aria-labelledby="about-title">
  <div class="wrap about-grid">
    <div class="about-bulb" aria-hidden="true">
      <span class="bulb-glow"></span>
      <img src="/assets/brand/avatar-384.webp" srcset="/assets/brand/avatar-384.webp 384w, /assets/brand/avatar-640.webp 640w" sizes="(min-width: 1000px) 320px, 220px" width="384" height="384" alt="" loading="lazy" decoding="async">
    </div>
    <div>
      <p class="section-kicker">About</p>
      <h2 id="about-title" class="section-title">Questions you never asked. Answers you won’t forget.</h2>
      <p>Did You Know That? is a YouTube series about how ordinary life changed. Each episode follows one subject — time, the Sun, and whatever you vote for next — from the year 1500 to today, then looks at 2100 using published data from sources like the UN and NASA.</p>
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
    main: html`${hero()}${featured(catalog)}${series(catalog)}${subjects(catalog)}${rule(catalog)}${about()}`,
  });
}
