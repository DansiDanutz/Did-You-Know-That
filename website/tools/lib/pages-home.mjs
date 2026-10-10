// The home page: hero, subject search + map, series grid, the rule, about.
import { html } from "./html.mjs";
import { page } from "./layout.mjs";
import { SITE, SUBSCRIBE_URL, CHANNEL_URL, HANDLE_URL, commentUrl, absolute } from "./site.mjs";
import { icon, episodeCard, subjectBoard } from "./components.mjs";

const RULER_YEARS = ["1500", "1600", "1700", "1800", "1900", "Today", "2100"];
const SEARCH_EXAMPLES = ["time", "sun", "sleep", "weekend", "phone"];

const hero = () => html`<section class="hero" aria-labelledby="hero-title">
  <div class="hero-sky" aria-hidden="true"><span class="nebula n1"></span><span class="nebula n2"></span><span class="nebula n3"></span><canvas class="hero-dust" data-dust></canvas></div>
  <div class="wrap hero-inner">
    <div class="bulb">
      <span class="bulb-ring" aria-hidden="true"></span>
      <span class="bulb-glow" aria-hidden="true"></span>
      <img class="bulb-img" src="/assets/brand/avatar-384.webp" srcset="/assets/brand/avatar-192.webp 192w, /assets/brand/avatar-384.webp 384w, /assets/brand/avatar-640.webp 640w" sizes="(min-width: 900px) 220px, 156px" width="384" height="384" alt="The Did You Know That? logo: a glowing question mark shaped like a light bulb" fetchpriority="high">
    </div>
    <p class="eyebrow">A YouTube series · 1500 → today → 2100</p>
    <h1 id="hero-title" class="wordmark"><span class="wordmark-line">Did you</span> <span class="wordmark-line">know that?</span></h1>
    <p class="tagline">Amazing facts <span aria-hidden="true">•</span> Incredible stories <span aria-hidden="true">•</span> Endless curiosity</p>
    <p class="lede">One subject per episode. Seven centuries of how people really lived with it — then the year 2100, built only on real data. Guess first. Stay to the end. Check.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a>
      <a class="btn btn-ghost" href="#series">${icon("play")}<span>Watch the series</span></a>
    </div>
  </div>
  <ol class="ruler" aria-hidden="true">${RULER_YEARS.map((year) => html`<li>${year}</li>`)}</ol>
</section>`;

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
    <p class="search-status" id="search-status" role="status" aria-live="polite"></p>
    <ul class="results" id="search-results" aria-label="Search results" hidden></ul>
    ${subjectBoard(catalog)}
  </div>
</section>`;

const series = (catalog) => html`<section class="section section-series" id="series" aria-labelledby="series-title">
  <div class="wrap">
    <p class="section-kicker">The series</p>
    <h2 id="series-title" class="section-title">Every episode, one subject</h2>
    <p class="section-lede">From 1500 to today, then on to 2100 — seven mornings, seven lives, one question you will want to answer before the end.</p>
    <ul class="cards">
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
    <picture class="about-banner">
      <source type="image/webp" srcset="/assets/brand/banner-1600.webp 1600w, /assets/brand/banner-2560.webp 2560w" sizes="(min-width: 1000px) 560px, 100vw">
      <img src="/assets/brand/banner-1600.jpg" alt="Channel banner: “Did You Know That?” in heavy white letters beside the neon question-mark bulb, with the tagline Amazing facts, incredible stories, endless curiosity" width="1600" height="265" loading="lazy" decoding="async">
    </picture>
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
    main: html`${hero()}${subjects(catalog)}${series(catalog)}${rule(catalog)}${about()}`,
  });
}
