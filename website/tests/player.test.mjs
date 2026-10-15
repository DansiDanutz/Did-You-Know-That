import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LANGUAGES, DEFAULT_PREFS, STORAGE_KEY, playerSrc, captionTrackFor, normalizePrefs, loadPrefs, savePrefs,
  playerCommand, languageLabel, wantsCaptions, playerSourceFor,
} from "../js/lib/player-prefs.js";
import { renderSite } from "../tools/build-site.mjs";
import { loadCatalog } from "./fixtures.mjs";

const BASE = "https://www.youtube-nocookie.com/embed/a4qHdjL8bok";
const params = (src) => Object.fromEntries(new URL(src).searchParams);

test("English: no forced captions, no caption language, no UI language", () => {
  const src = playerSrc(BASE, { language: "en" });
  assert.equal(new URL(src).origin + new URL(src).pathname, BASE);
  assert.deepEqual(params(src), { autoplay: "1", rel: "0", modestbranding: "1", enablejsapi: "1" });
});

test("another language turns captions on in that language and switches YouTube's menus", () => {
  for (const { code } of LANGUAGES.filter((language) => language.code !== "en")) {
    const p = params(playerSrc(BASE, { language: code }));
    assert.equal(p.cc_load_policy, "1");
    assert.equal(p.cc_lang_pref, code);
    assert.equal(p.hl, code);
  }
});

test("unknown languages fall back to English (no captions)", () => {
  const p = params(playerSrc(BASE, { language: "xx" }));
  assert.equal(p.cc_load_policy, undefined);
  assert.equal(p.hl, undefined);
});

test("mute, origin and start are added only when asked for", () => {
  assert.equal(params(playerSrc(BASE)).mute, undefined);
  const p = params(playerSrc(BASE, { muted: true, origin: "https://dexty.live", start: 42.9 }));
  assert.equal(p.mute, "1");
  assert.equal(p.origin, "https://dexty.live");
  assert.equal(p.start, "42");
  assert.equal(params(playerSrc(BASE, { start: 0 })).start, undefined);
  assert.equal(params(playerSrc(BASE, { autoplay: false })).autoplay, undefined);
});

test("only youtube-nocookie embeds are accepted", () => {
  assert.throws(() => playerSrc("https://www.youtube.com/embed/a4qHdjL8bok"), /youtube-nocookie/);
});

test("caption track: none for English, translated English otherwise, a real track when there is one", () => {
  assert.equal(captionTrackFor("en"), null);
  assert.deepEqual(captionTrackFor("ro"), { languageCode: "en", kind: "asr", translationLanguage: { languageCode: "ro" } });
  assert.deepEqual(captionTrackFor("de", [{ languageCode: "en", kind: "" }]), { languageCode: "en", kind: "", translationLanguage: { languageCode: "de" } });
  assert.deepEqual(captionTrackFor("fr", [{ languageCode: "en" }, { languageCode: "fr" }]), { languageCode: "fr" });
  assert.deepEqual(captionTrackFor("pt", "junk"), { languageCode: "en", kind: "asr", translationLanguage: { languageCode: "pt" } });
});

test("playerSourceFor: a native narration in the chosen language replaces the base embed, without forced captions", () => {
  // Arrange
  const narrations = { ro: "https://www.youtube-nocookie.com/embed/TESTNARR0RO" };
  // Act
  const source = playerSourceFor("ro", BASE, narrations);
  const p = params(playerSrc(source.embed, { language: source.nativeNarration ? "en" : "ro" }));
  // Assert
  assert.deepEqual(source, { embed: narrations.ro, nativeNarration: true });
  assert.equal(new URL(source.embed).pathname, "/embed/TESTNARR0RO");
  assert.deepEqual(p, { autoplay: "1", rel: "0", modestbranding: "1", enablejsapi: "1" }, "no cc_load_policy / cc_lang_pref / hl");
});

test("playerSourceFor: a language without a narration keeps the base embed and its caption behaviour", () => {
  const narrations = { ro: "https://www.youtube-nocookie.com/embed/TESTNARR0RO" };
  const source = playerSourceFor("de", BASE, narrations);
  assert.deepEqual(source, { embed: BASE, nativeNarration: false });
  const p = params(playerSrc(source.embed, { language: "de" }));
  assert.equal(p.cc_load_policy, "1");
  assert.equal(p.cc_lang_pref, "de");
});

test("playerSourceFor: English and broken input always give the base embed", () => {
  assert.deepEqual(playerSourceFor("en", BASE, { en: "https://www.youtube-nocookie.com/embed/TESTNARR0RO" }), { embed: BASE, nativeNarration: false });
  assert.deepEqual(playerSourceFor("ro", BASE), { embed: BASE, nativeNarration: false });
  assert.deepEqual(playerSourceFor("ro", BASE, null), { embed: BASE, nativeNarration: false });
  assert.deepEqual(playerSourceFor("ro", BASE, { ro: "" }), { embed: BASE, nativeNarration: false });
  assert.deepEqual(playerSourceFor("xx", BASE, { xx: "https://www.youtube-nocookie.com/embed/TESTNARR0RO" }), { embed: BASE, nativeNarration: false });
});

test("player commands use the IFrame API message format", () => {
  assert.deepEqual(JSON.parse(playerCommand("mute")), { event: "command", func: "mute", args: [], id: 1, channel: "widget" });
});

test("labels and caption need", () => {
  assert.equal(languageLabel("ro"), "Română");
  assert.equal(languageLabel("nope"), "English");
  assert.equal(wantsCaptions("en"), false);
  assert.equal(wantsCaptions("it"), true);
  assert.deepEqual(LANGUAGES.map((l) => l.code), ["en", "ro", "de", "es", "fr", "it", "pt"]);
});

test("prefs: normalized, saved and loaded; broken or blocked storage gives defaults", () => {
  assert.deepEqual(normalizePrefs({ muted: "yes", language: "klingon" }), DEFAULT_PREFS);
  const memory = new Map();
  const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  assert.deepEqual(savePrefs({ muted: true, language: "de", extra: 1 }, () => storage), { muted: true, language: "de" });
  assert.deepEqual(JSON.parse(memory.get(STORAGE_KEY)), { muted: true, language: "de" });
  assert.deepEqual(loadPrefs(() => storage), { muted: true, language: "de" });
  memory.set(STORAGE_KEY, "{not json");
  assert.deepEqual(loadPrefs(() => storage), DEFAULT_PREFS);
  const blocked = () => { throw new Error("SecurityError"); };
  assert.deepEqual(loadPrefs(blocked), DEFAULT_PREFS);
  assert.deepEqual(savePrefs({ muted: true }, blocked), { muted: true, language: "en" });
  const throwing = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
  assert.deepEqual(loadPrefs(() => throwing), DEFAULT_PREFS);
  assert.deepEqual(savePrefs({ language: "fr" }, () => throwing), { muted: false, language: "fr" });
});

test("published episode pages render the hidden player controls; the facade still loads nothing", () => {
  const pages = renderSite(loadCatalog());
  const entry = Object.entries(pages).find(([path]) => path.includes("episodes/food/"));
  assert.ok(entry, "food episode page rendered");
  const page = entry[1];
  assert.match(page, /<div class="player" data-player>\s*<div class="facade" data-facade data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/a4qHdjL8bok"/);
  assert.match(page, /<div class="player-controls" data-player-controls hidden>/);
  assert.match(page, /<button class="btn btn-ghost btn-small player-mute" type="button" data-player-mute aria-pressed="false">/);
  assert.match(page, /<label class="player-lang"><span>Language<\/span>\s*<select data-player-lang>/);
  for (const { code, label } of LANGUAGES) assert.match(page, new RegExp(`<option value="${code}" lang="${code}"[^>]*>${label}</option>`));
  assert.match(page, /<option value="en" lang="en" selected>English<\/option>/);
  assert.match(page, /data-player-hint aria-live="polite" hidden/);
  assert.doesNotMatch(page, /<iframe|youtube\.com\/iframe_api/);
});
