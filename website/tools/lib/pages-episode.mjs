// Episode pages (/episodes/<slug>/) and subject pages (/subject/<slug>/).
import { html, raw } from "./html.mjs";
import { page } from "./layout.mjs";
import {
  SITE, SUBSCRIBE_URL, CHANNEL_URL, episodeTag, episodeTagLong, isSubEpisode, mainEpisodes, subEpisodesOf, episodePath, subjectPath, watchUrl, embedUrl, isPublished, absolute, commentUrl, latestPublished,
} from "./site.mjs";
import {
  icon, statusPill, episodeCard, comingNextCard, comingNextKicker, suggestCard, factCard, keywordChips, thumbnailImage, videoFacade, playerControls, stepHead, ladder, hasLadder, subjectBoard, seriesSection,
} from "./components.mjs";
import { JOURNEY_STEPS, STEP_ANCHORS } from "../../js/lib/journey.js";
import { POINTS } from "../../js/lib/ledger.js";

const breadcrumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absolute(path) })),
});

const videoObject = (episode) => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: `Did You Know That? ${episodeTagLong(episode)} — ${episode.title}`,
  description: `${episode.hook} ${episode.summary}`,
  thumbnailUrl: [absolute(episode.thumbnail)],
  uploadDate: episode.publishedAt,
  embedUrl: embedUrl(episode),
  url: absolute(episodePath(episode)),
  publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: absolute(SITE.logo) } },
});

const questionCount = (episode) => episode.quiz.questions?.length ?? 0;
const maxPoints = (episode) => (questionCount(episode) ? questionCount(episode) * POINTS.quiz + POINTS.guess + POINTS.perfect + POINTS.cards : 0);

/** The step indicator: links to each step; js/ui/progress-ui.js marks done / current from local progress. */
const stepper = (episode) => html`<nav class="stepper-bar" aria-label="Your journey through this episode">
  <ol class="stepper wrap" data-journey data-slug="${episode.slug}">
    ${JOURNEY_STEPS.map((step, i) => html`<li class="stepper-step${i === 0 ? " is-current" : ""}" data-step="${step.id}"><a href="${STEP_ANCHORS[step.id]}"${i === 0 ? raw(' aria-current="step"') : ""}><span class="stepper-dot" aria-hidden="true">${i + 1}</span><span class="stepper-label">${step.label}</span><span class="visually-hidden" data-step-state>${i === 0 ? ", current step" : ""}</span></a></li>`)}
  </ol>
</nav>`;

function guessStep(episode) {
  return html`<section class="step-panel" id="guess" aria-labelledby="guess-title">
  ${stepHead(1, "guess-title", "Guess before you watch", "Pick what you think the answer is. A right guess earns 25 bonus points when you finish the quiz.")}
  <p class="challenge-banner" data-challenge-banner hidden>${icon("comment")}<span><strong>A friend challenged you.</strong> They’ve locked their guess. Lock yours, then see if you match.</span></p>
  <form class="quiz-form" data-quiz-form>
    <fieldset>
      <legend id="quiz-title" class="quiz-question">${episode.quiz.question}</legend>
      <div class="quiz-options">
        ${episode.quiz.options.map((option, i) => html`<label class="quiz-option"><input type="radio" name="guess" value="${i}" required><span>${option}</span></label>`)}
      </div>
    </fieldset>
    <button class="btn btn-primary" type="submit" data-lock>Lock my guess</button>
  </form>
  <p class="quiz-comment">${episode.guess}${isPublished(episode) ? html` <a href="${watchUrl(episode)}" rel="noopener">Comment on YouTube</a>` : ""}</p>
  <div class="quiz-after" data-quiz-after hidden>
    <p class="quiz-locked">Your guess is locked: <strong data-quiz-choice></strong></p>
    <p class="cta-row"><a class="btn btn-primary" href="#player">${icon("play")}<span>${isPublished(episode) ? "Now watch the episode" : "See the premiere"}</span></a>${questionCount(episode) ? html`<a class="btn btn-ghost" href="#quiz">Skip to the quiz</a>` : ""}</p>
    <div class="challenge" data-challenge data-title="${episode.title}" hidden>
      <p class="challenge-result" data-challenge-result hidden></p>
      <button class="btn btn-sub" type="button" data-challenge-share>${icon("comment")}<span>Challenge a friend</span></button>
      <p class="challenge-status" data-challenge-status aria-live="polite"></p>
    </div>
  </div>
</section>`;
}

function watchStep(episode) {
  if (!isPublished(episode)) {
    return html`<section class="step-panel" id="player" aria-labelledby="watch-title">
  ${stepHead(2, "watch-title", "Watch the episode")}
  <div class="poster${episode.thumbnail ? " has-art" : ""}">
    ${episode.thumbnail ? html`<span class="poster-art" aria-hidden="true">${thumbnailImage(episode, { lazy: false })}</span>` : html`<span class="poster-word" aria-hidden="true">${episode.subject}</span>`}
    <span class="pill pill-soon">Coming soon</span>
    <p>${episodeTag(episode)} is in production. Subscribe and it will find you the day it premieres.</p>
    <a class="btn btn-primary" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a>
  </div>
</section>`;
  }
  return html`<section class="step-panel" id="player" aria-labelledby="watch-title">
  ${stepHead(2, "watch-title", "Watch the episode", isExplainer(episode) ? "One experiment, one mystery — and the answer to your guess at the end." : "Seven mornings, one subject — and the answer to your guess at the end.")}
  <div class="player" data-player>
  <div class="player-stage" data-player-stage>${videoFacade(episode)}</div>
  ${playerControls(episode)}
  </div>
  <p class="player-note">Nothing loads from YouTube until you press play (privacy-enhanced youtube-nocookie.com). <a href="${watchUrl(episode)}" rel="noopener">Watch on YouTube</a></p>
</section>`;
}

function quizIntro(episode) {
  if (questionCount(episode) === 0) {
    return html`<p class="quiz-wait">Quiz coming soon — the questions arrive with the episode. Subscribe and it will find you.</p>
    <p class="cta-row"><a class="btn btn-primary" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a></p>`;
  }
  return html`<div class="quiz-gate" data-quiz-gate>
      <p>${icon("lock")} <span>Lock your guess first — then the quiz opens. <a href="#guess">Go to step 1</a></span></p>
    </div>
    <div class="quiz-intro" data-quiz-intro hidden>
      <p class="quiz-next">${questionCount(episode)} questions, one per era. 10 points for every answer right first time — and each right answer unlocks a fact card. Wrong? Try again: you still get the card.</p>
      <p class="cta-row"><button class="btn btn-primary" type="button" data-quiz-start>Start the quiz</button></p>
    </div>`;
}

function questionRunner(episode) {
  if (questionCount(episode) === 0) return "";
  return html`<div class="quiz-run" data-quiz-run hidden>
    <p class="quiz-step"><span data-quiz-step></span><span class="quiz-era" data-quiz-era></span></p>
    <progress class="rank-meter quiz-meter" max="${questionCount(episode)}" value="0" data-quiz-progress aria-hidden="true">0</progress>
    <form class="quiz-form" data-question-form>
      <fieldset>
        <legend class="quiz-question" data-question-text tabindex="-1"></legend>
        <div class="quiz-options" data-question-options></div>
      </fieldset>
      <button class="btn btn-primary" type="submit" data-question-check>Check my answer</button>
    </form>
    <div class="quiz-feedback" data-question-feedback hidden>
      <p class="quiz-verdict" data-feedback-verdict tabindex="-1"></p>
      <p class="quiz-feedback-note" data-feedback-note></p>
      <ul class="fact-grid fact-grid-single" data-feedback-card></ul>
      <p class="cta-row"><button class="btn btn-primary" type="button" data-question-next>Next question</button></p>
    </div>
  </div>
  <div class="quiz-summary" data-quiz-summary hidden>
    <p class="section-kicker">Episode complete</p>
    <h3 class="quiz-summary-title" data-summary-title tabindex="-1">Quiz complete</h3>
    <p class="perfect-badge" data-summary-perfect hidden>★ Perfect episode</p>
    <dl class="summary-stats">
      <div><dt>Right first time</dt><dd data-summary-score>0/${questionCount(episode)}</dd></div>
      <div><dt>Points earned</dt><dd data-summary-points>0</dd></div>
      <div><dt>Cards unlocked</dt><dd data-summary-cards>0/${episode.facts.length}</dd></div>
    </dl>
    <p class="quiz-verdict" data-summary-guess></p>
    <div class="fact-card fact-answer">
      <span class="fact-head">${icon("bulb")} Did you know that…</span>
      <span class="fact-text">${episode.quiz.reveal}</span>
      <span class="fact-foot">${episodeTag(episode)} · ${episode.subject} · the answer</span>
    </div>
    <p class="cta-row"><a class="btn btn-primary" href="#cards">See your cards</a><a class="btn btn-ghost" href="#next">What’s next</a><button class="btn btn-ghost" type="button" data-quiz-replay>Play again (no new points)</button></p>
  </div>`;
}

function quizStep(episode) {
  return html`<section class="step-panel" id="quiz" aria-labelledby="quiz-step-title">
  ${stepHead(3, "quiz-step-title", "Play the quiz", questionCount(episode) ? `Up to ${maxPoints(episode)} points. Nothing is timed.` : "")}
  ${quizIntro(episode)}
  ${questionRunner(episode)}
</section>`;
}

/** Steps 1–3 share one widget root (js/ui/quiz.js): the guess, the video between, then the quiz. */
function journey(episode) {
  return html`<div class="journey wrap" data-quiz data-slug="${episode.slug}" data-answer="${episode.quiz.answerIndex}" data-questions="${questionCount(episode)}">
  ${guessStep(episode)}
  ${watchStep(episode)}
  ${quizStep(episode)}
  <p class="storage-note" data-storage-note hidden>Your browser isn’t saving progress, so your points and cards last only until you leave this page.</p>
  <noscript><p class="quiz-wait">Turn on JavaScript to lock a guess and play the quiz here — or post your guess in the YouTube comments.</p></noscript>
  <p class="quiz-status" role="status" aria-live="polite" data-quiz-status></p>
  <p class="visually-hidden" role="status" aria-live="polite" data-quiz-announce></p>
</div>`;
}

const cardsStep = (episode) => html`<section class="step-panel ep-cards wrap" id="cards" aria-labelledby="cards-title">
  ${stepHead(4, "cards-title", "Your cards", `${episode.facts.length} “Did you know that…” cards. ${questionCount(episode) ? "Each right quiz answer unlocks one." : "The quiz arrives with the episode; then these cards unlock."}`)}
  <div class="set-meter" data-set-meter="${episode.slug}" data-total="${episode.facts.length}">
    <p class="set-meter-text"><strong data-set-count>0</strong> of ${episode.facts.length} cards · <strong data-set-points>0</strong> points from this episode</p>
    <progress class="rank-meter" max="${episode.facts.length}" value="0" data-set-progress aria-label="Cards collected from ${episode.title}">0</progress>
  </div>
  <ul class="fact-grid" data-collection-scope="${episode.slug}">${episode.facts.map((card) => factCard(card, episode, { locked: true }))}</ul>
  <p class="step-foot"><a href="/collection/">Open your whole collection →</a> Progress stays in this browser only.</p>
</section>`;

/** What follows an episode: the next part of its sub-series, or the next main episode; else null. */
function followingEpisode(catalog, episode) {
  if (isSubEpisode(episode)) return subEpisodesOf(catalog, episode.series.parent).find((e) => e.series.part > episode.series.part) ?? null;
  return mainEpisodes(catalog).find((e) => e.number > episode.number) ?? null;
}

/** "Coming next · in production" for the main series, "Medicine 3 · coming next · in production" for a sub-episode. */
const comingNextTileKicker = (request) => (request.series ? `${comingNextKicker(request)} · in production` : "Coming next · in production");

function nextStep(catalog, episode) {
  const next = followingEpisode(catalog, episode);
  const comingNext = (catalog.requested ?? []).find((r) => r.status === "next");
  const nextBlock = next
    ? html`<a class="next-tile" href="${episodePath(next)}"><span class="next-kicker">${episodeTag(next)} · ${isPublished(next) ? "play it next" : "coming soon"}</span><strong>${next.title}</strong><span>${next.hook}</span></a>`
    : comingNext
      ? html`<a class="next-tile" href="${subjectPath(comingNext.slug)}"><span class="next-kicker">${comingNextTileKicker(comingNext)}</span><strong>${comingNext.subject}</strong><span>${comingNext.pitch}</span></a>`
      : html`<a class="next-tile" href="/#map"><span class="next-kicker">Next</span><strong>You choose the subject</strong><span>Vote in the comments.</span></a>`;
  return html`<section class="step-panel wrap" id="next" aria-labelledby="next-title">
  ${stepHead(5, "next-title", "What’s next")}
  <div class="next-grid">
    ${nextBlock}
    <a class="next-tile next-vault" href="/vault/"><span class="next-kicker">${icon("gem")} Card Vault</span><strong>Spend your points</strong><span>Special Cards open bonus videos made only for players.</span></a>
    <a class="next-tile next-comment" href="${isPublished(episode) ? watchUrl(episode) : CHANNEL_URL}" rel="noopener"><span class="next-kicker">${icon("comment")} The question at the end</span><strong>“${episode.commentPrompt}”</strong><span>${isPublished(episode) ? "Answer in the YouTube comments — the best one is read out in the next episode." : "Visit the channel."}</span></a>
  </div>
</section>`;
}

/** "The Sun" → "the Sun", "Time" → "time": the subject inside a sentence. */
const subjectPhrase = (subject) => (/^The /.test(subject) ? subject.replace(/^The /, "the ") : subject.toLowerCase());

/** A sub-series explainer (format "explainer"): one experiment told in a few dated scenes, not seven mornings 1500 → 2100. */
const isExplainer = (episode) => episode.format === "explainer";

function exploreHeading(episode) {
  if (hasLadder(episode)) return { kicker: "Climb the ladder", title: `How we saw ${subjectPhrase(episode.subject)}` };
  return isExplainer(episode) ? { kicker: "One experiment", title: "The story" } : { kicker: "Seven mornings", title: "1500 → 2100" };
}

function eraPlace(episode, era) {
  if (era.prediction) return "Prediction · a scenario, not a fact";
  return isExplainer(episode) ? era.place : `You wake up: ${era.place}`;
}

function explore(episode) {
  const { kicker, title } = exploreHeading(episode);
  return html`<section class="explore wrap" aria-labelledby="ladder-title">
  <p class="section-kicker">${kicker}</p>
  <h2 id="ladder-title" class="section-title">${title}</h2>
  ${isPublished(episode) ? "" : html`<p class="section-lede">Coming soon — details may change before the premiere.</p>`}
  ${hasLadder(episode)
    ? html`<p class="section-lede">One rung per century: how people saw ${subjectPhrase(episode.subject)} — in the episode’s own words. Pick a year.</p>${ladder(episode)}`
    : html`<ol class="eras">
    ${episode.eras.map((era) => html`<li class="era${era.prediction ? " is-prediction" : ""}">
      <span class="era-year">${era.year}</span>
      <span class="era-place">${eraPlace(episode, era)}</span>
      <span class="era-line">${era.line}</span>
    </li>`)}
  </ol>`}
</section>`;
}

/** The main episode a sub-episode belongs to (null for a main episode). */
const parentOf = (catalog, episode) => (isSubEpisode(episode) ? catalog.episodes.find((e) => e.slug === episode.series.parent) ?? null : null);

/** Breadcrumb trail: Home / Episodes / [No. 06 Medicine /] this episode. */
function crumbTrail(catalog, episode) {
  const parent = parentOf(catalog, episode);
  return [["Home", "/"], ["Episodes", "/episodes/"], ...(parent ? [[`${episodeTag(parent)} ${parent.title}`, episodePath(parent)]] : [])];
}

function episodeKicker(catalog, episode, newest) {
  const parent = parentOf(catalog, episode);
  const partOf = parent ? html` · part of <a href="${episodePath(parent)}">${episodeTag(parent)} ${parent.title}</a>` : "";
  return html`<p class="ep-kicker">${episodeTagLong(episode)}${partOf} · Subject: <a href="${subjectPath(episode.subjectSlug)}">${episode.subject}</a> · ${statusPill(episode)}${newest ? html` <span class="pill pill-new">New</span>` : ""}</p>`;
}

/** The sub-series block: on a main episode its own series, on a sub-episode the series it belongs to. */
function episodeSeries(catalog, episode) {
  const parent = parentOf(catalog, episode) ?? episode;
  return seriesSection(catalog, parent, { current: isSubEpisode(episode) ? episode.slug : null, newest: latestPublished(catalog)?.slug });
}

export function episodePage(catalog, episode) {
  const published = isPublished(episode);
  const newest = latestPublished(catalog)?.slug === episode.slug;
  const trail = crumbTrail(catalog, episode);
  const structuredData = [
    breadcrumbs([...trail, [episode.title, episodePath(episode)]]),
    ...(published ? [videoObject(episode)] : []),
  ];
  const main = html`<article class="episode">
  <header class="ep-hero wrap">
    ${episode.thumbnail ? html`<a class="ep-hero-art" href="#player" tabindex="-1" aria-hidden="true">${thumbnailImage(episode, { sizes: "520px" })}</a>` : ""}
    <nav class="crumbs" aria-label="Breadcrumb">${trail.map(([name, path]) => html`<a href="${path}">${name}</a> <span aria-hidden="true">/</span> `)}<span aria-current="page">${episodeTag(episode)}</span></nav>
    ${episodeKicker(catalog, episode, newest)}
    <h1 class="ep-title">${episode.title}</h1>
    <p class="ep-hook">${episode.hook}</p>
    <p class="ep-question">${episode.question}</p>
    ${questionCount(episode) ? html`<p class="ep-meta">${questionCount(episode)} questions · ${episode.facts.length} cards · up to ${maxPoints(episode)} points</p>` : ""}
  </header>
  ${stepper(episode)}
  ${journey(episode)}
  ${cardsStep(episode)}
  ${nextStep(catalog, episode)}
  ${episodeSeries(catalog, episode)}
  ${explore(episode)}
  <section class="ep-about wrap" aria-labelledby="about-ep-title">
    <div>
      <h2 id="about-ep-title" class="section-title">About this episode</h2>
      <p>${episode.summary}</p>
    </div>
    <div>
      <h3 class="small-title">Words that find this episode</h3>
      ${keywordChips(episode.keywords, 14)}
    </div>
  </section>
</article>`;
  return page({
    newsletter: catalog.newsletter,
    title: `${episodeTag(episode)} — ${episode.title} · ${SITE.name}`,
    description: `${episode.hook} ${episode.question}`,
    path: episodePath(episode),
    currentPath: "/episodes/",
    ogType: published ? "video.episode" : "article",
    image: episode.thumbnail ?? SITE.ogImage,
    structuredData,
    main,
  });
}

/** /episodes/: every episode with your progress, what is coming next, and how to choose a subject. */
export function episodesIndexPage(catalog) {
  const newest = latestPublished(catalog)?.slug;
  const comingNext = (catalog.requested ?? []).find((r) => r.status === "next" && !r.series);
  const main = html`<section class="wrap page-hero" aria-labelledby="episodes-title">
  <p class="section-kicker">The series</p>
  <h1 id="episodes-title" class="section-title">All episodes</h1>
  <p class="section-lede">One subject per episode, traced from 1500 to today — then to 2100 on real data. Each one is a game: guess, watch, play the quiz, collect the cards.</p>
</section>
<section class="wrap" aria-label="Episodes">
  <ul class="cards">
    ${mainEpisodes(catalog).map((episode, i) => episodeCard(episode, i, { newest: episode.slug === newest }))}
    ${comingNext ? comingNextCard(comingNext) : ""}
    ${suggestCard(commentUrl(catalog))}
  </ul>
</section>
${mainEpisodes(catalog).map((episode) => seriesSection(catalog, episode, { newest }))}
<section class="wrap section-tight" aria-labelledby="map-title">
  <h2 id="map-title" class="small-title">Subjects waiting for your vote</h2>
  ${subjectBoard(catalog)}
  <p class="cta-row"><a class="btn btn-ghost" href="/#map">${icon("search")}<span>Search by subject word</span></a></p>
</section>`;
  return page({
    newsletter: catalog.newsletter,
    title: `All episodes · ${SITE.name}`,
    description: "Every episode of Did You Know That?: one subject from 1500 to 2100. Guess, watch, play the quiz and collect the cards.",
    path: "/episodes/",
    currentPath: "/episodes/",
    structuredData: [breadcrumbs([["Home", "/"], ["Episodes", "/episodes/"]])],
    main,
  });
}

export function subjectPageForEpisode(catalog, episode) {
  const index = catalog.episodes.indexOf(episode);
  const main = html`<section class="subject-hero wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/episodes/">Episodes</a> <span aria-hidden="true">/</span> <span aria-current="page">${episode.subject}</span></nav>
  <p class="section-kicker">Subject</p>
  <h1 class="subject-word">${episode.subject}</h1>
  <p class="section-lede">${episode.hook}</p>
</section>
<section class="wrap subject-body" aria-label="Episode">
  <ul class="cards cards-single">${episodeCard(episode, index)}</ul>
  <h2 class="small-title">Other words that lead here</h2>
  ${keywordChips(episode.keywords)}
  <p class="cta-row"><a class="btn btn-ghost" href="/#map">${icon("search")}<span>Search another subject</span></a></p>
</section>`;
  return page({
    newsletter: catalog.newsletter,
    title: `${episode.subject} — Did You Know That? ${episodeTagLong(episode)}`,
    description: `${episode.subject}: ${episode.hook}`,
    path: subjectPath(episode.subjectSlug),
    structuredData: [breadcrumbs([["Home", "/"], ["Episodes", "/episodes/"], [episode.subject, subjectPath(episode.subjectSlug)]])],
    main,
  });
}

/** The subject announced as the next episode: a teaser (a question only) and how to be there first. */
function comingNextPage(catalog, request) {
  const main = html`<section class="subject-hero wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/episodes/">Episodes</a> <span aria-hidden="true">/</span> <span aria-current="page">${request.subject}</span></nav>
  <p class="section-kicker">${request.series ? `${episodeTagLong(request)} · coming next · in production` : "Coming next · in production"}</p>
  <h1 class="subject-word">${request.subject}</h1>
  <p class="section-lede subject-teaser">${request.pitch}</p>
</section>
<section class="wrap subject-body" aria-label="Be there first">
  <div class="feature feature-wide">
    <h2>Be there when it premieres</h2>
    <p>Subscribe and the episode finds you. Its guess, quiz and cards open here on the day it comes out.</p>
    <p class="cta-row"><a class="btn btn-primary" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a><a class="btn btn-ghost" href="/episodes/"><span>Play the episodes so far</span></a></p>
  </div>
</section>`;
  return page({
    newsletter: catalog.newsletter,
    title: `${request.subject} — the next episode · ${SITE.name}`,
    description: `Coming next on Did You Know That?: ${request.pitch}`,
    path: subjectPath(request.slug),
    structuredData: [breadcrumbs([["Home", "/"], ["Episodes", "/episodes/"], [request.subject, subjectPath(request.slug)]])],
    main,
  });
}

export function subjectPageForRequest(catalog, request) {
  if (request.status === "next") return comingNextPage(catalog, request);
  const label = request.status === "requested" ? "Requested" : "Idea";
  const main = html`<section class="subject-hero wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/episodes/">Episodes</a> <span aria-hidden="true">/</span> <span aria-current="page">${request.subject}</span></nav>
  <p class="section-kicker">${icon("lock")} ${label} — not made yet</p>
  <h1 class="subject-word is-locked">${request.subject}</h1>
  <p class="section-lede">${request.pitch}</p>
</section>
<section class="wrap subject-body" aria-label="Vote">
  <div class="feature feature-wide">
    <h2>Want this episode? Vote in the comments.</h2>
    <p>Write “${request.subject}” under the latest video. The subject asked for most becomes a future episode — traced from 1500 to today, then to 2100.</p>
    <p class="cta-row"><a class="btn btn-primary" href="${commentUrl(catalog)}" rel="noopener">${icon("comment")}<span>Vote on YouTube</span></a><a class="btn btn-ghost" href="/#map"><span>Back to the map</span></a></p>
  </div>
</section>`;
  return page({
    newsletter: catalog.newsletter,
    title: `${request.subject} — vote for the next episode · ${SITE.name}`,
    description: `${request.subject}: ${request.pitch} Vote in the YouTube comments to make it a future episode.`,
    path: subjectPath(request.slug),
    structuredData: [breadcrumbs([["Home", "/"], ["Episodes", "/episodes/"], [request.subject, subjectPath(request.slug)]])],
    main,
  });
}
