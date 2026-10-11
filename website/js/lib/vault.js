// Card Vault: Special Cards bought with knowledge points. Each card has a cost and may also need a
// condition (an event the player earned, e.g. "perfect:time-compressed"). Buying is a ledger spend
// (`spend:card:<id>`), so what a player owns lives with the local profile's progress and survives
// reloads. Pure functions; the catalogue (data/special-cards.json) is validated here for the build too.
// Honest limitation: browser-stored points and unlisted videos are a soft lock, fine for a free game.
import { spend, balance, spendEventId, isAwardEventId } from "./ledger.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ART_PATTERN = /^\/assets\/special\/[a-z0-9-]+\.(svg|png|jpg|webp)$/;
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const ACCENTS = Object.freeze(["orange", "magenta", "cyan", "green", "purple", "blue"]);
/** Well-known placeholder / test videos that must never ship as a special video. */
export const PLACEHOLDER_VIDEO_IDS = Object.freeze(["dQw4w9WgXcQ", "aqz-KE-bpKQ", "ScMzIvxBSi4", "M7lc1UVf-VE", "jNQXAC9IVRw"]);

const isText = (value) => typeof value === "string" && value.trim().length > 0;
const duplicates = (values) => values.filter((value, i) => values.indexOf(value) !== i);

function validateVideo(video, at) {
  if (!video || typeof video !== "object") return [`${at}: video must be { "youtubeId": null } or an 11-character id`];
  const { youtubeId } = video;
  if (youtubeId === null) return [];
  if (!YOUTUBE_ID_PATTERN.test(youtubeId ?? "")) return [`${at}: video.youtubeId must be null or an 11-character YouTube id`];
  if (PLACEHOLDER_VIDEO_IDS.includes(youtubeId)) return [`${at}: video.youtubeId "${youtubeId}" is a placeholder/test video — use null until the real video exists`];
  return [];
}

function validateCard(card, at, episodeSlugs) {
  if (!SLUG_PATTERN.test(card?.id ?? "")) return [`${at}: id must be lowercase-kebab-case`];
  const errors = [];
  for (const field of ["title", "teaser"]) if (!isText(card[field])) errors.push(`${at}: ${field} is required`);
  if (!ART_PATTERN.test(card.art ?? "")) errors.push(`${at}: art must be a self-hosted /assets/special/….svg|png|jpg|webp`);
  if (!Number.isInteger(card.cost) || card.cost < 1) errors.push(`${at}: cost must be a whole number of points (1 or more)`);
  if (card.condition !== undefined) {
    if (!isAwardEventId(card.condition)) errors.push(`${at}: condition must be an earnable event id like "perfect:time-compressed"`);
    else if (episodeSlugs && card.condition.split(":")[0] !== "daily" && !episodeSlugs.includes(card.condition.split(":")[1])) {
      errors.push(`${at}: condition "${card.condition}" names an unknown episode`);
    }
  }
  if (!ACCENTS.includes(card.accent)) errors.push(`${at}: accent must be one of ${ACCENTS.join(", ")}`);
  errors.push(...validateVideo(card.video, at));
  return errors;
}

/** Human-readable problems with data/special-cards.json; an empty list means it is valid. */
export function validateSpecialCards(data, { episodeSlugs } = {}) {
  if (!data || typeof data !== "object" || !Array.isArray(data.cards)) return ["special-cards.json must be an object with a cards array"];
  const errors = data.cards.flatMap((card, i) => validateCard(card ?? {}, `cards[${i}] (${card?.id ?? "?"})`, episodeSlugs));
  for (const id of new Set(duplicates(data.cards.map((c) => c?.id)))) errors.push(`duplicate special card id "${id}"`);
  return errors;
}

export const isOwned = (ledger, card) => ledger.some((event) => event.id === spendEventId(card.id));
export const conditionMet = (ledger, card) => card.condition === undefined || ledger.some((event) => event.id === card.condition);

/** Everything the vault shows for a card: owned, condition, affordability and how many points are missing. */
export function cardStatus(ledger, card) {
  const points = balance(ledger);
  const owned = isOwned(ledger, card);
  const unlockedCondition = conditionMet(ledger, card);
  return {
    owned,
    conditionMet: unlockedCondition,
    affordable: points >= card.cost,
    canUnlock: !owned && unlockedCondition && points >= card.cost,
    shortBy: Math.max(0, card.cost - points),
    points,
  };
}

/**
 * Buys a Special Card: returns { state, ok, reason, spent }. reason is "owned" (already yours —
 * nothing spent again), "condition" (requirement not met yet) or "insufficient" (not enough points).
 */
export function unlockSpecialCard(state, card, at) {
  if (isOwned(state.ledger, card)) return { state, ok: true, reason: "owned", spent: null };
  if (!conditionMet(state.ledger, card)) return { state, ok: false, reason: "condition", spent: null };
  const result = spend(state.ledger, { cardId: card.id, cost: card.cost, at });
  if (result.error) return { state, ok: false, reason: result.error, spent: null };
  return { state: { ...state, ledger: result.ledger }, ok: true, reason: null, spent: result.spent };
}

/** Plain-language label for a condition id. */
export function conditionLabel(condition, episodeTitles = {}) {
  const [type, slug] = String(condition).split(":");
  const title = episodeTitles[slug] ?? slug;
  const labels = {
    perfect: `Get every answer right first time in “${title}”`,
    cards: `Collect every card of “${title}”`,
    guess: `Guess right before “${title}”`,
    quiz: `Answer a “${title}” question right first time`,
    daily: "Answer that day’s question",
  };
  return labels[type] ?? condition;
}
