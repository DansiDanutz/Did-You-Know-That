#!/usr/bin/env node
// Generates every HTML page and sitemap.xml from data/episodes.json (+ data/site.json for the
// newsletter), and keeps the CSP form-action in vercel.json in step with it. No dependencies.
//   node tools/build-site.mjs            write the pages
//   node tools/build-site.mjs --check    exit 1 if any generated file is missing or out of date (CI)
//   --root <dir>                          build another copy of the site (used by tests / dry runs)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateCatalog, isLocalThumbnail } from "./lib/catalog.mjs";
import { thumbnailSources } from "./lib/site.mjs";
import { homePage } from "./lib/pages-home.mjs";
import { episodePage, subjectPageForEpisode, subjectPageForRequest } from "./lib/pages-episode.mjs";
import { collectionPage, notFoundPage, offlinePage, sitemap } from "./lib/pages-misc.mjs";
import { validateSiteConfig, resolveNewsletter, withFormAction } from "./lib/newsletter.mjs";
import { precacheList, shellVersion, stampServiceWorker } from "./lib/pwa.mjs";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_DIRS = ["episodes", "subject"];

export function loadCatalog(root) {
  const catalog = JSON.parse(readFileSync(join(root, "data", "episodes.json"), "utf8"));
  const errors = validateCatalog(catalog);
  const missing = catalog.episodes
    .filter((episode) => isLocalThumbnail(episode.thumbnail))
    .flatMap((episode) => Object.values(thumbnailSources(episode.thumbnail)))
    .filter((path) => !existsSync(join(root, path)))
    .map((path) => `missing thumbnail file ${path}`);
  const problems = [...errors, ...missing];
  if (problems.length) throw new Error(`data/episodes.json is invalid:\n- ${problems.join("\n- ")}`);
  return catalog;
}

/** data/site.json (optional; without it the newsletter is switched off). */
export function loadSiteConfig(root) {
  const path = join(root, "data", "site.json");
  if (!existsSync(path)) return {};
  const site = JSON.parse(readFileSync(path, "utf8"));
  const errors = validateSiteConfig(site);
  if (errors.length) throw new Error(`data/site.json is invalid:\n- ${errors.join("\n- ")}`);
  return site;
}

/** Every generated file as { "relative/path": contents }. */
export function renderSite(baseCatalog, site = {}) {
  const catalog = { ...baseCatalog, newsletter: resolveNewsletter(site) };
  return {
    "index.html": homePage(catalog),
    "404.html": notFoundPage(catalog),
    "offline/index.html": offlinePage(catalog),
    "collection/index.html": collectionPage(catalog),
    "sitemap.xml": sitemap(catalog),
    ...Object.fromEntries(catalog.episodes.map((e) => [`episodes/${e.slug}/index.html`, episodePage(catalog, e)])),
    ...Object.fromEntries(catalog.episodes.map((e) => [`subject/${e.subjectSlug}/index.html`, subjectPageForEpisode(catalog, e)])),
    ...Object.fromEntries((catalog.requested ?? []).map((r) => [`subject/${r.slug}/index.html`, subjectPageForRequest(catalog, r)])),
  };
}

/** Folders inside the generated directories that no longer belong to any page. */
function staleDirs(root, files) {
  const wanted = new Set(Object.keys(files).map((path) => path.split("/").slice(0, 2).join("/")));
  return GENERATED_DIRS.flatMap((dir) => {
    const full = join(root, dir);
    if (!existsSync(full)) return [];
    return readdirSync(full).map((name) => `${dir}/${name}`).filter((path) => !wanted.has(path));
  });
}

/** vercel.json with its CSP form-action matching the newsletter provider (skipped if there is no vercel.json). */
function vercelConfig(root, site) {
  const path = join(root, "vercel.json");
  return existsSync(path) ? { "vercel.json": withFormAction(readFileSync(path, "utf8"), resolveNewsletter(site)) } : {};
}

/** sw.js with the precache list and shell version of this build (skipped if there is no sw.js). */
function serviceWorker(root, files) {
  const path = join(root, "sw.js");
  if (!existsSync(path)) return {};
  const precache = precacheList(root);
  return { "sw.js": stampServiceWorker(readFileSync(path, "utf8"), { version: shellVersion(root, files, precache), precache }) };
}

export function buildSite(root = DEFAULT_ROOT, { check = false } = {}) {
  const site = loadSiteConfig(root);
  const pages = { ...renderSite(loadCatalog(root), site), ...vercelConfig(root, site) };
  const files = { ...pages, ...serviceWorker(root, pages) };
  const outdated = Object.entries(files)
    .filter(([path, contents]) => !existsSync(join(root, path)) || readFileSync(join(root, path), "utf8") !== contents)
    .map(([path]) => path);
  const stale = staleDirs(root, files);
  if (check) return { ok: outdated.length === 0 && stale.length === 0, outdated, stale };

  for (const path of outdated) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), files[path]);
  }
  for (const path of stale) rmSync(join(root, path), { recursive: true, force: true });
  return { ok: true, outdated, stale };
}

function main(argv) {
  const check = argv.includes("--check");
  const rootFlag = argv.indexOf("--root");
  const root = rootFlag >= 0 ? resolve(argv[rootFlag + 1] ?? "") : DEFAULT_ROOT;
  const result = buildSite(root, { check });
  if (check && !result.ok) {
    console.error("Generated pages are out of date. Run: npm run build:site");
    for (const path of [...result.outdated, ...result.stale]) console.error(`  ${path}`);
    process.exit(1);
  }
  console.log(check ? "Generated pages are up to date." : `Built ${result.outdated.length} file(s), removed ${result.stale.length} stale folder(s).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
