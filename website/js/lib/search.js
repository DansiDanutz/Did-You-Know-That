// Subject search: find an episode (or a requested subject) by a word.
// Pure ES module, no dependencies — used by the browser and by the Node tests.

const DEFAULT_LIMIT = 8;
const SCORE = { subjectExact: 100, keywordExact: 70, subjectPrefix: 60, keywordPrefix: 40, title: 30, text: 15 };

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const watchUrlFor = (episode) =>
  episode.status === "published" && episode.youtubeId ? `https://www.youtube.com/watch?v=${episode.youtubeId}` : null;

function episodeEntry(episode) {
  return {
    kind: "episode",
    slug: episode.slug,
    label: episode.subject,
    title: `No. ${String(episode.number).padStart(2, "0")} · ${episode.title}`,
    status: episode.status,
    url: `/episodes/${episode.slug}/`,
    watchUrl: watchUrlFor(episode),
    subject: normalize(episode.subject),
    subjectBare: normalize(episode.subject.replace(/^the\s+/i, "")),
    keywords: episode.keywords.map(normalize),
    titleText: normalize(episode.title),
    text: normalize([episode.hook, episode.question, episode.summary].join(" ")),
  };
}

function requestEntry(request) {
  return {
    kind: "requested",
    slug: request.slug,
    label: request.subject,
    title: request.status === "requested" ? "Requested — vote in the comments" : "Idea — vote in the comments",
    status: request.status,
    url: `/subject/${request.slug}/`,
    watchUrl: null,
    subject: normalize(request.subject),
    subjectBare: normalize(request.subject),
    keywords: request.keywords.map(normalize),
    titleText: "",
    text: normalize(request.pitch),
  };
}

/** Builds the searchable index from the catalog (episodes first, then requested subjects). */
export function buildIndex(catalog) {
  return [...(catalog.episodes ?? []).map(episodeEntry), ...(catalog.requested ?? []).map(requestEntry)];
}

function scoreEntry(entry, query) {
  if (entry.subject === query || entry.subjectBare === query) return SCORE.subjectExact;
  if (entry.keywords.includes(query)) return SCORE.keywordExact;
  if (entry.subject.startsWith(query) || entry.subjectBare.startsWith(query)) return SCORE.subjectPrefix;
  if (entry.keywords.some((k) => k.startsWith(query))) return SCORE.keywordPrefix;
  if (entry.titleText.includes(query)) return SCORE.title;
  if (query.length >= 3 && entry.text.includes(query)) return SCORE.text;
  return 0;
}

const publicFields = ({ kind, slug, label, title, status, url, watchUrl }) => ({ kind, slug, label, title, status, url, watchUrl });

/** Ranked matches for a query. Episodes win ties over requested subjects (stable sort). */
export function search(index, rawQuery, limit = DEFAULT_LIMIT) {
  const query = normalize(rawQuery);
  if (!query) return [];
  return index
    .map((entry, order) => ({ entry, order, score: scoreEntry(entry, query) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((hit) => publicFields(hit.entry));
}
