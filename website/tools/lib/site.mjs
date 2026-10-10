// Channel facts used by every generated page. Change them here, then run `npm run build:site`.

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

export const episodeNumber = (episode) => String(episode.number).padStart(2, "0");
export const episodePath = (episode) => `/episodes/${episode.slug}/`;
export const subjectPath = (slug) => `/subject/${slug}/`;
export const watchUrl = (episode) => `https://www.youtube.com/watch?v=${episode.youtubeId}`;
export const embedUrl = (episode) => `https://www.youtube-nocookie.com/embed/${episode.youtubeId}`;
export const isPublished = (episode) => episode.status === "published" && Boolean(episode.youtubeId);
export const absolute = (path) => new URL(path, SITE.url).href;

/** Episodes newest-number first are shown last; the newest published episode hosts the comment links. */
export function latestPublished(catalog) {
  return [...catalog.episodes].filter(isPublished).sort((a, b) => b.number - a.number)[0] ?? null;
}

/** Where a "comment on YouTube" button should go: the newest published video, else the channel. */
export const commentUrl = (catalog) => {
  const latest = latestPublished(catalog);
  return latest ? watchUrl(latest) : CHANNEL_URL;
};

/** A local thumbnail "/assets/x/thumb.png" ships with "thumb.webp" (1280 wide) and "thumb-640.webp". */
export function thumbnailSources(thumbnail) {
  const base = thumbnail.replace(/\.(png|jpg)$/, "");
  return { fallback: thumbnail, webp: `${base}.webp`, webpSmall: `${base}-640.webp` };
}
export const isLocalAsset = (path) => typeof path === "string" && path.startsWith("/assets/");
