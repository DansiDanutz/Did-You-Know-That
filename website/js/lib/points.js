// Card points and leaderboard input validation. Shared by the browser and the
// /api functions, so the server recomputes every score itself (clamped sparks,
// known rarities, bounded streak slots) instead of trusting points from the client.

import { maxSparks, RARITY_RANK } from "./scoring.js";

export const POINTS = Object.freeze({ silver: 100, gold: 200, legendary: 400, perSpark: 10 });
const ADULT_MULTIPLIER = 2;
// Legacy records carry a 0-4 "slot" (order of the day's videos). It is kept
// only for old backups and never changes points: nothing rewards watching.
const MAX_SLOT = 4;

const clampSlot = (slot) => Math.min(MAX_SLOT, Math.max(0, Math.floor(Number(slot) || 0)));
const NICK_MIN = 3;
const NICK_MAX = 16;
const NICK_PATTERN = /^[\p{L}\p{N} _-]+$/u;
// Small, deliberate blocklist; extend as moderation needs grow.
export const BLOCKED_WORDS = ["fuck", "shit", "bitch", "cunt", "nigger", "faggot", "whore", "slut", "dick", "pussy", "nazi", "hitler", "porn", "sex", "pula", "pizda", "muie"];

export function cardPoints(card, audience) {
  if (!RARITY_RANK[card?.rarity]) return 0;
  const sparks = Math.max(0, Math.floor(Number(card.sparks) || 0));
  const base = POINTS[card.rarity] + sparks * POINTS.perSpark;
  if (audience !== "adults") return base;
  return base * ADULT_MULTIPLIER;
}

export function totalPoints(cards, audience) {
  return Object.values(cards ?? {}).reduce((sum, card) => sum + cardPoints(card, audience), 0);
}

// { cardId: maxSparks } for every playable episode.
export function cardCatalog(stories) {
  const sparksOf = (pages) => (Array.isArray(pages) ? maxSparks(pages) : Math.max(...Object.values(pages).map(maxSparks)));
  return Object.fromEntries(stories.filter((s) => !s.comingSoon).map((s) => [s.card.id, sparksOf(s.pages)]));
}

export function sanitizeCards(raw, catalog) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([id]) => Object.hasOwn(catalog, id))
      .map(([id, card]) => {
        const max = catalog[id];
        const sparks = Math.min(max, Math.max(0, Math.floor(Number(card?.sparks) || 0)));
        // Rarity comes from the daily watch ladder, so the client reports it;
        // the server only accepts known values and clamps everything.
        const rarity = RARITY_RANK[card?.rarity] ? card.rarity : "silver";
        return [id, { sparks, rarity, slot: clampSlot(card?.slot) }];
      }),
  );
}

export function validateNickname(input) {
  const value = String(input ?? "").trim().replace(/\s+/g, " ");
  if (value.length < NICK_MIN || value.length > NICK_MAX) return { ok: false, value };
  if (!NICK_PATTERN.test(value)) return { ok: false, value };
  const squashed = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (BLOCKED_WORDS.some((word) => squashed.includes(word))) return { ok: false, value };
  return { ok: true, value };
}
