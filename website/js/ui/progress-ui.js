// Read-only progress views: the episode step indicator, "continue where you left off" on the home
// page, per-episode progress on episode cards and the card-collection meters. It never writes
// progress and never awards anything; it re-renders whenever progress changes (PROGRESS_EVENT).
import { journeyState, continueTarget, episodeProgress, STEP_ANCHORS } from "../lib/journey.js";
import { unlockedCardIds, rankFor, earnedOf } from "../lib/progress.js";
import { store, PROGRESS_EVENT } from "../lib/progress-client.js";
import { loadCatalog } from "../lib/catalog-client.js";

const STEP_VERB = { guess: "Lock your guess", watch: "Watch the episode", quiz: "Continue the quiz", cards: "Finish your cards", next: "See what’s next" };
const pad = (n) => String(n).padStart(2, "0");

function renderStepper(nav, episode, state) {
  const { steps } = journeyState(state, episode);
  for (const step of steps) {
    const item = nav.querySelector(`[data-step="${step.id}"]`);
    if (!item) continue;
    item.classList.toggle("is-done", step.status === "done");
    item.classList.toggle("is-current", step.status === "current");
    const link = item.querySelector("a");
    if (step.status === "current") link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
    item.querySelector("[data-step-state]").textContent = step.status === "done" ? ", done" : step.status === "current" ? ", current step" : "";
  }
}

function renderEpisodeBadges(catalog, state) {
  for (const slot of document.querySelectorAll("[data-ep-progress]")) {
    const episode = catalog.episodes.find((e) => e.slug === slot.dataset.epProgress);
    if (!episode?.quiz?.questions?.length) continue;
    const p = episodeProgress(state, episode);
    slot.hidden = p.answered === 0 && p.cards === 0;
    slot.textContent = p.cards === p.totalCards ? `★ All ${p.totalCards} cards · ${p.points} pts` : `${p.cards}/${p.totalCards} cards · ${p.points} pts`;
  }
}

function renderMeter(meter, count, total) {
  meter.querySelector("[data-set-count]").textContent = String(count);
  const bar = meter.querySelector("[data-set-progress]");
  bar.value = Math.min(count, total);
  bar.textContent = `${count} of ${total}`;
}

function renderMeters(catalog, state) {
  for (const meter of document.querySelectorAll("[data-set-meter]")) {
    const episode = catalog.episodes.find((e) => e.slug === meter.dataset.setMeter);
    if (!episode) continue;
    const p = episodeProgress(state, episode);
    renderMeter(meter, p.cards, p.totalCards);
    const points = meter.querySelector("[data-set-points]");
    if (points) points.textContent = String(p.points);
  }
  for (const meter of document.querySelectorAll("[data-collection-meter]")) {
    renderMeter(meter, unlockedCardIds(state, catalog).length, Number(meter.dataset.total));
    const rank = meter.querySelector("[data-rank-name]");
    if (rank) rank.textContent = rankFor(earnedOf(state)).name;
  }
}

function renderContinue(section, catalog, state) {
  const target = continueTarget(state, catalog);
  section.hidden = !target;
  if (!target) return;
  const { episode, progress } = target;
  section.querySelector("[data-continue-link]").href = `/episodes/${episode.slug}/${STEP_ANCHORS[target.step]}`;
  section.querySelector("[data-continue-kicker]").textContent = target.kind === "continue" ? "Continue where you left off" : "Up next for you";
  section.querySelector("[data-continue-episode]").textContent = `No. ${pad(episode.number)} · ${episode.title}`;
  section.querySelector("[data-continue-meta]").textContent = target.kind === "continue"
    ? `${progress.answered} of ${progress.totalQuestions} questions · ${progress.cards} of ${progress.totalCards} cards`
    : `${progress.totalQuestions} questions and ${progress.totalCards} cards waiting`;
  section.querySelector("[data-continue-step]").textContent = target.kind === "continue" ? STEP_VERB[target.step] : "Start with your guess";
}

export async function init() {
  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    console.error("Progress views unavailable", error);
    return;
  }
  const nav = document.querySelector("[data-journey]");
  const episode = nav && catalog.episodes.find((e) => e.slug === nav.dataset.slug);
  const section = document.querySelector("[data-continue]");
  const render = (state) => {
    if (nav && episode) renderStepper(nav, episode, state);
    if (section) renderContinue(section, catalog, state);
    renderEpisodeBadges(catalog, state);
    renderMeters(catalog, state);
  };
  render(store.load());
  document.addEventListener(PROGRESS_EVENT, (event) => render(event.detail.state));
}
