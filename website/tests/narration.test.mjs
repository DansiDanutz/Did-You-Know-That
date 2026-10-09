import { test } from "node:test";
import assert from "node:assert/strict";

import { narrationFor, narrationPath, allNarrationItems } from "../js/lib/narration.js";
import { createTranslator, LOCALES } from "../js/i18n/index.js";
import { localizeStory } from "../js/lib/localize.js";
import { STORIES } from "../js/data/stories.js";

const t = createTranslator("en");
const ep1 = localizeStory(STORIES.find((s) => s.id === "why-wonder"), LOCALES.en, LOCALES.en, "kids");
const page = (id) => ep1.pages.find((p) => p.id === id);
const sealed = {};
const open = {};

test("story pages are read without spark markers or HTML", () => {
  const { key, text } = narrationFor(page("rocket"), ep1, sealed, t);
  assert.equal(key, "rocket");
  assert.match(text, /One Quick Video/);
  assert.doesNotMatch(text, /\[\[|\]\]|<|>/);
  assert.match(text, /isn't finished!/);
});

test("the mission page reads every item in order", () => {
  const { text } = narrationFor(page("mission"), ep1, sealed, t);
  ep1.mission.forEach((item) => assert.ok(text.includes(item)));
});

test("the guardian's questions never wait for the video or the magic word", () => {
  const before = narrationFor(page("q1"), ep1, sealed, t);
  const after = narrationFor(page("q1"), ep1, open, t);
  assert.equal(before.key, "q1");
  assert.deepEqual(before, after);
  assert.match(before.text, /A: .*B: .*C: /s);
});

test("cover, inside and end pages are narrated; blank pages are silent", () => {
  assert.match(narrationFor({ type: "cover" }, ep1, sealed, t).text, /Who Keeps Pressing Play/);
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
  ["cover", "inside", "opening", "rocket", "mystery", "willpower", "hint", "test", "bedtime", "launch", "mission", "q1", "q2", "q3", "end"].forEach((k) =>
    assert.ok(keys.includes(k), k),
  );
  assert.ok(!keys.includes("quiz~sleep"), "the guardian never sleeps");
  assert.ok(items.every((i) => i.text.length > 0));
});

test("a narration fingerprint changes with the words, the voice or the voice settings", async () => {
  const { narrationFingerprint } = await import("../js/lib/narration.js");
  const a = narrationFingerprint("Hello explorer", "male");
  assert.match(a, /^[0-9a-f]{8}$/);
  assert.equal(a, narrationFingerprint("Hello explorer", "male"), "stable");
  assert.notEqual(a, narrationFingerprint("Hello explorer!", "male"));
  assert.notEqual(a, narrationFingerprint("Hello explorer", "female"));
});

test("stale recordings are detected from the manifest", async () => {
  const { narrationFingerprint, isFresh } = await import("../js/lib/narration.js");
  const manifest = { files: ["a.mp3", "b.mp3", "c.mp3"], fingerprints: { "a.mp3": narrationFingerprint("now", "male"), "b.mp3": "00000000" } };
  assert.equal(isFresh(manifest, "a.mp3", "now", "male"), true);
  assert.equal(isFresh(manifest, "b.mp3", "now", "male"), false, "text changed since recording");
  assert.equal(isFresh(manifest, "c.mp3", "now", "male"), true, "legacy files without a fingerprint still play");
  assert.equal(isFresh(manifest, "d.mp3", "now", "male"), false, "missing file");
});
