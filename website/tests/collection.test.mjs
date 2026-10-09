import { test } from "node:test";
import assert from "node:assert/strict";

import {
  emptyCollection, migrateProgress, saveCard, isSaved, recordQuiz, recordBonusWord, searchCards,
  makeBackup, parseBackup, normalizeCollection,
} from "../js/lib/collection.js";

const AT = "2026-10-09T12:00:00.000Z";

test("saving a card needs nothing but a tap, keeps the first date and never mutates", () => {
  const empty = emptyCollection();
  const once = saveCard(empty, "kids", "card-ep1-why", AT);
  const twice = saveCard(once, "kids", "card-ep1-why", "2030-01-01T00:00:00.000Z");
  assert.equal(isSaved(once, "kids", "card-ep1-why"), true);
  assert.equal(twice.saved.kids["card-ep1-why"].savedAt, AT);
  assert.deepEqual(empty, emptyCollection());
  assert.equal(isSaved(once, "adults", "card-ep1-why"), false, "audiences are separate");
});

test("old progress migrates without losing anything earned", () => {
  const old = {
    cards: { kids: { "card-ep1-why": { rarity: "legendary", sparks: 9, slot: 2, firstUnlockedAt: 1760000000000 } }, adults: {} },
    gates: { "why-wonder": true },
    coins: ["c1"],
  };
  const { collection, learning } = migrateProgress(old, AT);
  const card = collection.saved.kids["card-ep1-why"];
  assert.equal(card.savedAt, new Date(1760000000000).toISOString());
  assert.deepEqual(card.firstSeason, { rarity: "legendary", sparks: 9 }, "old rarity kept as a first-season badge");
  assert.deepEqual(collection.coins, ["c1"]);
  assert.equal(learning["why-wonder"].bonusWordAt, AT);
});

test("quiz results are private learning feedback, separate from saved cards", () => {
  const learning = recordQuiz({}, "why-wonder:kids", { answered: 3, correct: 2 }, AT);
  assert.deepEqual(learning["why-wonder:kids"].quiz, { answered: 3, correct: 2, at: AT });
  assert.equal(recordBonusWord(learning, "why-wonder", AT)["why-wonder"].bonusWordAt, AT);
});

test("collection search matches title and summary, filters by topic, ignores case and accents", () => {
  const cards = [
    { cardId: "a", title: "Scroll Tamer", summary: "Screen time facts", topic: "digital-life" },
    { cardId: "b", title: "Golden Minute", summary: "Compound learning", topic: "everyday-life" },
    { cardId: "c", title: "Abeja", summary: "Miel eterna", topic: "animals" },
  ];
  assert.deepEqual(searchCards(cards, { query: "scroll" }).map((c) => c.cardId), ["a"]);
  assert.deepEqual(searchCards(cards, { query: "MIEL" }).map((c) => c.cardId), ["c"]);
  assert.deepEqual(searchCards(cards, { topic: "everyday-life" }).map((c) => c.cardId), ["b"]);
  assert.equal(searchCards(cards, {}).length, 3);
});

test("a backup round-trips and import rejects anything malformed or unknown", () => {
  const collection = saveCard(emptyCollection(), "kids", "card-ep1-why", AT);
  const settings = { lang: "ro", audience: "kids", chosen: true };
  const text = JSON.stringify(makeBackup({ collection, learning: {}, settings }, AT));
  const ok = parseBackup(text, ["card-ep1-why"]);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.data.collection.saved.kids, collection.saved.kids);
  assert.equal(ok.data.settings.lang, "ro");

  assert.equal(parseBackup("not json", []).ok, false);
  assert.equal(parseBackup(JSON.stringify({ app: "other" }), []).ok, false);
  const unknown = parseBackup(text, []);
  assert.equal(unknown.ok, true);
  assert.deepEqual(unknown.data.collection.saved.kids, {}, "cards not in the catalog are dropped");
  assert.equal(unknown.dropped, 1);
  assert.equal(parseBackup("x".repeat(300_000), []).ok, false, "oversized files are refused");
});

test("stored collections are normalized defensively", () => {
  assert.deepEqual(normalizeCollection(null), emptyCollection());
  const odd = normalizeCollection({ saved: { kids: { x: { savedAt: "nope" } }, adults: [] }, coins: [1, "c"] });
  assert.deepEqual(odd.saved.adults, {});
  assert.deepEqual(odd.coins, ["c"]);
  assert.equal(odd.saved.kids.x, undefined, "entries without a valid date are dropped");
});

test("the map and coins see saved cards; old cards keep their first-season look", async () => {
  const { cardsView, DISCOVERY_STYLE } = await import("../js/lib/collection.js");
  const { collection } = migrateProgress({ cards: { kids: { old: { rarity: "legendary", sparks: 3 } }, adults: {} } }, AT);
  const both = saveCard(collection, "kids", "new", AT);
  assert.deepEqual(cardsView(both, "kids"), {
    old: { rarity: "legendary", firstSeason: true },
    new: { rarity: DISCOVERY_STYLE, firstSeason: false },
  });
  assert.deepEqual(cardsView(both, "adults"), {});
});

test("the store migrates old progress once and never deletes it", async () => {
  const { createStore } = await import("../js/lib/storage.js");
  const data = new Map([["dykt-progress-v1", JSON.stringify({ cards: { kids: { "card-ep1-why": { rarity: "gold", sparks: 4 } }, adults: {} }, gates: {}, coins: [] })]]);
  const backend = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const store = createStore(backend);
  const first = store.loadCollection(AT);
  assert.equal(first.collection.saved.kids["card-ep1-why"].firstSeason.rarity, "gold");
  assert.ok(data.has("dykt-progress-v1"), "old record kept");
  store.updateCollection((c) => saveCard(c, "kids", "card-001-eternal-honey", AT), AT);
  assert.ok(store.loadCollection(AT).collection.saved.kids["card-001-eternal-honey"], "later loads read the new record");
});

test("practisedStories lists stories whose questions were tried in this audience, without scores", async () => {
  const { practisedStories } = await import("../js/lib/collection.js");
  const learning = {
    "eternal-honey:kids": { quiz: { answered: 3, correct: 1, at: "2026-10-09T10:00:00Z" } },
    "scroll-monster:adults": { quiz: { answered: 4, correct: 4, at: "2026-10-09T10:00:00Z" } },
    "scroll-monster": { bonusWordAt: "2026-10-09T10:00:00Z" },
  };
  assert.deepEqual([...practisedStories(learning, "kids")], ["eternal-honey"]);
  assert.deepEqual([...practisedStories(learning, "adults")], ["scroll-monster"]);
  assert.deepEqual([...practisedStories(null, "kids")], []);
});
