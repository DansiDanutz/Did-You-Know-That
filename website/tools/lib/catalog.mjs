// The episode catalog (data/episodes.json): validation and the pure "publish a video" transform.
// No dependencies; every function returns new data and never mutates its input.
import { LOCALIZATION_LANGUAGES } from "../../js/lib/player-prefs.js";
import { localizationProblems } from "../../js/lib/localizations.js";

export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EPISODE_STATUSES = new Set(["draft", "published"]);
const REQUEST_STATUSES = new Set(["idea", "requested", "next"]);
const REQUIRED_TEXT = ["title", "subject", "hook", "question", "guess", "summary", "commentPrompt"];

export const thumbnailFor = (youtubeId) => `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;

/** Self-hosted artwork lives under /assets/ as a .png or .jpg with .webp siblings (see README). */
export const LOCAL_THUMBNAIL_PATTERN = /^\/assets\/[a-z0-9/_-]+\.(png|jpg)$/;
export const isLocalThumbnail = (value) => LOCAL_THUMBNAIL_PATTERN.test(value ?? "");
const isYoutubeThumbnail = (value, youtubeId) => value === thumbnailFor(youtubeId);

const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isKeywordList = (value) => Array.isArray(value) && value.length > 0 && value.every(isText);

function validateEpisode(episode, at) {
  const errors = [];
  if (episode.series === undefined && (!Number.isInteger(episode.number) || episode.number < 1)) errors.push(`${at}: number must be a positive integer`);
  if (episode.series !== undefined && episode.number !== undefined) errors.push(`${at}: a sub-episode (series) has no number; only main episodes are numbered`);
  if (!SLUG_PATTERN.test(episode.slug ?? "")) errors.push(`${at}: slug must be lowercase-kebab-case`);
  if (!SLUG_PATTERN.test(episode.subjectSlug ?? "")) errors.push(`${at}: subjectSlug must be lowercase-kebab-case`);
  for (const field of REQUIRED_TEXT) if (!isText(episode[field])) errors.push(`${at}: ${field} is required`);
  if (!isKeywordList(episode.keywords)) errors.push(`${at}: keywords must be a non-empty array of words`);
  if (!EPISODE_STATUSES.has(episode.status)) errors.push(`${at}: status must be draft or published`);
  if (!Array.isArray(episode.eras) || episode.eras.some((era) => !isText(era.year) || !isText(era.line))) {
    errors.push(`${at}: eras must be an array of { year, place, line }`);
  } else {
    errors.push(...validateLadder(episode.eras, at));
  }
  if (episode.format !== undefined && episode.format !== "explainer") errors.push(`${at}: format must be "explainer" when set (omit it for a main-series episode)`);
  errors.push(...validateQuiz(episode.quiz, at));
  const factsValid = Array.isArray(episode.facts) && episode.facts.every((card) => SLUG_PATTERN.test(card?.id ?? "") && isText(card.year) && isText(card.fact) && isText(card.source));
  if (!factsValid) errors.push(`${at}: facts must be an array of { id, year, fact, source }`);
  else errors.push(...validateQuestions(episode.quiz?.questions, episode.facts, at));
  if (episode.thumbnail !== null && episode.thumbnail !== undefined && !isLocalThumbnail(episode.thumbnail) && !isYoutubeThumbnail(episode.thumbnail, episode.youtubeId)) {
    errors.push(`${at}: thumbnail must be null, a local /assets/….png|jpg, or the episode's own i.ytimg.com maxresdefault URL`);
  }
  if (episode.status === "draft" && (episode.youtubeId || episode.publishedAt)) {
    errors.push(`${at}: a draft episode must have youtubeId and publishedAt set to null`);
  }
  if (episode.status === "published") {
    if (!episode.thumbnail) errors.push(`${at}: a published episode needs a thumbnail`);
    if (!YOUTUBE_ID_PATTERN.test(episode.youtubeId ?? "")) errors.push(`${at}: a published episode needs an 11-character youtubeId`);
    if (!DATE_PATTERN.test(episode.publishedAt ?? "")) errors.push(`${at}: a published episode needs publishedAt (YYYY-MM-DD)`);
  }
  errors.push(...validateLocalizations(episode, at));
  return errors;
}

/**
 * Optional `localizations`: { "<ro|fr|es|zh>": { "subtitles": "/assets/captions/<slug>/<lang>.vtt", "audio"?: "<https blob URL>" } }
 * — our own subtitles (in git) and an optional voice-over (public Vercel Blob store) for the episode.
 * Only a published episode can have them.
 */
export function validateLocalizations(episode, at) {
  const localizations = episode.localizations;
  if (localizations === undefined) return [];
  if (!localizations || typeof localizations !== "object" || Array.isArray(localizations)) {
    return [`${at}: localizations must be an object of { "<language code>": { "subtitles": "…", "audio"?: "…" } }`];
  }
  const errors = [];
  if (episode.status !== "published") errors.push(`${at}: localizations are only allowed on a published episode`);
  for (const [code, entry] of Object.entries(localizations)) {
    if (!LOCALIZATION_LANGUAGES.includes(code)) {
      errors.push(`${at}: localizations."${code}" is not a localization language (${LOCALIZATION_LANGUAGES.join(", ")})`);
      continue;
    }
    for (const problem of localizationProblems(entry, code, episode.slug)) errors.push(`${at}: localizations."${code}" ${problem}`);
  }
  return errors;
}

const QUIZ_OPTIONS = { min: 2, max: 4 };

function validateQuiz(quiz, at) {
  if (!quiz || typeof quiz !== "object") return [`${at}: quiz is required`];
  const errors = [];
  if (!isText(quiz.question)) errors.push(`${at}: quiz.question is required`);
  if (!isText(quiz.reveal)) errors.push(`${at}: quiz.reveal is required`);
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  if (options.length < QUIZ_OPTIONS.min || options.length > QUIZ_OPTIONS.max || !options.every(isText)) {
    errors.push(`${at}: quiz.options must hold ${QUIZ_OPTIONS.min}–${QUIZ_OPTIONS.max} answers`);
  }
  if (!Number.isInteger(quiz.answerIndex) || quiz.answerIndex < 0 || quiz.answerIndex >= options.length) {
    errors.push(`${at}: quiz.answerIndex must point at one of the options`);
  }
  return errors;
}

const QUESTION_OPTIONS = { min: 3, max: 4 };
// RESEARCH.md fact numbers: F2, F4b, the v2 additions A1–A5, Medicine's M1–M13, Light's L1–L17, Weight's W1–W17 or Diabetes' D1–D20 (D5b).
const SOURCE_PATTERN = /^[FAMLWD]\d+[a-z]?$/;
const normalized = (text) => String(text).trim().toLowerCase().replace(/\s+/g, " ");

function validateQuestion(question, at, cardIds) {
  const errors = [];
  if (!SLUG_PATTERN.test(question?.id ?? "")) return [`${at}: id must be lowercase-kebab-case`];
  for (const field of ["era", "question", "reveal"]) if (!isText(question[field])) errors.push(`${at}: ${field} is required`);
  const options = Array.isArray(question.options) ? question.options : [];
  if (options.length < QUESTION_OPTIONS.min || options.length > QUESTION_OPTIONS.max || !options.every(isText)) {
    errors.push(`${at}: options must hold ${QUESTION_OPTIONS.min}–${QUESTION_OPTIONS.max} answers`);
  } else if (new Set(options.map(normalized)).size !== options.length) {
    errors.push(`${at}: options must be unique`);
  }
  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= options.length) {
    errors.push(`${at}: answerIndex must point at exactly one of the options`);
  }
  if (!cardIds.has(question.card)) errors.push(`${at}: card "${question.card}" is not one of this episode's fact cards`);
  if (!SOURCE_PATTERN.test(question.source ?? "")) errors.push(`${at}: source must be a RESEARCH.md fact number like "F18", "A3", "M7", "L3", "W5" or "D9"`);
  return errors;
}

/** Optional per-era quiz (quiz.questions): every question unlocks one fact card, every card has a question. */
function validateQuestions(questions, facts, at) {
  if (questions === undefined) return [];
  if (!Array.isArray(questions) || questions.length === 0) return [`${at}: quiz.questions must be a non-empty array when present`];
  const cardIds = new Set(facts.map((card) => card.id));
  const errors = questions.flatMap((question, i) => validateQuestion(question ?? {}, `${at} quiz.questions[${i}]`, cardIds));
  for (const id of new Set(duplicates(questions.map((q) => q?.id)))) errors.push(`${at}: duplicate question id "${id}"`);
  for (const card of new Set(duplicates(questions.map((q) => q?.card)))) errors.push(`${at}: fact card "${card}" is unlocked by more than one question`);
  const unlocked = new Set(questions.map((q) => q?.card));
  for (const card of facts.filter((c) => !unlocked.has(c.id))) errors.push(`${at}: fact card "${card.id}" has no quiz question to unlock it`);
  return errors;
}

export const RUNG_MAX_LENGTH = 28;

/**
 * Optional "how we saw it" ladder: when any era names a rung, every era needs one — a short label
 * (`rung`) and the episode's own sentence for it (`saw`) — so the ladder never has a missing step.
 */
export function validateLadder(eras, at) {
  if (!eras.some((era) => era.rung !== undefined || era.saw !== undefined)) return [];
  return eras.flatMap((era, i) => {
    const where = `${at} eras[${i}] (${era.year})`;
    const errors = [];
    if (!isText(era.rung)) errors.push(`${where}: rung is required once the episode has a ladder`);
    else if (era.rung.length > RUNG_MAX_LENGTH) errors.push(`${where}: rung must be at most ${RUNG_MAX_LENGTH} characters`);
    if (!isText(era.saw)) errors.push(`${where}: saw (how people saw it, in the episode's words) is required`);
    return errors;
  });
}

function validateRequest(request, at) {
  const errors = [];
  if (!isText(request.subject)) errors.push(`${at}: subject is required`);
  if (!SLUG_PATTERN.test(request.slug ?? "")) errors.push(`${at}: slug must be lowercase-kebab-case`);
  if (!REQUEST_STATUSES.has(request.status)) errors.push(`${at}: status must be idea or requested`);
  if (!isKeywordList(request.keywords)) errors.push(`${at}: keywords must be a non-empty array of words`);
  return errors;
}

const SERIES_MAX_PARTS = 10;

/**
 * Optional `series` on an episode or a requested subject: { parent, name, part, of } makes it a sub-episode of a
 * main episode ("Medicine 1 of 10"). The parent is a numbered episode, `name` is its subject, part runs 1 → of.
 */
function validateSeries(item, at, mains) {
  if (item.series === undefined) return [];
  const series = item.series;
  if (!series || typeof series !== "object" || Array.isArray(series)) return [`${at}: series must be { parent, name, part, of }`];
  const errors = [];
  const parent = mains.find((e) => e.slug === series.parent);
  if (!parent) errors.push(`${at}: series.parent "${series.parent}" is not a main (numbered) episode`);
  else if (series.name !== parent.subject) errors.push(`${at}: series.name must be the parent's subject "${parent.subject}"`);
  if (!Number.isInteger(series.of) || series.of < 1 || series.of > SERIES_MAX_PARTS) errors.push(`${at}: series.of must be a whole number from 1 to ${SERIES_MAX_PARTS}`);
  if (!Number.isInteger(series.part) || series.part < 1 || series.part > series.of) errors.push(`${at}: series.part must be a whole number from 1 to series.of`);
  return errors;
}

function validateAllSeries(catalog, requested) {
  const mains = catalog.episodes.filter((e) => e && e.series === undefined);
  const items = [
    ...catalog.episodes.map((e, i) => [e ?? {}, `episodes[${i}] (${e?.slug ?? "?"})`]),
    ...requested.map((r, i) => [r ?? {}, `requested[${i}] (${r?.slug ?? "?"})`]),
  ];
  const errors = items.flatMap(([item, at]) => validateSeries(item, at, mains));
  const parts = items.filter(([item]) => item.series).map(([item]) => `${item.series.parent} ${item.series.part}`);
  for (const part of new Set(duplicates(parts))) errors.push(`series part "${part}" is used more than once`);
  return errors;
}

const duplicates = (values) => values.filter((value, i) => values.indexOf(value) !== i);

/** Returns a list of human-readable problems; an empty list means the catalog is valid. */
export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || !Array.isArray(catalog.episodes)) {
    return ["catalog must be an object with an episodes array"];
  }
  const requested = catalog.requested ?? [];
  if (!Array.isArray(requested)) return ["requested must be an array"];

  const errors = [
    ...catalog.episodes.flatMap((episode, i) => validateEpisode(episode ?? {}, `episodes[${i}] (${episode?.slug ?? "?"})`)),
    ...requested.flatMap((request, i) => validateRequest(request ?? {}, `requested[${i}] (${request?.slug ?? "?"})`)),
  ];
  for (const slug of new Set(duplicates(catalog.episodes.map((e) => e.slug)))) errors.push(`duplicate slug "${slug}"`);
  errors.push(...validateAllSeries(catalog, requested));
  const numbers = catalog.episodes.filter((e) => e?.number !== undefined).map((e) => e.number);
  for (const n of new Set(duplicates(numbers))) errors.push(`duplicate episode number ${n}`);
  const cardIds = catalog.episodes.flatMap((e) => (Array.isArray(e.facts) ? e.facts.map((card) => card.id) : []));
  for (const id of new Set(duplicates(cardIds))) errors.push(`duplicate fact card id "${id}"`);
  const subjectSlugs = [...catalog.episodes.map((e) => e.subjectSlug), ...requested.map((r) => r.slug)];
  for (const slug of new Set(duplicates(subjectSlugs))) errors.push(`subject slug "${slug}" is used more than once`);
  if (requested.filter((r) => r?.status === "next").length > 1) errors.push(`only one requested subject can be "next"`);
  return errors;
}

const isoDate = (date) => date.toISOString().slice(0, 10);

/**
 * Returns a new catalog with the episode marked as published on YouTube. Throws on bad input.
 * A self-hosted thumbnail is kept; otherwise YouTube's maxresdefault image is used.
 * Re-publishing an already published episode needs { force: true }.
 */
export function addVideo(catalog, slug, youtubeId, now = new Date(), { force = false } = {}) {
  if (!YOUTUBE_ID_PATTERN.test(youtubeId ?? "")) {
    throw new Error(`"${youtubeId}" is not a YouTube id (expected the 11 characters after watch?v=)`);
  }
  const target = catalog.episodes.find((episode) => episode.slug === slug);
  if (!target) {
    const known = catalog.episodes.map((e) => e.slug).join(", ");
    throw new Error(`unknown episode slug "${slug}" (known: ${known})`);
  }
  if (target.status === "published" && !force) {
    throw new Error(`"${slug}" is already published (youtubeId ${target.youtubeId}); pass --force to replace it`);
  }
  const publish = (episode) => ({
    ...episode,
    status: "published",
    youtubeId,
    publishedAt: isoDate(now),
    thumbnail: isLocalThumbnail(episode.thumbnail) ? episode.thumbnail : thumbnailFor(youtubeId),
  });
  return { ...catalog, episodes: catalog.episodes.map((episode) => (episode.slug === slug ? publish(episode) : episode)) };
}
