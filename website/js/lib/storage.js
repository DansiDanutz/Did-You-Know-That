import { cardPoints } from "./points.js";
import { LANGUAGES } from "../i18n/index.js";
import { migrateProgress, normalizeCollection } from "./collection.js";

const STORAGE_KEY = "dykt-progress-v1";
const SETTINGS_KEY = "dykt-settings-v1";
const COLLECTION_KEY = "dexty-collection-v1";
const LEARNING_KEY = "dexty-learning-v1";
const LANG_CODES = LANGUAGES.map(({ code }) => code); // one source: the picker's own list
const AUDIENCE_CODES = ["kids", "adults"];

export function emptySettings(lang = "en") {
  return { lang, audience: "kids", chosen: false };
}

export function normalizeSettings(value, fallbackLang = "en") {
  const base = emptySettings(fallbackLang);
  if (!value || typeof value !== "object") return base;
  return {
    lang: LANG_CODES.includes(value.lang) ? value.lang : base.lang,
    audience: AUDIENCE_CODES.includes(value.audience) ? value.audience : base.audience,
    chosen: value.chosen === true,
  };
}

export const AUDIENCE_KEYS = Object.freeze(["kids", "adults"]);
const PROFILE_KEY = "dykt-profile-v1";
const PLAYER_ID_PATTERN = /^[0-9a-f-]{36}$/;

export function emptyProgress() {
  return { cards: { kids: {}, adults: {} }, gates: {}, coins: [] };
}

export function cardsFor(progress, audience) {
  return progress.cards[audience] ?? {};
}

// Keeps the best-scoring result a player ever earned per audience.
export function withCard(progress, audience, cardId, { rarity, sparks, slot = 0 }, now) {
  const collection = cardsFor(progress, audience);
  const existing = collection[cardId];
  const candidate = { rarity, sparks, slot };
  if (existing && cardPoints(existing, audience) >= cardPoints(candidate, audience)) return progress;
  const card = { ...candidate, firstUnlockedAt: existing?.firstUnlockedAt ?? now };
  return { ...progress, cards: { ...progress.cards, [audience]: { ...collection, [cardId]: card } } };
}

export function withGateUnlocked(progress, storyId) {
  return { ...progress, gates: { ...progress.gates, [storyId]: true } };
}

const isRecord = (value) => value && typeof value === "object" && !Array.isArray(value);

// Accepts the current shape and migrates v1 (flat cards map) into "kids".
export function normalizeProgress(value) {
  if (!isRecord(value) || !isRecord(value.cards)) return emptyProgress();
  const gates = isRecord(value.gates) ? value.gates : {};
  const coins = Array.isArray(value.coins) ? value.coins.filter((c) => typeof c === "string") : [];
  const isNested = AUDIENCE_KEYS.some((key) => isRecord(value.cards[key]));
  if (isNested) {
    return { cards: { kids: value.cards.kids ?? {}, adults: value.cards.adults ?? {} }, gates, coins };
  }
  const kids = Object.fromEntries(
    Object.entries(value.cards).map(([id, card]) => [id, { sparks: 0, ...card }]),
  );
  return { cards: { kids, adults: {} }, gates, coins };
}

export function normalizeProfile(value, makeId) {
  const playerId = PLAYER_ID_PATTERN.test(value?.playerId ?? "") ? value.playerId : makeId();
  const nickname = typeof value?.nickname === "string" && /^[\p{L}\p{N} _-]{3,16}$/u.test(value.nickname) ? value.nickname : "";
  return { playerId, nickname };
}


// Browser storage can be missing or throw (private mode, blocked cookies),
// so every access is guarded and the game still works for the session.
export function createStore(backend) {
  return {
    load() {
      try {
        return normalizeProgress(JSON.parse(backend?.getItem(STORAGE_KEY) ?? "null"));
      } catch (error) {
        console.warn("Progress could not be loaded; starting fresh.", error);
        return emptyProgress();
      }
    },
    save(progress) {
      try {
        backend?.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (error) {
        console.warn("Progress could not be saved.", error);
      }
    },
    // Saved cards + private learning. The first load migrates the old
    // progress record (which is kept untouched, read-only).
    loadCollection(now) {
      try {
        const stored = backend?.getItem(COLLECTION_KEY);
        if (stored) {
          const learning = JSON.parse(backend.getItem(LEARNING_KEY) ?? "{}");
          return { collection: normalizeCollection(JSON.parse(stored)), learning: learning && typeof learning === "object" ? learning : {} };
        }
        const migrated = migrateProgress(this.load(), now);
        backend?.setItem(COLLECTION_KEY, JSON.stringify(migrated.collection));
        backend?.setItem(LEARNING_KEY, JSON.stringify(migrated.learning));
        return migrated;
      } catch (error) {
        console.warn("Collection could not be loaded; starting fresh.", error);
        return { collection: normalizeCollection(null), learning: {} };
      }
    },
    saveCollection(collection) {
      try {
        backend?.setItem(COLLECTION_KEY, JSON.stringify(collection));
      } catch (error) {
        console.warn("Collection could not be saved.", error);
      }
    },
    saveLearning(learning) {
      try {
        backend?.setItem(LEARNING_KEY, JSON.stringify(learning));
      } catch (error) {
        console.warn("Learning record could not be saved.", error);
      }
    },
    loadProfile(makeId) {
      try {
        return normalizeProfile(JSON.parse(backend?.getItem(PROFILE_KEY) ?? "null"), makeId);
      } catch (error) {
        console.warn("Profile could not be loaded.", error);
        return normalizeProfile(null, makeId);
      }
    },
    saveProfile(profile) {
      try {
        backend?.setItem(PROFILE_KEY, JSON.stringify(profile));
      } catch (error) {
        console.warn("Profile could not be saved.", error);
      }
    },
    loadSettings(fallbackLang) {
      try {
        return normalizeSettings(JSON.parse(backend?.getItem(SETTINGS_KEY) ?? "null"), fallbackLang);
      } catch (error) {
        console.warn("Settings could not be loaded.", error);
        return emptySettings(fallbackLang);
      }
    },
    saveSettings(settings) {
      try {
        backend?.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.warn("Settings could not be saved.", error);
      }
    },
  };
}
