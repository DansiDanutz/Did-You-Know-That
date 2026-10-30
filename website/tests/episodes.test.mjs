import { test } from "node:test";
import assert from "node:assert/strict";
import { episodeTag, episodeTagLong, episodeGlyph, isSubEpisode, mainEpisodes, subEpisodesOf, inSeriesOrder, newestFirst } from "../js/lib/episodes.js";
import { latestPublished, featuredEpisode } from "../tools/lib/site.mjs";
import { loadCatalog } from "./fixtures.mjs";

const catalog = loadCatalog();
const bySlug = (slug) => catalog.episodes.find((e) => e.slug === slug);

test("main episodes are labelled by number, sub-episodes by their series and part", () => {
  assert.equal(episodeTag(bySlug("medicine")), "No. 06");
  assert.equal(episodeTagLong(bySlug("medicine")), "No. 06");
  assert.equal(episodeTag(bySlug("weight")), "Medicine 1");
  assert.equal(episodeTagLong(bySlug("diabetes")), "Medicine 2 of 10");
  assert.equal(episodeGlyph(bySlug("light")), "07");
  assert.equal(episodeGlyph(bySlug("weight")), "M1");
  assert.equal(episodeTag(catalog.requested.find((r) => r.status === "next")), "Medicine 3", "a coming sub-episode is labelled the same way");
  assert.equal(isSubEpisode(bySlug("diabetes")), true);
  assert.equal(isSubEpisode(bySlug("medicine")), false);
});

test("series order puts each sub-episode right after its parent; newest-first breaks same-day ties by part", () => {
  // Arrange
  const reversed = { ...catalog, episodes: [...catalog.episodes].reverse() };
  // Act
  const order = inSeriesOrder(reversed).map((e) => e.slug);
  const newest = newestFirst(catalog).map((e) => e.slug);
  // Assert
  assert.deepEqual(order, ["time-compressed", "the-sun", "school", "money", "food", "medicine", "weight", "diabetes", "light"]);
  assert.deepEqual(newest.slice(0, 3), ["diabetes", "weight", "light"], "both premiered 2026-10-30; Medicine 2 is the newer");
  assert.deepEqual(newest.slice(-3), ["school", "the-sun", "time-compressed"]);
  assert.deepEqual(mainEpisodes(catalog).map((e) => e.number), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(subEpisodesOf(reversed, "medicine").map((e) => e.slug), ["weight", "diabetes"]);
  assert.deepEqual(subEpisodesOf(catalog, "light"), []);
  assert.notEqual(inSeriesOrder(catalog), catalog.episodes, "returns a new array");
});

test("the newest published episode can be a sub-episode; before any premiere the first draft in series order is featured", () => {
  // Arrange
  const drafts = { ...catalog, episodes: catalog.episodes.map((e) => ({ ...e, status: "draft", youtubeId: null, publishedAt: null })) };
  // Act / Assert
  assert.equal(latestPublished(catalog).slug, "diabetes");
  assert.equal(featuredEpisode(catalog).slug, "diabetes");
  assert.equal(featuredEpisode(drafts).slug, "time-compressed");
  assert.equal(inSeriesOrder({ episodes: [] }).length, 0);
});
