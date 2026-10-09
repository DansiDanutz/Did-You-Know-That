// Publication data for each episode and audience (docs/DATA-CONTRACT.md v1).
// Pure validation: a malformed entry fails the unit tests, never the site.

export const SCHEMA_VERSION = 1;
export const PUBLICATION_STATUSES = Object.freeze(["draft", "ready", "scheduled", "published"]);
export const TOPICS = Object.freeze({
  kids: Object.freeze(["digital-life", "body-feelings", "family-friends", "animals", "nature", "everyday-science"]),
  adults: Object.freeze(["history", "science", "nature", "technology", "health", "finance", "everyday-life"]),
});

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const isLanguageList = (value) => Array.isArray(value) && value.every((code) => LANGUAGE.test(code));

// Returns a list of human-readable problems; empty means valid.
export function validatePublication(entry, audience) {
  if (!entry || typeof entry !== "object") return ["publication data is missing"];
  const errors = [];
  const fail = (field, why) => errors.push(`${field}: ${why}`);
  if (entry.schemaVersion !== SCHEMA_VERSION) fail("schemaVersion", `must be ${SCHEMA_VERSION}`);
  if (typeof entry.episodeId !== "string" || !SLUG.test(entry.episodeId)) fail("episodeId", "lowercase words joined by -");
  if (typeof entry.slug !== "string" || !SLUG.test(entry.slug)) fail("slug", "lowercase words joined by -");
  if (!TOPICS[audience]?.includes(entry.topic)) fail("topic", `not a ${audience} topic`);
  if (!PUBLICATION_STATUSES.includes(entry.publicationStatus)) fail("publicationStatus", PUBLICATION_STATUSES.join(" / "));
  if (!LANGUAGE.test(entry.videoLanguage ?? "")) fail("videoLanguage", "a language code such as en");
  if (!isLanguageList(entry.narrationLanguages)) fail("narrationLanguages", "a list of language codes");
  if (entry.captionLanguages !== undefined && !isLanguageList(entry.captionLanguages)) fail("captionLanguages", "a list of language codes");
  if (entry.durationSeconds !== undefined && !(Number.isFinite(entry.durationSeconds) && entry.durationSeconds > 0)) {
    fail("durationSeconds", "a positive number measured from the master");
  }
  const needsDate = entry.publicationStatus === "scheduled" || entry.publicationStatus === "published";
  if (needsDate && !ISO_WITH_ZONE.test(entry.publishedAt ?? "")) fail("publishedAt", "ISO 8601 with a timezone");
  if (entry.youtubeId !== undefined) {
    if (!YOUTUBE_ID.test(entry.youtubeId)) fail("youtubeId", "11 characters A-Z a-z 0-9 _ -");
    if (entry.publicationStatus !== "published") fail("youtubeId", "only on a published episode");
  }
  return errors;
}

export const isPlayable = (entry) =>
  entry?.publicationStatus === "published" && YOUTUBE_ID.test(entry.youtubeId ?? "") && ISO_WITH_ZONE.test(entry.publishedAt ?? "");

// The episodes one audience can see (coming-soon placeholders have no publication data).
export function catalogFor(stories, audience) {
  return stories
    .filter((story) => story.publication?.[audience])
    .map((story) => ({ id: story.id, card: story.card, publication: story.publication[audience] }));
}
