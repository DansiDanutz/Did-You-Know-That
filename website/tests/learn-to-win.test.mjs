// Cards are won by learning (reading the book and answering the guardian),
// never by watching: YouTube API policy forbids rewarding people for views.
import { test } from "node:test";
import assert from "node:assert/strict";

import { STORIES } from "../js/data/stories.js";
import { LOCALES } from "../js/i18n/index.js";
import { isFaceComplete } from "../js/ui/pages.js";

const flatten = (value) => (typeof value === "string" ? [value] : Object.values(value ?? {}).flatMap(flatten));

test("the magic-word seal is a bonus and never blocks the book", () => {
  assert.equal(isFaceComplete({ type: "gate" }, { gateOpen: false }), true);
});

test("no story measures how much of a video was watched", () => {
  STORIES.forEach((story) => assert.equal(story.requiredWatchRatio, undefined, story.id));
});

test("no language tells players that watching unlocks rewards", () => {
  const forbidden = /only in the video|watched the (full|whole) story|Skipping ahead|every extra video earns/i;
  const english = flatten(LOCALES.en);
  english.forEach((text) => assert.doesNotMatch(text, forbidden, text));
});
