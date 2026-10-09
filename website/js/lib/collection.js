// The player's saved cards and private learning record (docs/DATA-CONTRACT.md).
// Cards are saved freely: no playback, quiz or magic word is ever required.
// Pure and immutable; storage and UI live elsewhere.

import { normalizeExplorer } from "./progression.js";

const AUDIENCES = ["kids", "adults"];
const BACKUP_APP = "dexty";
const BACKUP_VERSION = 1;
export const MAX_BACKUP_CHARS = 256 * 1024;

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isIsoDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(value);

export const emptyCollection = () => ({ saved: { kids: {}, adults: {} }, coins: [] });

export function normalizeCollection(value) {
  if (!isRecord(value)) return emptyCollection();
  const saved = Object.fromEntries(
    AUDIENCES.map((audience) => {
      const cards = isRecord(value.saved?.[audience]) ? value.saved[audience] : {};
      const valid = Object.entries(cards).filter(([, card]) => isRecord(card) && isIsoDate(card.savedAt));
      return [audience, Object.fromEntries(valid)];
    }),
  );
  const coins = Array.isArray(value.coins) ? value.coins.filter((coin) => typeof coin === "string") : [];
  return { saved, coins };
}

export const isSaved = (collection, audience, cardId) => Boolean(collection.saved[audience]?.[cardId]);

export function saveCard(collection, audience, cardId, at) {
  if (isSaved(collection, audience, cardId)) return collection;
  const cards = { ...collection.saved[audience], [cardId]: { savedAt: at } };
  return { ...collection, saved: { ...collection.saved, [audience]: cards } };
}

export const withCoin = (collection, coinId) =>
  collection.coins.includes(coinId) ? collection : { ...collection, coins: [...collection.coins, coinId] };

// Old progress (dykt-progress-v1): every earned card becomes a saved card; its
// rarity/sparks stay as a "first season" badge, never as proof of knowledge.
export function migrateProgress(progress, now) {
  const collection = emptyCollection();
  const saved = Object.fromEntries(
    AUDIENCES.map((audience) => {
      const cards = isRecord(progress?.cards?.[audience]) ? progress.cards[audience] : {};
      const entries = Object.entries(cards).map(([cardId, card]) => {
        const savedAt = Number.isFinite(card?.firstUnlockedAt) ? new Date(card.firstUnlockedAt).toISOString() : now;
        return [cardId, { savedAt, firstSeason: { rarity: card?.rarity ?? "silver", sparks: card?.sparks ?? 0 } }];
      });
      return [audience, Object.fromEntries(entries)];
    }),
  );
  const coins = Array.isArray(progress?.coins) ? progress.coins.filter((coin) => typeof coin === "string") : [];
  const learning = Object.fromEntries(
    Object.keys(isRecord(progress?.gates) ? progress.gates : {}).map((storyId) => [storyId, { bonusWordAt: now }]),
  );
  return { collection: { ...collection, saved, coins }, learning };
}

export function recordQuiz(learning, key, { answered, correct }, at) {
  return { ...learning, [key]: { ...learning[key], quiz: { answered, correct, at } } };
}

// Story ids whose optional questions were tried in this audience. Only the
// fact of practising is shown, never the number right.
export function practisedStories(learning, audience) {
  const suffix = `:${audience}`;
  return new Set(
    Object.entries(learning ?? {})
      .filter(([key, entry]) => key.endsWith(suffix) && entry?.quiz)
      .map(([key]) => key.slice(0, -suffix.length)),
  );
}

export function recordBonusWord(learning, storyId, at) {
  if (learning[storyId]?.bonusWordAt) return learning;
  return { ...learning, [storyId]: { ...learning[storyId], bonusWordAt: at } };
}

const fold = (text) => String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// `cards`: [{ cardId, title, summary, topic }]
export function searchCards(cards, { query = "", topic = "" } = {}) {
  const needle = fold(query).trim();
  return cards.filter(
    (card) => (!topic || card.topic === topic) && (!needle || fold(`${card.title} ${card.summary}`).includes(needle)),
  );
}

export const makeBackup = ({ collection, learning, settings, explorer }, at) => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  exportedAt: at,
  collection,
  learning,
  settings,
  explorer: explorer ?? null,
});

// Validates a backup file before anything is replaced. Unknown card ids are
// dropped and counted, so a file from another catalog can't inject cards.
export function parseBackup(text, knownCardIds) {
  if (typeof text !== "string" || text.length > MAX_BACKUP_CHARS) return { ok: false, error: "size" };
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "format" };
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP || raw.version !== BACKUP_VERSION) return { ok: false, error: "format" };
  const known = new Set(knownCardIds);
  const normalized = normalizeCollection(raw.collection);
  let dropped = 0;
  const saved = Object.fromEntries(
    AUDIENCES.map((audience) => {
      const entries = Object.entries(normalized.saved[audience]);
      const kept = entries.filter(([cardId]) => known.has(cardId));
      dropped += entries.length - kept.length;
      return [audience, Object.fromEntries(kept)];
    }),
  );
  const learning = isRecord(raw.learning) ? raw.learning : {};
  const settings = isRecord(raw.settings) ? raw.settings : null;
  // Older backups have no explorer: they restore to an empty explorer.
  return { ok: true, dropped, data: { collection: { ...normalized, saved }, learning, settings, explorer: normalizeExplorer(raw.explorer) } };
}

// The card style shown for a saved card: an old first-season card keeps the
// rarity it was earned with; every new card uses the one discovery style.
export const DISCOVERY_STYLE = "gold";

// Saved cards as { [cardId]: { rarity, firstSeason } } for the map, coins and card faces.
export function cardsView(collection, audience) {
  return Object.fromEntries(
    Object.entries(collection.saved[audience] ?? {}).map(([cardId, card]) => [
      cardId,
      { rarity: card.firstSeason?.rarity ?? DISCOVERY_STYLE, firstSeason: Boolean(card.firstSeason) },
    ]),
  );
}
