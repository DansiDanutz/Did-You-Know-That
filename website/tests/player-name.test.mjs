// Dexter calls the child by their (optional) name. The name stays on this
// device: it is never sent anywhere or put in a shared link.
import { test } from "node:test";
import assert from "node:assert/strict";

import { cleanName, personalize } from "../js/lib/player-name.js";
import { normalizeSettings } from "../js/lib/storage.js";

test("names are trimmed, short, and letters only (any alphabet)", () => {
  assert.equal(cleanName("  maria  "), "Maria");
  assert.equal(cleanName("Ana-Maria"), "Ana-Maria");
  assert.equal(cleanName("O'Neil"), "O'Neil");
  assert.equal(cleanName("小明"), "小明");
  assert.equal(cleanName("Zoë"), "Zoë");
  assert.equal(cleanName("a".repeat(40)).length, 20, "capped at 20 characters");
  assert.equal(cleanName("<script>"), "Script", "markup characters are dropped");
  assert.equal(cleanName("http://x.com"), "Httpxcom");
  assert.equal(cleanName("   "), "");
  assert.equal(cleanName(null), "");
});

test("rude words are refused", () => {
  assert.equal(cleanName("fuck"), "");
});

test("the greeting uses the name in place of the word for explorer", () => {
  const words = "explorer";
  assert.equal(personalize("Hi, explorer! I'm Dexter.", "Maria", { words, hello: "Hi, {name}!" }), "Hi, Maria! I'm Dexter.");
  assert.equal(personalize("You're back! Ready?", "Maria", { words, hello: "Hi, {name}!" }), "Hi, Maria! You're back! Ready?", "no explorer word → friendly prefix");
  assert.equal(personalize("Hi, explorer!", "", { words, hello: "Hi, {name}!" }), "Hi, explorer!", "no name → unchanged");
  assert.equal(personalize("Salut, exploratorule! Eu sunt Dexter.", "Ioana", { words: "exploratorule", hello: "Bună, {name}!" }), "Salut, Ioana! Eu sunt Dexter.");
  assert.equal(personalize("Yay, my favourite explorer is here!", "Maria", { words, hello: "Hi, {name}!" }), "Hi, Maria! Yay, my favourite explorer is here!", "only replaced when addressing the child");
  assert.equal(personalize("你好，小探险家！我是德克斯特", "小明", { words: "小探险家", hello: "你好，{name}！" }), "你好，小明！我是德克斯特");
  assert.equal(personalize("你回来啦！", "小明", { words: "小探险家", hello: "你好，{name}！" }), "你好，小明！你回来啦！", "no space after full-width punctuation");
});

test("settings keep a valid name and drop anything else", () => {
  assert.equal(normalizeSettings({ lang: "en", audience: "kids", chosen: true, name: " maria " }).name, "Maria");
  assert.equal(normalizeSettings({ lang: "en", audience: "kids", chosen: true, name: 42 }).name, "");
  assert.equal(normalizeSettings({ lang: "en", audience: "kids", chosen: true }).name, "");
});
