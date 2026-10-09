import { test } from "node:test";
import assert from "node:assert/strict";

import { narrationFor, narrationPath, allNarrationItems } from "../js/lib/narration.js";
import { createTranslator, LOCALES } from "../js/i18n/index.js";
import { localizeStory } from "../js/lib/localize.js";
import { STORIES } from "../js/data/stories.js";

const t = createTranslator("en");
const ep1 = localizeStory(STORIES[0], LOCALES.en, LOCALES.en, "kids");
const page = (id) => ep1.pages.find((p) => p.id === id);
const sealed = { gateOpen: false };
const open = { gateOpen: true };

test("story pages are read without spark markers or HTML", () => {
  const { key, text } = narrationFor(page("start"), ep1, sealed, t);
  assert.equal(key, "start");
  assert.match(text, /Press Start!/);
  assert.doesNotMatch(text, /\[\[|\]\]|<|>/);
  assert.match(text, /from scrolling\?/);
});

test("the mission page reads every item in order", () => {
  const { text } = narrationFor(page("mission"), ep1, sealed, t);
  ep1.mission.forEach((item) => assert.ok(text.includes(item)));
});

test("gate and quiz narration depend on whether the seal is broken", () => {
  assert.equal(narrationFor(page("seal"), ep1, sealed, t).key, "seal");
  assert.equal(narrationFor(page("seal"), ep1, open, t).key, "seal~open");
  const sleeping = narrationFor(page("q1"), ep1, sealed, t);
  assert.equal(sleeping.key, "quiz~sleep");
  assert.doesNotMatch(sleeping.text, /5 hours/, "never reads quiz answers before the seal breaks");
  const awake = narrationFor(page("q1"), ep1, open, t);
  assert.equal(awake.key, "q1");
  assert.match(awake.text, /A: .*B: .*C: /s);
});

test("cover, inside and end pages are narrated; blank pages are silent", () => {
  assert.match(narrationFor({ type: "cover" }, ep1, sealed, t).text, /Scroll Monster/);
  assert.match(narrationFor({ type: "inside" }, ep1, sealed, t).text, /How to win this card/);
  assert.match(narrationFor(page("end"), ep1, sealed, t).text, /The End/);
  assert.equal(narrationFor({ type: "blank" }, ep1, sealed, t).text, "");
});

test("narrationPath builds a safe, predictable file path", () => {
  assert.equal(
    narrationPath({ lang: "ro", audience: "kids", storyId: "why-wonder", voice: "female", key: "seal~open" }),
    "assets/narration/ro/kids/why-wonder/female/seal~open.mp3",
  );
});

test("allNarrationItems enumerates every page state once, for generation", () => {
  const items = allNarrationItems(ep1, t);
  const keys = items.map((i) => i.key);
  assert.equal(new Set(keys).size, keys.length, "no duplicates");
  ["cover", "inside", "opening", "start", "tower", "videoland", "boss", "deal", "finale", "mission", "seal", "seal~open", "quiz~sleep", "q1", "q2", "q3", "end"].forEach((k) =>
    assert.ok(keys.includes(k), k),
  );
  assert.ok(items.every((i) => i.text.length > 0));
});
