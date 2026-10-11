// Episode pages (/episodes/<slug>/) and subject pages (/subject/<slug>/).
import { html } from "./html.mjs";
import { page } from "./layout.mjs";
import {
  SITE, SUBSCRIBE_URL, CHANNEL_URL, episodeNumber, episodePath, subjectPath, watchUrl, embedUrl, isPublished, absolute, commentUrl,
} from "./site.mjs";
import { icon, statusPill, episodeCard, factCard, keywordChips, thumbnailImage, videoFacade } from "./components.mjs";

const breadcrumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absolute(path) })),
});

const videoObject = (episode) => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: `Did You Know That? No. ${episodeNumber(episode)} — ${episode.title}`,
  description: `${episode.hook} ${episode.summary}`,
  thumbnailUrl: [absolute(episode.thumbnail)],
  uploadDate: episode.publishedAt,
  embedUrl: embedUrl(episode),
  url: absolute(episodePath(episode)),
  publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: absolute(SITE.logo) } },
});

const questionCount = (episode) => episode.quiz.questions?.length ?? 0;

/** After the guess: the per-era quiz, or "quiz coming soon". Never a "watched it" reward. */
function afterGuess(episode) {
  const watchLink = html`<a class="btn btn-ghost" href="#player">${icon("play")}<span>Watch the episode</span></a>`;
  if (questionCount(episode) === 0) {
    return html`<p class="quiz-wait">Quiz coming soon — the questions arrive with the episode. Subscribe and it will find you.</p>
    <p class="cta-row">${watchLink}<a class="btn btn-primary" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a></p>`;
  }
  return html`<p class="quiz-next">Now show what you know: ${questionCount(episode)} questions, one per era. 10 points for every answer right first time — and each right answer unlocks a fact card.</p>
    <p class="cta-row"><button class="btn btn-primary" type="button" data-quiz-start>Start the quiz</button>${watchLink}</p>`;
}

function questionRunner(episode) {
  if (questionCount(episode) === 0) return "";
  return html`<div class="quiz-run" data-quiz-run hidden>
    <p class="quiz-step"><span data-quiz-step></span><span class="quiz-era" data-quiz-era></span></p>
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
      <span class="fact-foot">No. ${episodeNumber(episode)} · ${episode.subject} · the answer</span>
    </div>
    <p class="cta-row"><a class="btn btn-primary" href="/collection/">Your collection</a><button class="btn btn-ghost" type="button" data-quiz-replay>Play again (no new points)</button></p>
  </div>`;
}

function quiz(episode) {
  return html`<section class="quiz wrap" id="guess" aria-labelledby="quiz-title" data-quiz data-slug="${episode.slug}" data-answer="${episode.quiz.answerIndex}" data-questions="${questionCount(episode)}">
  <p class="section-kicker">Guess before you watch</p>
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
    ${afterGuess(episode)}
  </div>
  ${questionRunner(episode)}
  <p class="storage-note" data-storage-note hidden>Your browser isn’t saving progress, so your points and cards last only until you leave this page.</p>
  <noscript><p class="quiz-wait">Turn on JavaScript to lock a guess and play the quiz here — or post your guess in the YouTube comments.</p></noscript>
  <p class="quiz-status" role="status" aria-live="polite" data-quiz-status></p>
  <p class="visually-hidden" role="status" aria-live="polite" data-quiz-announce></p>
</section>`;
}

function player(episode) {
  if (!isPublished(episode)) {
    return html`<section class="player wrap" id="player" aria-label="Video">
  <div class="poster${episode.thumbnail ? " has-art" : ""}">
    ${episode.thumbnail ? html`<span class="poster-art" aria-hidden="true">${thumbnailImage(episode, { lazy: false })}</span>` : html`<span class="poster-word" aria-hidden="true">${episode.subject}</span>`}
    <span class="pill pill-soon">Coming soon</span>
    <p>No. ${episodeNumber(episode)} is in production. Subscribe and it will find you the day it premieres.</p>
    <a class="btn btn-primary" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe on YouTube</span></a>
  </div>
</section>`;
  }
  return html`<section class="player wrap" id="player" aria-label="Video">
  ${videoFacade(episode)}
  <p class="player-note">Nothing loads from YouTube until you press play (privacy-enhanced youtube-nocookie.com). <a href="${watchUrl(episode)}" rel="noopener">Watch on YouTube</a></p>
</section>`;
}

const timeline = (episode) => html`<section class="timeline wrap" aria-labelledby="timeline-title">
  <p class="section-kicker">Seven mornings</p>
  <h2 id="timeline-title" class="section-title">1500 → 2100</h2>
  ${isPublished(episode) ? "" : html`<p class="section-lede">Coming soon — details may change before the premiere.</p>`}
  <ol class="eras">
    ${episode.eras.map((era) => html`<li class="era${era.prediction ? " is-prediction" : ""}">
      <span class="era-year">${era.year}</span>
      <span class="era-place">${era.prediction ? "Prediction · a scenario, not a fact" : `You wake up: ${era.place}`}</span>
      <span class="era-line">${era.line}</span>
    </li>`)}
  </ol>
</section>`;

const cardsPreview = (episode) => html`<section class="ep-cards wrap" aria-labelledby="cards-title">
  <p class="section-kicker">Collect them</p>
  <h2 id="cards-title" class="section-title">${episode.facts.length} “Did you know that…” cards</h2>
  <p class="section-lede">${questionCount(episode) ? "Answer each era’s quiz question correctly and its card joins" : "The quiz arrives with the episode; then these cards join"} <a href="/collection/">your collection</a>. Progress stays in this browser only.</p>
  <ul class="fact-grid" data-collection-scope="${episode.slug}">${episode.facts.map((card) => factCard(card, episode, { locked: true }))}</ul>
</section>`;

function neighbours(catalog, episode) {
  const index = catalog.episodes.indexOf(episode);
  const prev = catalog.episodes[index - 1];
  const next = catalog.episodes[index + 1];
  return html`<nav class="ep-nav wrap" aria-label="More episodes">
  ${prev ? html`<a class="ep-nav-link" href="${episodePath(prev)}"><span>← No. ${episodeNumber(prev)}</span><strong>${prev.title}</strong></a>` : html`<span></span>`}
  ${next ? html`<a class="ep-nav-link ep-nav-next" href="${episodePath(next)}"><span>No. ${episodeNumber(next)} →</span><strong>${next.title}</strong></a>` : html`<a class="ep-nav-link ep-nav-next" href="/#map"><span>Next →</span><strong>You choose the subject</strong></a>`}
</nav>`;
}

export function episodePage(catalog, episode) {
  const published = isPublished(episode);
  const structuredData = [
    breadcrumbs([["Home", "/"], ["The series", "/#series"], [episode.title, episodePath(episode)]]),
    ...(published ? [videoObject(episode)] : []),
  ];
  const main = html`<article class="episode">
  <header class="ep-hero wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/#series">The series</a> <span aria-hidden="true">/</span> <span aria-current="page">No. ${episodeNumber(episode)}</span></nav>
    <p class="ep-kicker">No. ${episodeNumber(episode)} · Subject: <a href="${subjectPath(episode.subjectSlug)}">${episode.subject}</a> · ${statusPill(episode)}</p>
    <h1 class="ep-title">${episode.title}</h1>
    <p class="ep-hook">${episode.hook}</p>
    <p class="ep-question">${episode.question}</p>
  </header>
  ${quiz(episode)}
  ${player(episode)}
  ${timeline(episode)}
  ${cardsPreview(episode)}
  <section class="ep-about wrap" aria-labelledby="about-ep-title">
    <div>
      <h2 id="about-ep-title" class="section-title">About this episode</h2>
      <p>${episode.summary}</p>
      <h3 class="small-title">The question at the end</h3>
      <p class="ep-prompt">“${episode.commentPrompt}”</p>
      <p class="cta-row"><a class="btn btn-ghost" href="${published ? watchUrl(episode) : CHANNEL_URL}" rel="noopener">${icon("comment")}<span>${published ? "Answer in the comments" : "Visit the channel"}</span></a></p>
    </div>
    <div>
      <h3 class="small-title">Words that find this episode</h3>
      ${keywordChips(episode.keywords, 14)}
    </div>
  </section>
  ${neighbours(catalog, episode)}
</article>`;
  return page({
    newsletter: catalog.newsletter,
    title: `No. ${episodeNumber(episode)} — ${episode.title} · ${SITE.name}`,
    description: `${episode.hook} ${episode.question}`,
    path: episodePath(episode),
    ogType: published ? "video.episode" : "article",
    image: episode.thumbnail ?? SITE.ogImage,
    structuredData,
    main,
  });
}

export function subjectPageForEpisode(catalog, episode) {
  const index = catalog.episodes.indexOf(episode);
  const main = html`<section class="subject-hero wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/#map">Subjects</a> <span aria-hidden="true">/</span> <span aria-current="page">${episode.subject}</span></nav>
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
    title: `${episode.subject} — Did You Know That? No. ${episodeNumber(episode)}`,
    description: `${episode.subject}: ${episode.hook}`,
    path: subjectPath(episode.subjectSlug),
    structuredData: [breadcrumbs([["Home", "/"], ["Subjects", "/#map"], [episode.subject, subjectPath(episode.subjectSlug)]])],
    main,
  });
}

export function subjectPageForRequest(catalog, request) {
  const label = request.status === "requested" ? "Requested" : "Idea";
  const main = html`<section class="subject-hero wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/#map">Subjects</a> <span aria-hidden="true">/</span> <span aria-current="page">${request.subject}</span></nav>
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
    structuredData: [breadcrumbs([["Home", "/"], ["Subjects", "/#map"], [request.subject, subjectPath(request.slug)]])],
    main,
  });
}
