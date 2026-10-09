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


// Guarded storage access: { ok, value } on read, true/false on write.
function readJson(backend, key) {
  try {
    const raw = backend?.getItem(key);
    return { ok: true, value: raw == null ? null : JSON.parse(raw) };
  } catch (error) {
    console.warn(`${key} could not be read.`, error);
    return { ok: false, value: null };
  }
}

function writeJson(backend, key, value) {
  if (!backend) return false;
  try {
    backend.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`${key} could not be saved.`, error);
    return false;
  }
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
    // progress record (which is kept untouched, read-only). Each record is
    // read separately, so a corrupt learning record never costs saved cards.
    loadCollection(now) {
      const stored = readJson(backend, COLLECTION_KEY);
      if (stored.ok && stored.value !== null) {
        const learning = readJson(backend, LEARNING_KEY);
        const isRecord = learning.ok && learning.value && typeof learning.value === "object" && !Array.isArray(learning.value);
        return { collection: normalizeCollection(stored.value), learning: isRecord ? learning.value : {} };
      }
      const migrated = migrateProgress(this.load(), now);
      const existing = readJson(backend, LEARNING_KEY);
      const kept = existing.ok && existing.value && typeof existing.value === "object" && !Array.isArray(existing.value) ? existing.value : {};
      const learning = { ...migrated.learning, ...kept }; // never overwrite learning another tab wrote
      writeJson(backend, COLLECTION_KEY, migrated.collection);
      writeJson(backend, LEARNING_KEY, learning);
      return { collection: migrated.collection, learning };
    },
    // Changes are applied to the LATEST stored collection (not a snapshot
    // this tab loaded earlier), so saves from other tabs are never lost.
    // Returns { collection, persisted }: persisted is false when the browser
    // refused the write (private mode, quota, no storage).
    updateCollection(operation, now) {
      const next = operation(this.loadCollection(now).collection);
      return { collection: next, persisted: writeJson(backend, COLLECTION_KEY, next) };
    },
    updateLearning(operation) {
      const current = readJson(backend, LEARNING_KEY);
      const base = current.ok && current.value && typeof current.value === "object" && !Array.isArray(current.value) ? current.value : {};
      const next = operation(base);
      return { learning: next, persisted: writeJson(backend, LEARNING_KEY, next) };
    },
    // Replaces the collection wholesale (backup restore only).
    replaceCollection(collection) {
      return writeJson(backend, COLLECTION_KEY, collection);
    },
    replaceLearning(learning) {
      return writeJson(backend, LEARNING_KEY, learning);
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
