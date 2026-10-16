import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseLocalizations, languageGroups, localizationFor, hintText, isDubAudioUrl, localizationProblems, subtitlesPath,
} from "../js/lib/localizations.js";

const AUDIO = "https://abc123.public.blob.vercel-storage.com/dub/v1/food/ro.m4a";
const RO = { subtitles: "/assets/captions/food/ro.vtt", audio: AUDIO };
const FR = { subtitles: "/assets/captions/food/fr.vtt" };

test("parseLocalizations accepts JSON text or an object and keeps valid entries", () => {
  assert.deepEqual(parseLocalizations(JSON.stringify({ ro: RO, fr: FR })), { ro: RO, fr: FR });
  assert.deepEqual(parseLocalizations({ ro: RO }), { ro: RO });
});

test("parseLocalizations drops anything the catalog rules would reject, and tolerates junk", () => {
  assert.deepEqual(parseLocalizations(undefined), {});
  assert.deepEqual(parseLocalizations("{not json"), {});
  assert.deepEqual(parseLocalizations("[1]"), {});
  assert.deepEqual(parseLocalizations(null), {});
  const parsed = parseLocalizations({
    de: { subtitles: "/assets/captions/food/de.vtt" },
    ro: { subtitles: "/assets/captions/food/ro.vtt", audio: "https://evil.example/food/ro.m4a" },
    fr: { subtitles: "/assets/captions/food/es.vtt" },
    es: "nope",
    zh: { subtitles: "/assets/captions/food/zh.vtt", audio: null },
  });
  assert.deepEqual(parsed, {});
});

test("isDubAudioUrl and localizationProblems explain what is wrong", () => {
  assert.equal(isDubAudioUrl(AUDIO, "food", "ro"), true);
  assert.equal(isDubAudioUrl(AUDIO, "food", "fr"), false);
  assert.equal(isDubAudioUrl("https://abc123.public.blob.vercel-storage.com:8443/food/ro.m4a", "food", "ro"), false, "no port");
  assert.equal(subtitlesPath("food", "ro"), "/assets/captions/food/ro.vtt");
  assert.deepEqual(localizationProblems(RO, "ro", "food"), []);
  assert.equal(localizationProblems({ subtitles: "/x.vtt" }, "ro", "food").length, 1);
  assert.equal(localizationProblems(null, "ro", "food").length, 1);
});

test("languageGroups: languages with a localization form the first group, the rest keep YouTube captions", () => {
  // Arrange / Act
  const groups = languageGroups({ ro: RO, fr: FR });
  // Assert
  assert.deepEqual(groups.localized, [{ code: "ro", label: "Română", voiceOver: true }, { code: "fr", label: "Français", voiceOver: false }]);
  assert.deepEqual(groups.auto.map((l) => l.code), ["de", "es", "zh", "it", "pt"]);
});

test("languageGroups: no localizations → everything except English is auto-translated", () => {
  for (const input of [undefined, {}, null]) {
    const groups = languageGroups(input);
    assert.deepEqual(groups.localized, []);
    assert.deepEqual(groups.auto.map((l) => l.code), ["ro", "de", "es", "fr", "zh", "it", "pt"]);
  }
});

test("localizationFor: none for English, unknown languages or languages the episode lacks", () => {
  const parsed = parseLocalizations({ ro: RO });
  assert.deepEqual(localizationFor(parsed, "ro"), RO);
  assert.equal(localizationFor(parsed, "en"), null);
  assert.equal(localizationFor(parsed, "fr"), null);
  assert.equal(localizationFor(parsed, "xx"), null);
  assert.equal(localizationFor(undefined, "ro"), null);
});

test("hintText: every state of the line under the player", () => {
  assert.equal(hintText({ language: "en" }), "");
  assert.equal(hintText({ language: "ro", loc: RO }), "Subtitles in Română. Mute the English to hear the Romanian voice-over.");
  assert.equal(hintText({ language: "ro", loc: RO, muted: true }), "Voice-over in Română.");
  assert.equal(hintText({ language: "fr", loc: FR }), "Subtitles in Français.");
  assert.equal(hintText({ language: "fr", loc: FR, muted: true }), "Subtitles in Français. Voice-over for this episode is not available yet.");
  assert.equal(hintText({ language: "fr", loc: FR, subtitlesFailed: true }), "Subtitles in Français could not be loaded.");
  assert.equal(hintText({ language: "ro", loc: RO, muted: true, subtitlesFailed: true }), "Voice-over in Română. Subtitles in Română could not be loaded.");
  assert.match(hintText({ language: "de" }), /^Narration stays English; YouTube auto-translates the captions into Deutsch\./);
});
