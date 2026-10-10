// The episode catalog (data/episodes.json): validation and the pure "publish a video" transform.
// No dependencies; every function returns new data and never mutates its input.

export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EPISODE_STATUSES = new Set(["draft", "published"]);
const REQUEST_STATUSES = new Set(["idea", "requested"]);
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
  if (!Number.isInteger(episode.number) || episode.number < 1) errors.push(`${at}: number must be a positive integer`);
  if (!SLUG_PATTERN.test(episode.slug ?? "")) errors.push(`${at}: slug must be lowercase-kebab-case`);
  if (!SLUG_PATTERN.test(episode.subjectSlug ?? "")) errors.push(`${at}: subjectSlug must be lowercase-kebab-case`);
  for (const field of REQUIRED_TEXT) if (!isText(episode[field])) errors.push(`${at}: ${field} is required`);
  if (!isKeywordList(episode.keywords)) errors.push(`${at}: keywords must be a non-empty array of words`);
  if (!EPISODE_STATUSES.has(episode.status)) errors.push(`${at}: status must be draft or published`);
  if (!Array.isArray(episode.eras) || episode.eras.some((era) => !isText(era.year) || !isText(era.line))) {
    errors.push(`${at}: eras must be an array of { year, place, line }`);
  }
  errors.push(...validateQuiz(episode.quiz, at));
  if (!Array.isArray(episode.facts) || episode.facts.some((card) => !SLUG_PATTERN.test(card.id ?? "") || !isText(card.year) || !isText(card.fact) || !isText(card.source))) {
    errors.push(`${at}: facts must be an array of { id, year, fact, source }`);
  }
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

function validateRequest(request, at) {
  const errors = [];
  if (!isText(request.subject)) errors.push(`${at}: subject is required`);
  if (!SLUG_PATTERN.test(request.slug ?? "")) errors.push(`${at}: slug must be lowercase-kebab-case`);
  if (!REQUEST_STATUSES.has(request.status)) errors.push(`${at}: status must be idea or requested`);
  if (!isKeywordList(request.keywords)) errors.push(`${at}: keywords must be a non-empty array of words`);
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
  for (const n of new Set(duplicates(catalog.episodes.map((e) => e.number)))) errors.push(`duplicate episode number ${n}`);
  const cardIds = catalog.episodes.flatMap((e) => (Array.isArray(e.facts) ? e.facts.map((card) => card.id) : []));
  for (const id of new Set(duplicates(cardIds))) errors.push(`duplicate fact card id "${id}"`);
  const subjectSlugs = [...catalog.episodes.map((e) => e.subjectSlug), ...requested.map((r) => r.slug)];
  for (const slug of new Set(duplicates(subjectSlugs))) errors.push(`subject slug "${slug}" is used more than once`);
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
