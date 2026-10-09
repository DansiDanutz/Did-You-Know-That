import { test } from "node:test";
import assert from "node:assert/strict";

import { LANGUAGES, LOCALES, createTranslator, detectLanguage } from "../js/i18n/index.js";
import { localizeStory, AUDIENCES } from "../js/lib/localize.js";
import { STORIES } from "../js/data/stories.js";
import { emptySettings, normalizeSettings } from "../js/lib/storage.js";

const en = LOCALES.en;

// ---------------------------------------------------------------- translator

test("t() interpolates variables and falls back to English, then to the key", () => {
  const t = createTranslator("ro");
  assert.notEqual(t("start.go"), en.ui["start.go"], "Romanian string is used");
  assert.match(createTranslator("en")("book.sparks", { n: 3, max: 10 }), /3.*10/);
  const fake = createTranslator("xx");
  assert.equal(fake("start.go"), en.ui["start.go"]);
  assert.equal(fake("no.such.key"), "no.such.key");
});

test("detectLanguage picks the first supported browser language", () => {
  assert.equal(detectLanguage(["ro-RO", "en-US"]), "ro");
  assert.equal(detectLanguage(["ja-JP", "de-AT"]), "de");
  assert.equal(detectLanguage(["ja-JP"]), "en");
  assert.equal(detectLanguage(undefined), "en");
});

// ---------------------------------------------------------------- locale completeness

for (const { code } of LANGUAGES) {
  test(`${code}: has every UI string that English has`, () => {
    const missing = Object.keys(en.ui).filter((key) => !LOCALES[code].ui[key]);
    assert.deepEqual(missing, []);
  });

  for (const story of STORIES) {
    for (const audience of AUDIENCES) {
      test(`${code}/${audience}: ${story.id} is fully translated and consistent`, () => {
        const own = LOCALES[code].stories[story.id];
        assert.ok(own?.[audience] ?? own?.title, "translated in this locale, not only via English fallback");
        const s = localizeStory(story, LOCALES[code], en, audience);
        assert.ok(s.title && s.teaser && s.card.name, "title, teaser and card name");
        if (story.comingSoon) return;
        assert.equal(s.mission.length, 3, "three mission items");
        const ownPages = own?.[audience]?.pages ?? {};
        for (const page of s.pages) {
          if (["story", "title", "quiz"].includes(page.type) && code !== "en") {
            assert.ok(ownPages[page.id], `page "${page.id}" translated in ${code}`);
          }
          if (page.type === "story") assert.ok(page.heading && page.text.length && page.spark.note, `story ${page.id}`);
          if (page.type === "quiz") {
            const expected = audience === "kids" ? 3 : 4;
            assert.equal(page.choices.length, expected, `${page.id} choices`);
            assert.ok(page.answer >= 0 && page.answer < expected, `${page.id} answer index`);
            assert.ok(page.question && page.explain, `${page.id} text`);
          }
        }
        assert.ok(!JSON.stringify(s).includes("undefined"), "no undefined text");
      });
    }
  }
}

// ---------------------------------------------------------------- localizeStory

test("localizeStory falls back to English text for a missing translation", () => {
  const partial = { ui: {}, stories: {} };
  const s = localizeStory(STORIES[0], partial, en, "kids");
  assert.equal(s.title, en.stories[STORIES[0].id].kids.title);
});

test("localizeStory keeps language-neutral fields and does not mutate the base story", () => {
  const honey = STORIES.find((story) => story.id === "eternal-honey");
  const before = JSON.stringify(honey);
  const s = localizeStory(honey, LOCALES.fr, en, "adults");
  assert.equal(s.youtubeId, honey.youtubeId);
  assert.equal(s.card.id, honey.card.id);
  assert.equal(JSON.stringify(honey), before);
});

// ---------------------------------------------------------------- settings

test("normalizeSettings accepts valid values and repairs invalid ones", () => {
  assert.deepEqual(normalizeSettings({ lang: "de", audience: "adults" }), { lang: "de", audience: "adults", chosen: false });
  assert.deepEqual(normalizeSettings({ lang: "zz", audience: "aliens", chosen: true }, "fr"), { lang: "fr", audience: "kids", chosen: true });
  assert.deepEqual(normalizeSettings(null, "en"), emptySettings("en"));
});

for (const { code } of LANGUAGES) {
  test(`${code}: Daxter has every line, in this language`, () => {
    for (const kind of Object.keys(en.quips)) {
      const lines = LOCALES[code].quips?.[kind];
      assert.equal(lines?.length, en.quips[kind].length, `${kind} lines`);
      assert.ok(lines.every((line) => typeof line === "string" && line.length > 3));
    }
  });
}
