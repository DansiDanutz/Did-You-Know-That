// "Surprise me": a random subject word that leads straight to its video. Only episodes that are
// really out (status "published" with a YouTube id) take part — drafts and requested subjects never do.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export const isWatchable = (episode) => episode?.status === "published" && YOUTUBE_ID.test(episode.youtubeId ?? "");

/** Every word (subject + keywords) of every watchable episode, each pointing at its episode. */
export function surpriseWords(catalog) {
  return (catalog?.episodes ?? []).filter(isWatchable).flatMap((episode) => {
    const seen = new Set();
    const words = [episode.subject, ...(episode.keywords ?? [])]
      .map((word) => String(word).trim())
      .filter((word) => word && !seen.has(word.toLowerCase()) && seen.add(word.toLowerCase()));
    return words.map((word) => ({ word, slug: episode.slug, title: episode.title, url: `/episodes/${episode.slug}/#player` }));
  });
}

/** A random entry, never the same word twice in a row when there is a choice; null when empty. */
export function pickWord(words, { random = Math.random, previous = null } = {}) {
  if (!words.length) return null;
  const pool = words.length > 1 && previous ? words.filter((entry) => entry.word !== previous) : words;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
