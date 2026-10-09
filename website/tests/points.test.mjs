import { test } from "node:test";
import assert from "node:assert/strict";

import { cardPoints, totalPoints, sanitizeCards, cardCatalog, validateNickname, POINTS } from "../js/lib/points.js";
import { STORIES } from "../js/data/stories.js";
import {
  emptyProgress,
  withCard,
  cardsFor,
  normalizeProgress,
  normalizeProfile,
} from "../js/lib/storage.js";

const catalog = cardCatalog(STORIES);
const honey = STORIES.find((s) => s.id === "eternal-honey").card.id;

test("cardPoints = rarity base + sparks bonus, doubled for adults", () => {
  assert.equal(cardPoints({ rarity: "silver", sparks: 2 }, "kids"), POINTS.silver + 2 * POINTS.perSpark);
  assert.equal(cardPoints({ rarity: "legendary", sparks: 8 }, "adults"), (POINTS.legendary + 8 * POINTS.perSpark) * 2);
  assert.equal(cardPoints({ rarity: "bogus", sparks: 3 }, "kids"), 0);
});

test("watching more videos never changes points (legacy slot is ignored)", () => {
  const base = { rarity: "gold", sparks: 0 };
  for (const slot of [0, 2, 4, 99]) assert.equal(cardPoints({ ...base, slot }, "adults"), 400, `slot ${slot}`);
  assert.equal(cardPoints({ ...base, slot: 4 }, "kids"), 200);
});

test("totalPoints sums a collection", () => {
  const cards = { a: { rarity: "silver", sparks: 0 }, b: { rarity: "gold", sparks: 1 } };
  assert.equal(totalPoints(cards, "kids"), POINTS.silver + POINTS.gold + POINTS.perSpark);
});

test("cardCatalog lists only playable episodes with their max sparks", () => {
  assert.deepEqual(Object.keys(catalog), STORIES.filter((s) => !s.comingSoon).map((s) => s.card.id));
  assert.equal(catalog[honey], 8);
  assert.ok(!Object.keys(catalog).includes("card-002-three-hearts"), "coming-soon cards excluded");
});

test("sanitizeCards drops unknown cards and clamps sparks, rarity and slot", () => {
  const clean = sanitizeCards({ [honey]: { sparks: 999, rarity: "gold", slot: 7.9 }, "card-999-fake": { sparks: 5 } }, catalog);
  assert.deepEqual(Object.keys(clean), [honey]);
  assert.deepEqual(clean[honey], { sparks: 8, rarity: "gold", slot: 4 });
  assert.deepEqual(sanitizeCards("nonsense", catalog), {});
  const weird = sanitizeCards({ [honey]: { sparks: -4, rarity: "mythic", slot: -2 } }, catalog)[honey];
  assert.deepEqual(weird, { sparks: 0, rarity: "silver", slot: 0 }, "unknown rarity falls back to silver");
});

test("validateNickname enforces length, characters and a blocklist", () => {
  assert.equal(validateNickname("  Curious_Cat 7 ").ok, true);
  assert.equal(validateNickname("  Curious_Cat 7 ").value, "Curious_Cat 7");
  assert.equal(validateNickname("ab").ok, false);
  assert.equal(validateNickname("x".repeat(17)).ok, false);
  assert.equal(validateNickname("<script>").ok, false);
  assert.equal(validateNickname("Ştefan_Ñoño").ok, true, "letters with diacritics are allowed");
  assert.equal(validateNickname("fuckface").ok, false);
  assert.equal(validateNickname(undefined).ok, false);
});

test("withCard keeps the best-scoring result per audience and never mutates", () => {
  const a = withCard(emptyProgress(), "kids", honey, { rarity: "gold", sparks: 6 }, 100);
  const b = withCard(a, "kids", honey, { rarity: "silver", sparks: 2 }, 200);
  const c = withCard(b, "adults", honey, { rarity: "silver", sparks: 1 }, 300);
  assert.equal(b.cards.kids[honey].sparks, 6, "worse result ignored");
  assert.equal(c.cards.adults[honey].sparks, 1, "adults tracked separately");
  assert.equal(a.cards.adults[honey], undefined);
  assert.equal(c.cards.kids[honey].firstUnlockedAt, 100);
});

test("cardsFor returns one audience's collection", () => {
  const p = withCard(emptyProgress(), "adults", honey, { rarity: "gold", sparks: 6 }, 1);
  assert.deepEqual(Object.keys(cardsFor(p, "adults")), [honey]);
  assert.deepEqual(cardsFor(p, "kids"), {});
});

test("normalizeProgress migrates the old flat card shape into the kids collection", () => {
  const old = { cards: { [honey]: { rarity: "gold", firstUnlockedAt: 5 } }, gates: { "eternal-honey": true } };
  const migrated = normalizeProgress(old);
  assert.equal(migrated.cards.kids[honey].rarity, "gold");
  assert.equal(migrated.cards.kids[honey].sparks, 0);
  assert.deepEqual(migrated.cards.adults, {});
  assert.equal(migrated.gates["eternal-honey"], true);
  assert.deepEqual(normalizeProgress(null), emptyProgress());
});

test("normalizeProfile keeps a valid id and nickname, otherwise creates a fresh id", () => {
  const ok = normalizeProfile({ playerId: "6f1c2a9e-1b2c-4d5e-8f90-123456789abc", nickname: "Max" }, () => "new-id");
  assert.equal(ok.playerId, "6f1c2a9e-1b2c-4d5e-8f90-123456789abc");
  assert.equal(ok.nickname, "Max");
  const fresh = normalizeProfile({ playerId: "../../etc", nickname: "<b>" }, () => "new-id");
  assert.deepEqual(fresh, { playerId: "new-id", nickname: "" });
});

test("cardCatalog uses the larger spark total when audiences have different pages", () => {
  const stories = [{ card: { id: "c" }, pages: { kids: [{ type: "quiz" }], adults: [{ type: "quiz" }, { type: "story", spark: "s" }] } }];
  assert.equal(cardCatalog(stories).c, 3);
});
