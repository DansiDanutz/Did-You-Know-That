import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { validateCatalog, addVideo, thumbnailFor, YOUTUBE_ID_PATTERN } from "../tools/lib/catalog.mjs";

import { loadCatalog, loadDraftCatalog, withoutArtwork, withLocalizations } from "./fixtures.mjs";

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

const BLOB = "https://abc123.public.blob.vercel-storage.com/dub/v1";
const goodRo = { subtitles: "/assets/captions/food/ro.vtt", audio: `${BLOB}/food/ro.m4a` };

test("localizations: a published episode may carry subtitles, with or without audio, for ro, fr, es and zh", () => {
  // Arrange
  const catalog = withLocalizations(loadCatalog(), "food", {
    ro: goodRo, fr: { subtitles: "/assets/captions/food/fr.vtt" }, es: { subtitles: "/assets/captions/food/es.vtt" }, zh: { subtitles: "/assets/captions/food/zh.vtt", audio: `${BLOB}/food/zh.m4a` },
  });
  // Act
  const errors = validateCatalog(catalog);
  // Assert
  assert.deepEqual(errors, []);
});

test("localizations: a language key outside ro, fr, es, zh is rejected", () => {
  for (const code of ["de", "en", "xx"]) {
    const errors = validateCatalog(withLocalizations(loadCatalog(), "food", { [code]: { subtitles: `/assets/captions/food/${code}.vtt` } }));
    assert.ok(errors.some((e) => e.includes(`localizations."${code}" is not a localization language`)), code);
  }
});

test("localizations: subtitles must be exactly /assets/captions/<slug>/<lang>.vtt", () => {
  const errorsFor = (subtitles) => validateCatalog(withLocalizations(loadCatalog(), "food", { ro: { subtitles } }));
  for (const bad of ["/assets/captions/money/ro.vtt", "/assets/captions/food/fr.vtt", "/assets/captions/food/ro.srt", "https://x.test/assets/captions/food/ro.vtt", "/assets/captions/food/ro.vtt?x=1", undefined, 5]) {
    assert.ok(errorsFor(bad).some((e) => e.includes('localizations."ro" subtitles must be exactly "/assets/captions/food/ro.vtt"')), String(bad));
  }
});

test("localizations: audio must be https on a public Blob store host and end with /<slug>/<lang>.m4a", () => {
  const errorsFor = (audio) => validateCatalog(withLocalizations(loadCatalog(), "food", { ro: { subtitles: goodRo.subtitles, audio } }));
  const bad = [
    "http://abc123.public.blob.vercel-storage.com/dub/v1/food/ro.m4a",
    "https://evil.example/dub/v1/food/ro.m4a",
    "https://public.blob.vercel-storage.com/dub/v1/food/ro.m4a",
    "https://abc123.public.blob.vercel-storage.com.evil.example/food/ro.m4a",
    "https://user:pw@abc123.public.blob.vercel-storage.com/food/ro.m4a",
    `${BLOB}/food/fr.m4a`, `${BLOB}/money/ro.m4a`, `${BLOB}/food/ro.mp3`, "not a url", "", null, 7,
  ];
  for (const audio of bad) assert.ok(errorsFor(audio).some((e) => e.includes('localizations."ro" audio must be an https URL')), String(audio));
  assert.deepEqual(errorsFor(`${BLOB}/food/ro.m4a`), []);
  assert.deepEqual(errorsFor("https://x.public.blob.vercel-storage.com/food/ro.m4a"), []);
});

test("localizations: wrong shapes and unknown fields are rejected; a draft episode cannot have them; absent stays valid", () => {
  const catalog = loadCatalog();
  const errorsFor = (value) => validateCatalog(withLocalizations(catalog, "food", value));
  assert.ok(errorsFor([goodRo]).some((e) => e.includes("localizations must be an object")));
  assert.ok(errorsFor("ro").some((e) => e.includes("localizations must be an object")));
  assert.ok(errorsFor(null).some((e) => e.includes("localizations must be an object")));
  assert.ok(errorsFor({ ro: "x" }).some((e) => e.includes('localizations."ro" must be an object')));
  assert.ok(errorsFor({ ro: { ...goodRo, volume: 1 } }).some((e) => e.includes('unknown field "volume"')));
  const draft = withLocalizations(loadDraftCatalog(), "food", { ro: goodRo });
  assert.ok(validateCatalog(draft).some((e) => e.includes("localizations are only allowed on a published episode")));
  assert.deepEqual(errorsFor(undefined), []);
  assert.deepEqual(errorsFor({}), []);
});

test("validateCatalog rejects a subject slug used by both an episode and a requested subject", () => {
  const catalog = loadCatalog();
  const clash = { ...catalog, requested: [...catalog.requested, { subject: "Time", slug: "time", status: "idea", keywords: ["time"], pitch: "x" }] };
  assert.ok(validateCatalog(clash).some((e) => e.includes("subject slug")));
});

test("addVideo publishes an episode without mutating the original catalog", () => {
  // Arrange
  const catalog = loadDraftCatalog();
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
  const next = addVideo(withoutArtwork(loadDraftCatalog(), "the-sun"), "the-sun", "TESTID00001", new Date("2026-11-01T00:00:00Z"));
  assert.equal(next.episodes.find((e) => e.slug === "the-sun").thumbnail, "https://i.ytimg.com/vi/TESTID00001/maxresdefault.jpg");
});

test("addVideo refuses to re-publish an episode unless forced", () => {
  const once = addVideo(loadDraftCatalog(), "the-sun", "TESTID00001");
  assert.throws(() => addVideo(once, "the-sun", "TESTID00002"), /already published.*--force/);
  const forced = addVideo(once, "the-sun", "TESTID00002", new Date(), { force: true });
  assert.equal(forced.episodes.find((e) => e.slug === "the-sun").youtubeId, "TESTID00002");
});

test("validateCatalog checks thumbnails and keeps drafts free of video ids", () => {
  const catalog = loadDraftCatalog();
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

test("every question of episodes 01–07 is traceable to RESEARCH.md and has exactly one answer", () => {
  const catalog = loadCatalog();
  for (const slug of ["time-compressed", "the-sun", "school", "money", "food", "medicine", "light"]) {
    const episode = catalog.episodes.find((e) => e.slug === slug);
    assert.equal(episode.quiz.questions.length, 8, `${slug} has one question per era plus the answer`);
    assert.ok(episode.quiz.questions.some((q) => q.era === "The answer"), `${slug} ends with the answer`);
    for (const q of episode.quiz.questions) {
      assert.match(q.source, /^[FAML]\d+[a-z]?$/);
      assert.ok(q.answerIndex >= 0 && q.answerIndex < q.options.length);
      assert.equal(new Set(q.options).size, q.options.length);
    }
  }
});

test("every School quiz source is a fact number defined in episodes/003-school/RESEARCH.md", () => {
  const research = readFileSync(new URL("../../episodes/003-school/RESEARCH.md", import.meta.url), "utf8");
  const school = loadCatalog().episodes.find((e) => e.slug === "school");
  for (const q of school.quiz.questions) assert.match(research, new RegExp(`^\\| \\*\\*${q.source}\\*\\* \\|`, "m"), `${q.id} cites ${q.source}`);
});

test("every Money quiz source is a fact number defined in episodes/004-money/RESEARCH.md", () => {
  const research = readFileSync(new URL("../../episodes/004-money/RESEARCH.md", import.meta.url), "utf8");
  const money = loadCatalog().episodes.find((e) => e.slug === "money");
  assert.equal(money.quiz.questions.length, 8);
  for (const q of money.quiz.questions) assert.match(research, new RegExp(`^\\| \\*\\*${q.source}\\*\\* \\|`, "m"), `${q.id} cites ${q.source}`);
  assert.ok(money.quiz.questions.every((q) => q.era !== "2100"), "the 2100 prediction is never quizzed");
});

test("every Food quiz source is a fact number defined in episodes/005-food/RESEARCH.md", () => {
  const research = readFileSync(new URL("../../episodes/005-food/RESEARCH.md", import.meta.url), "utf8");
  const food = loadCatalog().episodes.find((e) => e.slug === "food");
  assert.equal(food.quiz.questions.length, 8);
  for (const q of food.quiz.questions) assert.match(research, new RegExp(`^\\| \\*\\*${q.source}\\*\\* \\|`, "m"), `${q.id} cites ${q.source}`);
  assert.ok(food.quiz.questions.every((q) => q.era !== "2100"), "the 2100 prediction is never quizzed");
  assert.ok(food.quiz.questions.every((q) => q.card.startsWith("food-")), "every Food question unlocks a Food card");
});

test("every Medicine quiz source is a fact number defined in episodes/006-medicine/RESEARCH.md", () => {
  const research = readFileSync(new URL("../../episodes/006-medicine/RESEARCH.md", import.meta.url), "utf8");
  const medicine = loadCatalog().episodes.find((e) => e.slug === "medicine");
  assert.equal(medicine.quiz.questions.length, 8);
  for (const q of medicine.quiz.questions) assert.match(research, new RegExp(`^\\| ${q.source} \\|`, "m"), `${q.id} cites ${q.source}`);
  assert.ok(medicine.quiz.questions.every((q) => q.era !== "2100"), "the 2100 prediction is never quizzed");
  assert.ok(medicine.quiz.questions.every((q) => q.card.startsWith("medicine-")), "every Medicine question unlocks a Medicine card");
});

test("every Light quiz source is a fact number defined in episodes/007-light/RESEARCH.md", () => {
  const research = readFileSync(new URL("../../episodes/007-light/RESEARCH.md", import.meta.url), "utf8");
  const light = loadCatalog().episodes.find((e) => e.slug === "light");
  assert.equal(light.quiz.questions.length, 8);
  for (const q of light.quiz.questions) assert.match(research, new RegExp(`^\\| ${q.source} \\|`, "m"), `${q.id} cites ${q.source}`);
  assert.ok(light.quiz.questions.every((q) => q.era !== "2100"), "the 2100 prediction is never quizzed");
  assert.ok(light.quiz.questions.every((q) => q.card.startsWith("light-")), "every Light question unlocks a Light card");
});

test("every Weight quiz source is a claim number defined in episodes/008-weight/RESEARCH.md", () => {
  const research = readFileSync(new URL("../../episodes/008-weight/RESEARCH.md", import.meta.url), "utf8");
  const weight = loadCatalog().episodes.find((e) => e.slug === "weight");
  assert.equal(weight.quiz.questions.length, 8);
  for (const q of weight.quiz.questions) {
    assert.match(q.source, /^W\d+$/, `${q.id} cites a W-numbered claim`);
    assert.match(research, new RegExp(`^\\| ${q.source} \\|`, "m"), `${q.id} cites ${q.source}`);
  }
  assert.ok(weight.quiz.questions.every((q) => q.card.startsWith("weight-")), "every Weight question unlocks a Weight card");
});

test("the shipped catalog has eight live episodes with their real YouTube ids (episode 02 is the v2 upload)", () => {
  const live = loadCatalog().episodes.filter((e) => e.status === "published");
  assert.deepEqual(live.map((e) => [e.slug, e.youtubeId, e.publishedAt]), [
    ["time-compressed", "Sw1xP57TNTk", "2026-10-11"],
    ["the-sun", "WlClbKXSdSo", "2026-10-12"],
    ["school", "rchexCb48LM", "2026-10-13"],
    ["money", "GkEBiDLa1WY", "2026-10-14"],
    ["food", "a4qHdjL8bok", "2026-10-14"],
    ["medicine", "_RD_Qz66FCg", "2026-10-22"],
    ["light", "HbsIy38RGvI", "2026-10-29"],
    ["weight", "o5NXRlNytjo", "2026-10-30"],
  ]);
  assert.ok(loadCatalog().episodes.every((e) => e.thumbnail === `/assets/episodes/${e.slug}/thumb.png`), "every episode ships its own artwork");
  for (const dead of ["WI9P4hHcSoc", "XSQmwP_GSEM"]) assert.ok(!JSON.stringify(loadCatalog()).includes(dead), `the removed upload ${dead} is gone`);
  assert.ok(!loadCatalog().requested.some((r) => r.slug === "school"), "School is an episode now, not an upcoming subject");
  assert.ok(!loadCatalog().requested.some((r) => r.slug === "money"), "Money is an episode now, not an upcoming subject");
  assert.ok(!loadCatalog().requested.some((r) => r.slug === "food"), "Food is an episode now, not an upcoming subject");
  assert.ok(!loadCatalog().requested.some((r) => r.slug === "medicine"), "Medicine is an episode now, not an upcoming subject");
  assert.ok(!loadCatalog().requested.some((r) => r.slug === "light"), "Light is an episode now, not an upcoming subject");
  assert.ok(!loadCatalog().requested.some((r) => r.slug === "weight"), "Weight is an episode now, not an upcoming subject");
  assert.equal(loadCatalog().requested[0].slug, "diabetes", "Medicine 2 (Diabetes) leads the upcoming subjects");
  assert.deepEqual(loadCatalog().requested.filter((r) => r.status === "next").map((r) => r.slug), ["diabetes"], "Diabetes is announced as next");
});

test("format is optional and only \"explainer\" is allowed", () => {
  // Arrange
  const catalog = loadCatalog();
  const withFormat = (format) => ({ ...catalog, episodes: catalog.episodes.map((e) => (e.slug === "light" ? { ...e, format } : e)) });
  // Act
  const explainer = validateCatalog(withFormat("explainer"));
  const unknown = validateCatalog(withFormat("documentary"));
  // Assert
  assert.deepEqual(explainer, []);
  assert.ok(unknown.some((e) => e.includes('format must be "explainer" when set')));
  assert.equal(catalog.episodes.find((e) => e.slug === "weight").format, "explainer", "Medicine 1 · Weight is an explainer");
});
