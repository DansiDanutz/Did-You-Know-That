// "Did you know?" question of the day (v3 phase 3). Deterministic: every player gets the same question
// on the same date, drawn from the published episodes' sourced quiz questions, cycling through all of
// them before any repeats. A right FIRST answer earns 5 points once per day (ledger event daily:<date>).
// Skipping just shows the fact — it costs nothing, there is no streak and nothing to lose.
// Pure functions; the caller passes the player's local date (YYYY-MM-DD) and an ISO timestamp.
import { award, dailyEventId } from "./ledger.js";
import { inSeriesOrder } from "./episodes.js";

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MS_PER_DAY = 86_400_000;
const FIRST_STRIDE = 7;
/** Attempts older than this many days are dropped from storage (the ledger keeps the points). */
export const DAILY_HISTORY_DAYS = 60;

export const isIsoDate = (value) => ISO_DATE.test(String(value ?? ""));
const pad = (n) => String(n).padStart(2, "0");
const isIndex = (value) => Number.isInteger(value) && value >= 0;
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** The player's local calendar date, YYYY-MM-DD. */
export const localIsoDate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Whole days since 1970-01-01 for a YYYY-MM-DD date (time zones never shift it). */
export function dayNumber(isoDate) {
  if (!isIsoDate(isoDate)) throw new Error(`"${isoDate}" is not a YYYY-MM-DD date`);
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/** A step that is coprime with the pool size, so consecutive days walk through every question once. */
export function strideFor(size) {
  let stride = FIRST_STRIDE;
  while (gcd(stride, size) !== 1) stride += 1;
  return stride;
}

const isPublished = (episode) => episode?.status === "published" && /^[A-Za-z0-9_-]{11}$/.test(episode.youtubeId ?? "");

/** Published before `isoDate` (a YYYY-MM-DD string compare); without a date, every published episode. */
const publishedBefore = (isoDate) => (episode) => !isoDate || (isIsoDate(episode.publishedAt) && episode.publishedAt < isoDate);

/**
 * Every question of every published episode, in a stable order (series order, then quiz order).
 * With a date, only episodes published before that day: a new episode joins the pool the day after
 * its premiere, so publishing it never swaps the question people already answered today.
 */
export function dailyPool(catalog, isoDate) {
  const eligible = (catalog?.episodes ?? []).filter(isPublished).filter(publishedBefore(isoDate));
  return inSeriesOrder(catalog, eligible)
    .flatMap((episode) =>
      (episode.quiz?.questions ?? []).map((question) => ({
        slug: episode.slug,
        number: episode.number,
        series: episode.series,
        title: episode.title,
        subject: episode.subject,
        question,
        card: episode.facts.find((card) => card.id === question.card) ?? null,
      })),
    );
}

/** The question of the day for a date, or null when nothing was published before that day. */
export function dailyFor(catalog, isoDate) {
  const pool = dailyPool(catalog, isoDate);
  if (!pool.length) return null;
  const index = (((dayNumber(isoDate) * strideFor(pool.length)) % pool.length) + pool.length) % pool.length;
  return pool[index];
}

export const dailyEntry = (state, isoDate) => state.daily?.[isoDate] ?? null;

/** Keeps only the most recent attempts so storage never grows without bound. */
function pruned(daily) {
  const keep = Object.keys(daily).sort().slice(-DAILY_HISTORY_DAYS);
  return Object.fromEntries(keep.map((date) => [date, daily[date]]));
}

/** Stored attempts are untrusted: keep well-formed { first, solved, skipped? } entries by date. */
export function parseDaily(value) {
  if (!isPlainObject(value)) return {};
  const valid = Object.entries(value).filter(([date, entry]) => {
    if (!isIsoDate(date) || !isPlainObject(entry) || typeof entry.solved !== "boolean") return false;
    if (entry.skipped === true) return entry.first === null || isIndex(entry.first);
    return isIndex(entry.first);
  });
  return pruned(Object.fromEntries(valid.map(([date, e]) => [date, { first: e.first, solved: e.solved, ...(e.skipped === true ? { skipped: true } : {}) }])));
}

/**
 * Records an answer to the day's question: { state, correct, firstTry, awards }. 5 points only for a
 * right first attempt on a day that was not skipped; a wrong answer can be retried for 0 points.
 */
export function answerDaily(state, catalog, isoDate, choice, at) {
  const pick = isIsoDate(isoDate) ? dailyFor(catalog, isoDate) : null;
  if (!pick || !isIndex(choice) || choice >= pick.question.options.length) return { state, correct: false, firstTry: false, awards: [] };
  const previous = dailyEntry(state, isoDate);
  const correct = choice === pick.question.answerIndex;
  const firstTry = !previous;
  const entry = previous
    ? { ...previous, first: previous.first ?? choice, solved: previous.solved || correct }
    : { first: choice, solved: correct };
  const next = { ...state, daily: pruned({ ...(state.daily ?? {}), [isoDate]: entry }) };
  if (!firstTry || !correct) return { state: next, correct, firstTry, awards: [] };
  const { ledger, awarded } = award(next.ledger, { type: "daily", id: dailyEventId(isoDate), at });
  return { state: { ...next, ledger }, correct, firstTry, awards: awarded ? [awarded] : [] };
}

/** "Just show me the fact": no points today, nothing lost — also after a wrong first try. A solved day stays as it is. */
export function skipDaily(state, isoDate) {
  if (!isIsoDate(isoDate)) return state;
  const entry = dailyEntry(state, isoDate);
  if (entry?.solved || entry?.skipped) return state;
  const next = entry ? { ...entry, skipped: true } : { first: null, solved: false, skipped: true };
  return { ...state, daily: pruned({ ...(state.daily ?? {}), [isoDate]: next }) };
}

/** What the daily widget shows: "ask" (fresh), "retry" (wrong first try), or "done" (solved or skipped). */
export function dailyStatus(state, isoDate) {
  const entry = dailyEntry(state, isoDate);
  if (!entry) return "ask";
  if (entry.solved || entry.skipped) return "done";
  return "retry";
}
