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
