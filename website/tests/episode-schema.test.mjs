import { test } from "node:test";
import assert from "node:assert/strict";

import { STORIES } from "../js/data/stories.js";
import { validatePublication, catalogFor, isPlayable } from "../js/lib/episode-schema.js";

const valid = {
  schemaVersion: 1,
  episodeId: "kids-001-test",
  slug: "test-episode",
  topic: "digital-life",
  publicationStatus: "ready",
  videoLanguage: "en",
  narrationLanguages: ["en"],
};

test("a minimal ready episode is valid", () => {
  assert.deepEqual(validatePublication(valid, "kids"), []);
});

test("a YouTube id is only allowed on a published episode with a date", () => {
  assert.ok(validatePublication({ ...valid, youtubeId: "dQw4w9WgXcQ" }, "kids").some((e) => /youtubeId/.test(e)));
  assert.ok(validatePublication({ ...valid, publicationStatus: "published", youtubeId: "dQw4w9WgXcQ" }, "kids").some((e) => /publishedAt/.test(e)));
  assert.deepEqual(validatePublication({ ...valid, publicationStatus: "published", youtubeId: "dQw4w9WgXcQ", publishedAt: "2026-10-20T09:00:00+03:00" }, "kids"), []);
  assert.ok(validatePublication({ ...valid, publicationStatus: "published", youtubeId: "bad id!", publishedAt: "2026-10-20T09:00:00+03:00" }, "kids").some((e) => /youtubeId/.test(e)));
});

test("malformed fields are reported, not trusted", () => {
  const errors = validatePublication({ ...valid, slug: "Bad Slug", topic: "finance", publicationStatus: "live", durationSeconds: -3 }, "kids");
  assert.ok(errors.some((e) => /slug/.test(e)));
  assert.ok(errors.some((e) => /topic/.test(e)), "adult topics never appear in kids mode");
  assert.ok(errors.some((e) => /publicationStatus/.test(e)));
  assert.ok(errors.some((e) => /durationSeconds/.test(e)));
});

test("every story in the catalog has valid, unique publication data per audience", () => {
  for (const audience of ["kids", "adults"]) {
    const catalog = catalogFor(STORIES, audience);
    catalog.forEach((entry) => assert.deepEqual(validatePublication(entry.publication, audience), [], `${audience} ${entry.id}`));
    const slugs = catalog.map((entry) => entry.publication.slug);
    assert.equal(new Set(slugs).size, slugs.length, `${audience} slugs are unique`);
  }
});

test("only published episodes with a valid id are playable", () => {
  assert.equal(isPlayable(valid), false);
  assert.equal(isPlayable({ ...valid, publicationStatus: "published", youtubeId: "dQw4w9WgXcQ", publishedAt: "2026-10-20T09:00:00Z" }), true);
});
