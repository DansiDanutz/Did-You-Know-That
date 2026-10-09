import { test } from "node:test";
import assert from "node:assert/strict";

import { greetingKey, greetingAudioPath, BACK_LINES } from "../js/lib/greeting.js";
import { LOCALES } from "../js/i18n/index.js";

test("first launch gets the welcome, later launches rotate the welcome-back lines", () => {
  assert.equal(greetingKey(0), "welcome");
  assert.equal(greetingKey(undefined), "welcome");
  assert.deepEqual([1, 2, 3, 4].map(greetingKey), ["back1", "back2", "back3", "back1"]);
});

test("every language has every greeting line", () => {
  const keys = ["welcome", ...Array.from({ length: BACK_LINES }, (_, i) => `back${i + 1}`)];
  Object.entries(LOCALES).forEach(([lang, locale]) => keys.forEach((k) => assert.ok(locale.ui[`daxter.${k}`], `${lang} daxter.${k}`)));
});

test("greeting audio lives per language", () => {
  assert.equal(greetingAudioPath("ro", "back2"), "assets/voice/daxter/ro/back2.mp3");
});
