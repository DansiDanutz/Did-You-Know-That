// Channel facts used by every generated page. Change them here, then run `npm run build:site`.

import { newestFirst, inSeriesOrder } from "../../js/lib/episodes.js";

export const SITE = {
  name: "Did You Know That?",
  url: "https://dexty.live",
  handle: "@Did-You-Know-that-2026",
  channelId: "UC7j29XhArv5tlRqQj2qAb4Q",
  tagline: "Amazing facts • Incredible stories • Endless curiosity",
  signOff: "Ask. Wonder. Repeat.",
  description:
    "Did You Know That? is a YouTube series: one subject per episode, traced from 1500 to today and on to 2100 with real data. Guess in the comments, stay to the end, check.",
  ogImage: "/assets/brand/og-card.jpg",
  logo: "/assets/brand/avatar-640.jpg",
};

export const CHANNEL_URL = `https://www.youtube.com/channel/${SITE.channelId}`;
export const HANDLE_URL = `https://www.youtube.com/${SITE.handle}`;
export const SUBSCRIBE_URL = `${CHANNEL_URL}?sub_confirmation=1`;

export { episodeTag, episodeTagLong, episodeGlyph, isSubEpisode, mainEpisodes, subEpisodesOf, inSeriesOrder } from "../../js/lib/episodes.js";
export const episodePath = (episode) => `/episodes/${episode.slug}/`;
export const subjectPath = (slug) => `/subject/${slug}/`;
export const watchUrl = (episode) => `https://www.youtube.com/watch?v=${episode.youtubeId}`;
export const embedUrlFor = (youtubeId) => `https://www.youtube-nocookie.com/embed/${youtubeId}`;
export const embedUrl = (episode) => embedUrlFor(episode.youtubeId);
export const isPublished = (episode) => episode.status === "published" && Boolean(episode.youtubeId);
export const absolute = (path) => new URL(path, SITE.url).href;

/** The newest published episode or sub-episode (latest publishedAt); it hosts the comment links. */
export function latestPublished(catalog) {
  return newestFirst(catalog, catalog.episodes.filter(isPublished))[0] ?? null;
}

/** Where a "comment on YouTube" button should go: the newest published video, else the channel. */
export const commentUrl = (catalog) => {
  const latest = latestPublished(catalog);
  return latest ? watchUrl(latest) : CHANNEL_URL;
};

/**
 * A local thumbnail "/assets/x/thumb.png" ships with "thumb.webp" (1280 wide) and "thumb-640.webp".
 * With a `version` (a content hash, see build-site.mjs) each URL gets "?v=<version>", so a replaced image
 * reaches visitors whose browser still holds the old one (assets are cached for a week).
 */
export function thumbnailSources(thumbnail, version) {
  const base = thumbnail.replace(/\.(png|jpg)$/, "");
  const query = version ? `?v=${version}` : "";
  return { fallback: `${thumbnail}${query}`, webp: `${base}.webp${query}`, webpSmall: `${base}-640.webp${query}` };
}
export const isLocalAsset = (path) => typeof path === "string" && path.startsWith("/assets/");

/**
 * The episode the home page puts front and center: the newest published one; before anything is
 * published, the next to premiere (the first draft in series order) as "Premieres soon".
 */
export function featuredEpisode(catalog) {
  const published = latestPublished(catalog);
  if (published) return published;
  return inSeriesOrder(catalog)[0] ?? null;
}
