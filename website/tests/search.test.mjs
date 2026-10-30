import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalize, buildIndex, search } from "../js/lib/search.js";
import { asDrafts } from "./fixtures.mjs";

const catalog = JSON.parse(readFileSync(new URL("../data/episodes.json", import.meta.url), "utf8"));
const index = buildIndex(catalog);
const top = (query) => search(index, query)[0];

test("normalize lowercases, strips accents and punctuation", () => {
  assert.equal(normalize("  Le Soleil, É té! "), "le soleil e te");
  assert.equal(normalize(""), "");
  assert.equal(normalize(undefined), "");
});

test("subject words find their episode first", () => {
  assert.equal(top("time").slug, "time-compressed");
  assert.equal(top("sun").slug, "the-sun");
  assert.equal(top("The Sun").slug, "the-sun");
  assert.equal(top("SUN").slug, "the-sun");
});

test("keywords and hook text find episodes", () => {
  assert.equal(top("sleep").slug, "time-compressed");
  assert.equal(top("weekend").slug, "time-compressed");
  assert.equal(top("sunspots").slug, "the-sun");
  assert.equal(top("running out").slug, "time-compressed", "hook text match");
});

test("prefixes match while the visitor is still typing", () => {
  assert.equal(top("wee").slug, "time-compressed");
  assert.equal(top("solar p").slug, "the-sun");
});

test("a keyword shared by episodes returns both", () => {
  const slugs = search(index, "2100").map((r) => r.slug);
  assert.ok(slugs.includes("time-compressed") && slugs.includes("the-sun"));
});

test("requested subjects are searchable and marked as requested", () => {
  const result = top("mounjaro");
  assert.equal(result.kind, "requested");
  assert.equal(result.url, "/subject/ozempic-mounjaro/");
  assert.equal(result.title, "Medicine 3 · coming next", "the coming sub-episode is labelled by its series, not a number");
  assert.equal(top("ghrelin").url, "/episodes/weight/", "Weight is an episode now");
  assert.equal(top("insulin").url, "/episodes/diabetes/", "Diabetes is an episode now");
  assert.equal(top("music").title, "Idea — vote in the comments");
});

test("sub-episodes are labelled by their series, main episodes by their number", () => {
  assert.equal(top("weight").title, "Medicine 1 · Weight");
  assert.equal(top("diabetes").title, "Medicine 2 · Diabetes");
  assert.equal(top("light").title, "No. 07 · Light");
});

test("episode results link to their episode page", () => {
  assert.equal(top("time").url, "/episodes/time-compressed/");
  assert.equal(top("time").kind, "episode");
});

test("empty and nonsense queries return nothing; results are capped", () => {
  assert.deepEqual(search(index, ""), []);
  assert.deepEqual(search(index, "   "), []);
  assert.deepEqual(search(index, "zzqx"), []);
  assert.ok(search(index, "e", 3).length <= 3);
});

test("published episodes expose a YouTube watch URL", () => {
  assert.equal(top("sun").watchUrl, "https://www.youtube.com/watch?v=WlClbKXSdSo");
  assert.equal(top("time").watchUrl, "https://www.youtube.com/watch?v=Sw1xP57TNTk");
  const drafts = asDrafts(catalog);
  assert.equal(search(buildIndex(drafts), "sun")[0].watchUrl, null, "drafts have no watch URL");
});
