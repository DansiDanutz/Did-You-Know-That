import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DAILY_VIDEOS,
  RARITY_LADDER,
  emptyDays,
  todayKey,
  canWatch,
  registerVideo,
  videosLeft,
  rarityForSlot,
} from "../js/lib/daily-limit.js";
import { localizeStory } from "../js/lib/localize.js";
import { STORIES } from "../js/data/stories.js";
import { LOCALES } from "../js/i18n/index.js";

const DAY = "2026-10-09";

test("todayKey formats a local calendar date", () => {
  assert.equal(todayKey(new Date(2026, 9, 9, 23, 59)), DAY);
});

test("kids get 3 videos a day, adults 5", () => {
  assert.equal(DAILY_VIDEOS.kids, 3);
  assert.equal(DAILY_VIDEOS.adults, 5);
  assert.equal(videosLeft(emptyDays(), DAY, "kids"), 3);
  assert.equal(videosLeft(emptyDays(), DAY, "adults"), 5);
});

test("the ladder goes silver → gold → legendary, ending on legendary", () => {
  assert.deepEqual(RARITY_LADDER.kids, ["silver", "gold", "legendary"]);
  assert.equal(RARITY_LADDER.adults.length, DAILY_VIDEOS.adults);
  assert.equal(RARITY_LADDER.adults[0], "silver");
  assert.equal(RARITY_LADDER.adults.at(-1), "legendary");
});

test("each new video today takes the next rung; re-watching keeps its rung and is free", () => {
  let days = emptyDays();
  assert.equal(rarityForSlot(days, DAY, "a", "kids"), "silver");
  days = registerVideo(days, DAY, "a", "kids");
  days = registerVideo(days, DAY, "b", "kids");
  assert.equal(rarityForSlot(days, DAY, "a", "kids"), "silver");
  assert.equal(rarityForSlot(days, DAY, "b", "kids"), "gold");
  assert.equal(rarityForSlot(days, DAY, "c", "kids"), "legendary");
  const again = registerVideo(days, DAY, "a", "kids");
  assert.equal(again, days, "re-registering the same story is a no-op");
  assert.equal(videosLeft(days, DAY, "kids"), 1);
});

test("the daily limit blocks new stories but never ones already watched today", () => {
  let days = emptyDays();
  ["a", "b", "c"].forEach((id) => (days = registerVideo(days, DAY, id, "kids")));
  assert.equal(canWatch(days, DAY, "d", "kids"), false);
  assert.equal(canWatch(days, DAY, "b", "kids"), true);
  assert.equal(registerVideo(days, DAY, "d", "kids"), days, "over the limit nothing is added");
  assert.equal(videosLeft(days, DAY, "kids"), 0);
});

test("audiences are tracked separately and a new day resets", () => {
  let days = registerVideo(emptyDays(), DAY, "a", "kids");
  assert.equal(videosLeft(days, DAY, "adults"), 5);
  assert.equal(videosLeft(days, "2026-10-10", "kids"), 3);
  days = registerVideo(days, "2026-10-10", "z", "kids");
  assert.deepEqual(days.kids, { day: "2026-10-10", stories: ["z"] });
});

test("registerVideo never mutates and invalid stored data is treated as empty", () => {
  const start = emptyDays();
  registerVideo(start, DAY, "a", "kids");
  assert.deepEqual(start, emptyDays());
  assert.equal(videosLeft(null, DAY, "kids"), 3);
  assert.equal(videosLeft({ kids: { day: DAY, stories: "lots" } }, DAY, "kids"), 3);
});

test("episode 1 has different art and secret word per audience", () => {
  const ep1 = STORIES.find((s) => s.episode === 1);
  const kids = localizeStory(ep1, LOCALES.en, LOCALES.en, "kids");
  const adults = localizeStory(ep1, LOCALES.en, LOCALES.en, "adults");
  assert.notEqual(kids.secretHash, adults.secretHash);
  assert.equal(typeof kids.secretHash, "string");
  assert.notEqual(kids.card.art, adults.card.art);
  assert.notEqual(kids.pages[0].art, adults.pages[0].art);
  assert.notEqual(kids.title, adults.title);
});

test("card image: custom image wins, then the episode's YouTube thumbnail, else none", () => {
  const base = { id: "x", youtubeId: { kids: "abc123XYZ_-", adults: "" }, secretHash: "h", card: { id: "c", number: "009", art: "jar" }, pages: [] };
  const kids = localizeStory(base, LOCALES.en, LOCALES.en, "kids");
  assert.equal(kids.card.image, "https://i.ytimg.com/vi/abc123XYZ_-/hqdefault.jpg");
  const adults = localizeStory(base, LOCALES.en, LOCALES.en, "adults");
  assert.equal(adults.card.image, undefined);
  const custom = localizeStory({ ...base, card: { ...base.card, image: { kids: "assets/cards/k.jpg", adults: "assets/cards/a.jpg" } } }, LOCALES.en, LOCALES.en, "adults");
  assert.equal(custom.card.image, "assets/cards/a.jpg");
  const unsafe = localizeStory({ ...base, youtubeId: "bad id\"><script>" }, LOCALES.en, LOCALES.en, "kids");
  assert.equal(unsafe.card.image, undefined, "invalid video ids never reach an image URL");
});

test("an episode may have different page lists per audience", () => {
  const base = {
    id: "x", secretHash: "h", card: { id: "c", number: "009", art: "jar" },
    pages: { kids: [{ id: "k1", type: "title", art: "bulb" }], adults: [{ id: "a1", type: "title", art: "coins" }, { id: "a2", type: "title", art: "jar" }] },
  };
  assert.deepEqual(localizeStory(base, LOCALES.en, LOCALES.en, "kids").pages.map((p) => p.id), ["k1"]);
  assert.deepEqual(localizeStory(base, LOCALES.en, LOCALES.en, "adults").pages.map((p) => p.id), ["a1", "a2"]);
});
