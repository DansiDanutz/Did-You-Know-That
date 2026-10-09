// Merges a language-neutral story (ids, art, answers) with the texts of one
// language and audience. Missing translations fall back to English per field.

export const AUDIENCES = Object.freeze(["kids", "adults"]);

function entryFor(locale, storyId, audience) {
  const entry = locale?.stories?.[storyId];
  if (!entry) return undefined;
  return entry[audience] ?? (entry.kids || entry.adults ? undefined : entry);
}

// Fields like `art` or `secretHash` may differ per audience: { kids, adults }.
const forAudience = (value, audience) =>
  value && typeof value === "object" && !Array.isArray(value) && audience in value ? value[audience] : value;

function localizePage(page, text, audience) {
  const base = { ...page, ...text, art: forAudience(page.art, audience) };
  if (page.type === "quiz") return { ...base, answer: page.answer[audience] };
  if (page.type === "story") return { ...base, spark: { id: page.spark, note: text.note } };
  return base;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

// Card picture = the subject's own image: custom artwork first, then the
// episode's YouTube thumbnail; otherwise the card falls back to its SVG art.
function cardImage(story, audience) {
  const custom = forAudience(story.card.image, audience);
  if (custom) return custom;
  const videoId = forAudience(story.youtubeId, audience);
  return YOUTUBE_ID.test(videoId ?? "") ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
}

export function localizeStory(story, locale, fallback, audience) {
  const own = entryFor(locale, story.id, audience) ?? {};
  const eng = entryFor(fallback, story.id, audience) ?? {};
  const pick = (field) => own[field] ?? eng[field];
  const pageText = (id) => own.pages?.[id] ?? eng.pages?.[id] ?? {};
  const mission = own.mission ?? eng.mission ?? [];
  return {
    ...story,
    secretHash: forAudience(story.secretHash, audience),
    youtubeId: forAudience(story.youtubeId, audience),
    title: pick("title"),
    teaser: pick("teaser"),
    mission,
    card: {
      ...story.card,
      art: forAudience(story.card.art, audience),
      image: cardImage(story, audience),
      ...(eng.card ?? {}),
      ...(own.card ?? {}),
    },
    pages: forAudience(story.pages, audience).map((page) => localizePage(page, pageText(page.id), audience)),
  };
}
