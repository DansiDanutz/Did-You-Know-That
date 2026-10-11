import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { validateCatalog, addVideo, thumbnailFor, YOUTUBE_ID_PATTERN } from "../tools/lib/catalog.mjs";

const loadCatalog = () => JSON.parse(readFileSync(new URL("../data/episodes.json", import.meta.url), "utf8"));

test("the shipped episodes.json is valid", () => {
  assert.deepEqual(validateCatalog(loadCatalog()), []);
});

test("validateCatalog reports duplicate slugs and a published episode without a video id", () => {
  const catalog = loadCatalog();
  const broken = {
    ...catalog,
    episodes: [
      catalog.episodes[0],
      { ...catalog.episodes[1], slug: catalog.episodes[0].slug, status: "published", youtubeId: null },
    ],
  };
  const errors = validateCatalog(broken);
  assert.ok(errors.some((e) => e.includes("duplicate slug")), errors.join("\n"));
  assert.ok(errors.some((e) => e.includes("youtubeId")), errors.join("\n"));
});

test("validateCatalog rejects unknown status, bad keywords and a non-object catalog", () => {
  const catalog = loadCatalog();
  const broken = { ...catalog, episodes: [{ ...catalog.episodes[0], status: "live", keywords: "time" }] };
  const errors = validateCatalog(broken);
  assert.ok(errors.some((e) => e.includes("status")));
  assert.ok(errors.some((e) => e.includes("keywords")));
  assert.deepEqual(validateCatalog(null), ["catalog must be an object with an episodes array"]);
});

test("validateCatalog rejects a subject slug used by both an episode and a requested subject", () => {
  const catalog = loadCatalog();
  const clash = { ...catalog, requested: [...catalog.requested, { subject: "Time", slug: "time", status: "idea", keywords: ["time"], pitch: "x" }] };
  assert.ok(validateCatalog(clash).some((e) => e.includes("subject slug")));
});

test("addVideo publishes an episode without mutating the original catalog", () => {
  // Arrange
  const catalog = loadCatalog();
  const before = JSON.stringify(catalog);
  // Act
  const next = addVideo(catalog, "time-compressed", "TESTID00000", new Date("2026-10-12T09:30:00Z"));
  // Assert
  const episode = next.episodes.find((e) => e.slug === "time-compressed");
  assert.equal(episode.status, "published");
  assert.equal(episode.youtubeId, "TESTID00000");
  assert.equal(episode.publishedAt, "2026-10-12");
  assert.equal(episode.thumbnail, "/assets/episodes/time-compressed/thumb.png", "self-hosted artwork is kept");
  assert.equal(JSON.stringify(catalog), before, "input catalog must not change");
  assert.deepEqual(validateCatalog(next), []);
});

test("addVideo rejects unknown slugs and malformed YouTube ids", () => {
  const catalog = loadCatalog();
  assert.throws(() => addVideo(catalog, "nope", "TESTID00000"), /unknown episode slug "nope"/);
  assert.throws(() => addVideo(catalog, "the-sun", "not-an-id"), /YouTube id/);
  assert.throws(() => addVideo(catalog, "the-sun", "https://youtu.be/TESTID00000"), /YouTube id/);
});

test("YouTube id pattern and thumbnail URL", () => {
  assert.match("a-b_C1234567".slice(0, 11), YOUTUBE_ID_PATTERN);
  assert.doesNotMatch("short", YOUTUBE_ID_PATTERN);
  assert.equal(thumbnailFor("TESTID00001"), "https://i.ytimg.com/vi/TESTID00001/maxresdefault.jpg");
});

test("validateCatalog checks the quiz and the fact cards", () => {
  const catalog = loadCatalog();
  const [first, second] = catalog.episodes;
  const broken = {
    ...catalog,
    episodes: [
      { ...first, quiz: { ...first.quiz, answerIndex: 7 } },
      { ...second, quiz: { ...second.quiz, options: ["only one"] }, facts: [first.facts[0]] },
    ],
  };
  const errors = validateCatalog(broken);
  assert.ok(errors.some((e) => e.includes("answerIndex")), errors.join("\n"));
  assert.ok(errors.some((e) => e.includes("quiz.options")), errors.join("\n"));
  assert.ok(errors.some((e) => e.includes("duplicate fact card id")), errors.join("\n"));
  assert.ok(validateCatalog({ ...catalog, episodes: [{ ...first, quiz: null }] }).some((e) => e.includes("quiz is required")));
});

test("addVideo falls back to the YouTube thumbnail only when there is no local artwork", () => {
  const next = addVideo(loadCatalog(), "the-sun", "TESTID00001", new Date("2026-11-01T00:00:00Z"));
  assert.equal(next.episodes.find((e) => e.slug === "the-sun").thumbnail, "https://i.ytimg.com/vi/TESTID00001/maxresdefault.jpg");
});

test("addVideo refuses to re-publish an episode unless forced", () => {
  const once = addVideo(loadCatalog(), "the-sun", "TESTID00001");
  assert.throws(() => addVideo(once, "the-sun", "TESTID00002"), /already published.*--force/);
  const forced = addVideo(once, "the-sun", "TESTID00002", new Date(), { force: true });
  assert.equal(forced.episodes.find((e) => e.slug === "the-sun").youtubeId, "TESTID00002");
});

test("validateCatalog checks thumbnails and keeps drafts free of video ids", () => {
  const catalog = loadCatalog();
  const [first] = catalog.episodes;
  const withTracker = { ...catalog, episodes: [{ ...first, thumbnail: "https://evil.example/pixel.gif" }] };
  assert.ok(validateCatalog(withTracker).some((e) => e.includes("thumbnail must be")));
  const draftWithId = { ...catalog, episodes: [{ ...first, youtubeId: "TESTID00000" }] };
  assert.ok(validateCatalog(draftWithId).some((e) => e.includes("draft episode must have youtubeId")));
  const publishedNoThumb = { ...catalog, episodes: [{ ...first, status: "published", youtubeId: "TESTID00000", publishedAt: "2026-10-12", thumbnail: null }] };
  assert.ok(validateCatalog(publishedNoThumb).some((e) => e.includes("needs a thumbnail")));
});

test("validateCatalog checks every per-era quiz question", () => {
  const catalog = loadCatalog();
  const [first] = catalog.episodes;
  const questions = first.quiz.questions;
  const withQuestions = (list, facts = first.facts) => validateCatalog({ ...catalog, episodes: [{ ...first, facts, quiz: { ...first.quiz, questions: list } }] });
  const [q0, q1] = questions;

  assert.deepEqual(validateCatalog(catalog), [], "the committed catalog is valid");
  assert.ok(withQuestions([{ ...q0, answerIndex: 9 }, ...questions.slice(1)]).some((e) => e.includes("answerIndex must point at exactly one")));
  assert.ok(withQuestions([{ ...q0, options: ["A", "a ", "B"] }, ...questions.slice(1)]).some((e) => e.includes("options must be unique")));
  assert.ok(withQuestions([{ ...q0, options: ["A", "B"] }, ...questions.slice(1)]).some((e) => e.includes("3–4 answers")));
  assert.ok(withQuestions([{ ...q0, card: "nope" }, ...questions.slice(1)]).some((e) => e.includes(`card "nope" is not one of this episode's fact cards`)));
  assert.ok(withQuestions([{ ...q0, source: "Wikipedia" }, ...questions.slice(1)]).some((e) => e.includes("source must be a RESEARCH.md fact number")));
  assert.ok(withQuestions([q0, { ...q1, id: q0.id }, ...questions.slice(2)]).some((e) => e.includes("duplicate question id")));
  assert.ok(withQuestions([q0, { ...q1, card: q0.card }, ...questions.slice(2)]).some((e) => e.includes("unlocked by more than one question")));
  assert.ok(withQuestions(questions.slice(1)).some((e) => e.includes(`fact card "${q0.card}" has no quiz question`)));
  assert.ok(withQuestions([]).some((e) => e.includes("non-empty array")));
  assert.ok(withQuestions([{ ...q0, reveal: " " }, ...questions.slice(1)]).some((e) => e.includes("reveal is required")));
  assert.ok(withQuestions([{ id: "Bad Id" }, ...questions.slice(1)]).some((e) => e.includes("id must be lowercase-kebab-case")));
});

test("every episode 01 question is traceable to RESEARCH.md and has exactly one answer", () => {
  const [first] = loadCatalog().episodes;
  assert.equal(first.quiz.questions.length, 8);
  for (const q of first.quiz.questions) {
    assert.match(q.source, /^F\d+$/);
    assert.ok(q.answerIndex >= 0 && q.answerIndex < q.options.length);
    assert.equal(new Set(q.options).size, q.options.length);
  }
  const second = loadCatalog().episodes.find((e) => e.slug === "the-sun");
  assert.equal(second.quiz.questions, undefined, "episode 02 stays without a quiz for now");
});
