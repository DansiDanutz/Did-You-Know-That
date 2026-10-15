// Shared catalog fixtures for the tests (not a test file: the runner only picks up *.test.mjs).
import { readFileSync } from "node:fs";

/** The committed data/episodes.json, as shipped. */
export const loadCatalog = () => JSON.parse(readFileSync(new URL("../data/episodes.json", import.meta.url), "utf8"));

/** The same catalog before launch: every published episode back to draft (no video id, no date). */
export const asDrafts = (catalog) => ({
  ...catalog,
  episodes: catalog.episodes.map((e) => (e.status === "published" ? { ...e, status: "draft", youtubeId: null, publishedAt: null } : e)),
});

export const loadDraftCatalog = () => asDrafts(loadCatalog());

/** A draft catalog where one episode has no artwork of its own (to exercise the YouTube thumbnail fallback). */
export const withoutArtwork = (catalog, slug) => ({
  ...catalog,
  episodes: catalog.episodes.map((e) => (e.slug === slug ? { ...e, thumbnail: null } : e)),
});

/** A YouTube id shaped like a real one, used only in tests for a native-narration upload. */
export const TEST_NARRATION_ID = "TESTNARR0RO";

/** The catalog with one episode given native-narration uploads, e.g. withNarrations(catalog, "food", { ro: id }). */
export const withNarrations = (catalog, slug, narrations) => ({
  ...catalog,
  episodes: catalog.episodes.map((e) => (e.slug === slug ? { ...e, narrations } : e)),
});
