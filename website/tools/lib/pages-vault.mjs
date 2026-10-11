// The Card Vault (/vault/): Special Cards bought with knowledge points (js/ui/vault.js).
// Every card is rendered locked; the browser's ledger decides what is owned.
import { html } from "./html.mjs";
import { page } from "./layout.mjs";
import { SITE } from "./site.mjs";
import { icon } from "./components.mjs";
import { conditionLabel } from "../../js/lib/vault.js";

const embedFor = (youtubeId) => `https://www.youtube-nocookie.com/embed/${youtubeId}`;

/** Click-to-play facade with our own art as the poster: nothing loads from YouTube before the click. */
const specialVideo = (card) =>
  card.video.youtubeId
    ? html`<div class="facade vault-facade" data-facade data-embed="${embedFor(card.video.youtubeId)}" data-title="${card.title}">
          <img src="${card.art}" alt="" width="600" height="840" loading="lazy" decoding="async">
          <button class="facade-play" type="button" data-play>${icon("play")}<span class="visually-hidden">Play the special video “${card.title}” (loads the YouTube player)</span></button>
        </div>`
    : html`<p class="vault-soon">${icon("bulb")}<span><strong>Special video coming soon.</strong> It’s being made now — your card is saved and the video will play right here.</span></p>`;

function specialCard(card, titles) {
  const condition = card.condition ? conditionLabel(card.condition, titles) : "";
  return html`<li class="vault-card accent-${card.accent} is-locked" id="card-${card.id}" data-special-card data-id="${card.id}" data-cost="${card.cost}" data-title="${card.title}"${card.condition ? html` data-condition="${card.condition}"` : ""}>
  <div class="vault-art">
    <img src="${card.art}" alt="" width="600" height="840" loading="lazy" decoding="async">
    <span class="vault-lock" aria-hidden="true">${icon("lock")}</span>
  </div>
  <div class="vault-body">
    <p class="vault-state" data-vault-state>${icon("lock")} Locked Special Card</p>
    <h2 class="vault-title">${card.title}</h2>
    <p class="vault-teaser">${card.teaser}</p>
    <div class="vault-locked" data-vault-locked>
      <p class="vault-cost"><strong>${card.cost}</strong> points</p>
      ${condition ? html`<p class="vault-condition" data-vault-condition>${icon("lock")} <span>Also needed: ${condition}</span></p>` : ""}
      <progress class="vault-progress" max="${card.cost}" value="0" data-vault-progress aria-label="Points towards ${card.title}">0</progress>
      <p class="vault-progress-text" data-vault-progress-text>Earn points in the episode quizzes to unlock it.</p>
      <p class="cta-row"><button class="btn btn-primary" type="button" data-unlock disabled>Unlock for ${card.cost} points</button></p>
    </div>
    <div class="vault-open" data-vault-open hidden>
      ${specialVideo(card)}
      <p class="cta-row"><button class="btn btn-ghost btn-small" type="button" data-share-special>Share this card</button></p>
    </div>
  </div>
</li>`;
}

export function vaultPage(catalog) {
  const titles = Object.fromEntries(catalog.episodes.map((e) => [e.slug, e.title]));
  const quizEpisode = catalog.episodes.find((e) => e.quiz?.questions?.length);
  const main = html`<section class="wrap vault-hero" aria-labelledby="vault-title">
  <p class="section-kicker">Card Vault</p>
  <h1 id="vault-title" class="section-title">Special Cards</h1>
  <p class="section-lede">Spend the knowledge points you earn in episode quizzes. Each Special Card opens a special video made only for players — a bonus mystery, a deeper dive, the story behind the story.</p>
  <div class="vault-wallet">
    <p>You have <strong data-vault-points>0</strong> points</p>
    ${quizEpisode ? html`<a class="btn btn-ghost btn-small" href="/episodes/${quizEpisode.slug}/#guess">Earn points: play the ${quizEpisode.title} quiz</a>` : ""}
  </div>
  <p class="rank-note">Points come from quiz answers — never from watching — and can’t be bought. Unlocked cards stay in this browser, with your profile.</p>
  <p class="vault-shared" data-vault-shared hidden>Someone shared a Special Card with you — it’s highlighted below. Earn points in the quizzes to unlock it.</p>
</section>
<section class="wrap" aria-label="Special Cards">
  <ul class="vault-grid">${catalog.special.cards.map((card) => specialCard(card, titles))}</ul>
  <p class="quiz-status" role="status" aria-live="polite" data-vault-status></p>
  <p class="storage-note" data-storage-note hidden>Your browser isn’t saving progress, so unlocked cards last only until you leave this page.</p>
</section>
<dialog class="sheet" id="unlock-sheet" aria-labelledby="unlock-title" data-unlock-dialog>
  <div class="sheet-head">
    <h2 class="sheet-title" id="unlock-title" data-unlock-title>Unlock this card?</h2>
    <button class="sheet-close" type="button" data-unlock-cancel aria-label="Close">×</button>
  </div>
  <p class="sheet-lede" data-unlock-text></p>
  <p class="cta-row"><button class="btn btn-primary" type="button" data-unlock-confirm>Unlock</button><button class="btn btn-ghost" type="button" data-unlock-cancel>Not now</button></p>
</dialog>`;
  return page({
    newsletter: catalog.newsletter,
    title: `Card Vault · ${SITE.name}`,
    description: "Spend the knowledge points you earn in Did You Know That? quizzes on Special Cards that open special videos made only for players.",
    path: "/vault/",
    currentPath: "/vault/",
    main,
  });
}
