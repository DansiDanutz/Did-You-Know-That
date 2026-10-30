// Main episodes are numbered ("No. 06"); a sub-episode belongs to one of them ("Medicine 1 of 10") and has no
// number of its own. Pure labels and ordering shared by the build (tools/lib) and the browser.

const pad = (n) => String(n).padStart(2, "0");

/** True for a sub-episode (it carries `series: { parent, name, part, of }`), false for a main episode. */
export const isSubEpisode = (episode) => Boolean(episode?.series);

/** "No. 06" for a main episode, "Medicine 1" for a sub-episode (also works on a requested subject with a series). */
export const episodeTag = (item) => (item?.series ? `${item.series.name} ${item.series.part}` : `No. ${pad(item.number)}`);

/** "No. 06" for a main episode, "Medicine 1 of 10" for a sub-episode. */
export const episodeTagLong = (item) => (item?.series ? `${episodeTag(item)} of ${item.series.of}` : episodeTag(item));

/** The short glyph on the subject map: "06" or "M1". */
export const episodeGlyph = (episode) => (isSubEpisode(episode) ? `${episode.series.name[0]}${episode.series.part}` : pad(episode.number));

export const mainEpisodes = (catalog) => (catalog?.episodes ?? []).filter((e) => !isSubEpisode(e)).sort((a, b) => a.number - b.number);

/** A main episode's sub-episodes, by part. */
export const subEpisodesOf = (catalog, parentSlug) =>
  (catalog?.episodes ?? []).filter((e) => e.series?.parent === parentSlug).sort((a, b) => a.series.part - b.series.part);

/** Series position: a main episode by its number, a sub-episode right after its parent, by part. */
function orderKey(catalog) {
  const numberOf = new Map(mainEpisodes(catalog).map((e) => [e.slug, e.number]));
  const PART_STEP = 0.01;
  return (e) => (isSubEpisode(e) ? (numberOf.get(e.series.parent) ?? Number.MAX_SAFE_INTEGER) + e.series.part * PART_STEP : e.number);
}

/** Episodes in series order (No. 06, Medicine 1, Medicine 2, No. 07 …), as a new array. */
export function inSeriesOrder(catalog, episodes = catalog?.episodes ?? []) {
  const key = orderKey(catalog);
  return [...episodes].sort((a, b) => key(a) - key(b));
}

/** Newest first: the latest publishedAt, ties broken by series order (later first), as a new array. */
export function newestFirst(catalog, episodes = catalog?.episodes ?? []) {
  const key = orderKey(catalog);
  return [...episodes].sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")) || key(b) - key(a));
}
