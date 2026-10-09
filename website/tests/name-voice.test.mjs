// Dexter says the child's name out loud from pre-recorded generic clips
// ("Hi, Maria!") — the child's name itself is never sent anywhere.
import { test } from "node:test";
import assert from "node:assert/strict";

import { nameKey, nameFile, greetingClips, greetingBody } from "../js/lib/name-voice.js";

test("typed names match recordings regardless of case and accents", () => {
  assert.equal(nameKey("Zoë"), nameKey("zoe"));
  assert.equal(nameKey("  SIENNA "), "sienna");
  assert.equal(nameKey("Ana-Maria"), "ana-maria");
  assert.equal(nameKey("一诺"), "一诺");
  assert.equal(nameKey(""), "");
});

test("with a recorded name: the name clip, then the greeting body", () => {
  const voiced = { en: new Map([["sienna", "n007.mp3"]]) };
  assert.deepEqual(greetingClips({ lang: "en", key: "welcome", name: "Sienna", voiced, hasBody: () => true }), [
    "assets/voice/daxter/names/en/n007.mp3",
    "assets/voice/daxter/en/welcome-body.mp3",
  ]);
  assert.deepEqual(greetingClips({ lang: "en", key: "back1", name: "Sienna", voiced, hasBody: () => false }), [
    "assets/voice/daxter/names/en/n007.mp3",
    "assets/voice/daxter/en/back1.mp3",
  ], "greetings without a vocative keep their full recording after the name");
});

test("without a recorded name (or no name): the original greeting", () => {
  const voiced = { en: new Map([["sienna", "n007.mp3"]]) };
  assert.deepEqual(greetingClips({ lang: "en", key: "welcome", name: "Xyzzy", voiced, hasBody: () => true }), ["assets/voice/daxter/en/welcome.mp3"]);
  assert.deepEqual(greetingClips({ lang: "en", key: "welcome", name: "", voiced, hasBody: () => true }), ["assets/voice/daxter/en/welcome.mp3"]);
});

test("the greeting body drops only the opening salutation that addresses the child", () => {
  assert.equal(greetingBody("Hi, explorer! I'm Dexter, the brightest lightbulb!", "explorer"), "I'm Dexter, the brightest lightbulb!");
  assert.equal(greetingBody("You're back! I was hoping you'd come!", "explorer"), null, "no vocative → no body needed");
  assert.equal(greetingBody("你好，小探险家！我是德克斯特。", "小探险家"), "我是德克斯特。");
  assert.equal(greetingBody("Salut, exploratorule! Eu sunt Dexter.", "exploratorule"), "Eu sunt Dexter.");
});

test("clip file names are stable, ASCII and different per name", () => {
  assert.equal(nameFile("sienna"), nameFile("sienna"));
  assert.notEqual(nameFile("sienna"), nameFile("maria"));
  assert.match(nameFile("一诺"), /^n-[0-9a-f]{8}\.mp3$/);
});
