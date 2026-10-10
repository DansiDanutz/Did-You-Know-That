// Game progress: guesses, reveals, collected fact cards and the explorer rank.
// Lives only in this browser (localStorage). No accounts, no tracking, no timers.
// Pure functions + a storage wrapper that never throws, so the site works without storage.

export const STORAGE_KEY = "dyk.progress.v1";

export const RANKS = [
  { name: "Curious", min: 0 },
  { name: "Explorer", min: 3 },
  { name: "Time Traveler", min: 9 },
  { name: "Mystery Master", min: 18 },
];

const emptyState = () => ({ guesses: {}, revealed: {} });
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Parses stored JSON defensively; anything unexpected becomes an empty state. */
export function parseState(rawValue) {
  try {
    const data = JSON.parse(rawValue ?? "null");
    if (!isPlainObject(data)) return emptyState();
    const guesses = Object.fromEntries(
      Object.entries(isPlainObject(data.guesses) ? data.guesses : {}).filter(([, v]) => Number.isInteger(v) && v >= 0),
    );
    const revealed = Object.fromEntries(
      Object.entries(isPlainObject(data.revealed) ? data.revealed : {}).filter(([, v]) => v === true),
    );
    return { guesses, revealed };
  } catch {
    return emptyState();
  }
}

export const lockGuess = (state, slug, optionIndex) => ({ ...state, guesses: { ...state.guesses, [slug]: optionIndex } });

/** Revealing needs a locked guess first: guess → watch → check. */
export function revealAnswer(state, slug) {
  if (!(slug in state.guesses)) return state;
  return { ...state, revealed: { ...state.revealed, [slug]: true } };
}

/** Card ids unlocked by revealed answers of published episodes. */
export function unlockedCardIds(state, catalog) {
  return (catalog.episodes ?? [])
    .filter((episode) => episode.status === "published" && state.revealed[episode.slug])
    .flatMap((episode) => episode.facts.map((card) => card.id));
}

export const totalCards = (catalog) => (catalog.episodes ?? []).reduce((sum, e) => sum + e.facts.length, 0);

/** The rank for a number of collected cards, plus the next rank to aim for (or null). */
export function rankFor(count) {
  const index = RANKS.findLastIndex((rank) => count >= rank.min);
  return { ...RANKS[index], next: RANKS[index + 1] ?? null };
}

/** localStorage wrapper: reads and writes never throw; falls back to memory. */
export function createStore(getStorage = () => globalThis.localStorage) {
  let memory = emptyState();
  const storage = () => {
    try {
      return getStorage() ?? null;
    } catch {
      return null;
    }
  };
  return {
    load() {
      try {
        const stored = storage()?.getItem(STORAGE_KEY);
        if (stored !== null && stored !== undefined) memory = parseState(stored);
      } catch {
        // Storage blocked (private mode, disabled cookies): keep the in-memory state.
      }
      return memory;
    },
    save(state) {
      memory = state;
      try {
        storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch {
        return false;
      }
    },
  };
}
