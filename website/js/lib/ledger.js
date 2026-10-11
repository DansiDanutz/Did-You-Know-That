// Points ledger: an append-only list of events { id, type, pts, at } kept with the local profile's
// progress. Points come only from what a player learned — never from watching, clicking or playing
// a video (YouTube fake-engagement policy). Every award is idempotent by its event id, so a refresh,
// a replay or a second tab can never count the same thing twice. Pure functions, no storage here.

/** Points per award type (approved v3 plan). `daily` is reserved for the phase 3 daily question. */
export const POINTS = Object.freeze({ quiz: 10, guess: 25, perfect: 50, cards: 20, daily: 5 });

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const EVENT_ID_PATTERNS = Object.freeze({
  quiz: new RegExp(`^quiz:${SLUG}:${SLUG}$`),
  guess: new RegExp(`^guess:${SLUG}$`),
  perfect: new RegExp(`^perfect:${SLUG}$`),
  cards: new RegExp(`^cards:${SLUG}$`),
  daily: /^daily:\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // Spending points on Special Cards arrives in phase 2; parsing already understands it.
  spend: new RegExp(`^spend:card:${SLUG}$`),
});
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export const quizEventId = (slug, questionId) => `quiz:${slug}:${questionId}`;
export const guessEventId = (slug) => `guess:${slug}`;
export const perfectEventId = (slug) => `perfect:${slug}`;
export const cardsEventId = (slug) => `cards:${slug}`;
export const dailyEventId = (isoDate) => `daily:${isoDate}`;

export const isValidEventId = (type, id) => Boolean(EVENT_ID_PATTERNS[type]?.test(String(id ?? "")));
const hasEvent = (ledger, id) => ledger.some((event) => event.id === id);

/**
 * Returns { ledger, awarded }: a new ledger with the award appended, or the same ledger and
 * awarded = null when that event id was already earned. Points are fixed by type; a caller can
 * never choose them. Throws on an unknown type, an id that does not match it, or a bad timestamp.
 */
export function award(ledger, { type, id, at, pts }) {
  if (!Object.hasOwn(POINTS, type)) throw new Error(`unknown award type "${type}"`);
  if (!isValidEventId(type, id)) throw new Error(`event id "${id}" does not match type "${type}"`);
  if (!ISO_TIME.test(at ?? "")) throw new Error(`award ${id} needs an ISO timestamp`);
  if (pts !== undefined && pts !== POINTS[type]) throw new Error(`points are fixed by type (${type} = ${POINTS[type]})`);
  if (hasEvent(ledger, id)) return { ledger, awarded: null };
  const awarded = { id, type, pts: POINTS[type], at };
  return { ledger: [...ledger, awarded], awarded };
}

function isValidEvent(event) {
  if (event === null || typeof event !== "object") return false;
  const { id, type, pts, at } = event;
  if (!isValidEventId(type, id) || !ISO_TIME.test(at ?? "")) return false;
  if (type === "spend") return Number.isInteger(pts) && pts > 0;
  return pts === POINTS[type];
}

/** Stored events are untrusted: keep only well-formed ones, first occurrence of each id wins. */
export function parseLedger(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isValidEvent)
    .filter((event, i, all) => all.findIndex((other) => other.id === event.id) === i)
    .map(({ id, type, pts, at }) => ({ id, type, pts, at }));
}

/** Points available: everything earned minus everything spent. */
export const balance = (ledger) => ledger.reduce((sum, event) => sum + (event.type === "spend" ? -event.pts : event.pts), 0);

/** Points earned on one episode (quiz answers, guess, perfect and cards bonuses). */
export function earnedFor(ledger, slug) {
  return ledger
    .filter((event) => event.type !== "spend" && event.type !== "daily")
    .filter((event) => event.id.split(":")[1] === slug)
    .reduce((sum, event) => sum + event.pts, 0);
}
