#!/usr/bin/env node
// Publish an episode on the site once its YouTube video is live:
//   node tools/add-video.mjs <slug> <youtubeId> [--date YYYY-MM-DD] [--root <site dir>] [--no-build] [--force]
// Updates data/episodes.json (status → published, youtubeId, publishedAt, thumbnail) and rebuilds the pages.
// A self-hosted thumbnail (/assets/…) is kept; an already published episode needs --force.
// It never calls the YouTube API and needs no keys.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { addVideo, validateCatalog } from "./lib/catalog.mjs";
import { buildSite } from "./build-site.mjs";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "Usage: node tools/add-video.mjs <slug> <youtubeId> [--date YYYY-MM-DD] [--root <dir>] [--no-build] [--force]";

function option(argv, name) {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

function parseDate(value) {
  if (value === undefined) return new Date();
  const date = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) throw new Error(`--date must be YYYY-MM-DD, got "${value}"`);
  return date;
}

/** Accepts a bare id or a full YouTube URL and returns the 11-character id (or the input unchanged). */
export function extractYoutubeId(input) {
  const match = String(input ?? "").match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : String(input ?? "");
}

function main(argv) {
  const positional = argv.filter((arg, i) => !arg.startsWith("--") && !["--date", "--root"].includes(argv[i - 1]));
  const [slug, idOrUrl] = positional;
  if (!slug || !idOrUrl) throw new Error(USAGE);

  const root = resolve(option(argv, "--root") ?? DEFAULT_ROOT);
  const dataPath = join(root, "data", "episodes.json");
  const catalog = JSON.parse(readFileSync(dataPath, "utf8"));
  const next = addVideo(catalog, slug, extractYoutubeId(idOrUrl), parseDate(option(argv, "--date")), { force: argv.includes("--force") });
  const errors = validateCatalog(next);
  if (errors.length) throw new Error(`Refusing to write an invalid catalog:\n- ${errors.join("\n- ")}`);

  writeFileSync(dataPath, `${JSON.stringify(next, null, 2)}\n`);
  const episode = next.episodes.find((e) => e.slug === slug);
  console.log(`Published No. ${episode.number} "${episode.title}" → https://www.youtube.com/watch?v=${episode.youtubeId} (${episode.publishedAt})`);

  if (!argv.includes("--no-build")) {
    const result = buildSite(root);
    console.log(`Rebuilt ${result.outdated.length} page(s). Review with \`git diff\`, then commit.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
