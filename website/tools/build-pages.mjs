#!/usr/bin/env node
// Writes the public discovery pages (website/e/<slug>/index.html) and the
// offline app-shell list (website/precache.js, written last: it fingerprints the pages).
//   node tools/build-pages.mjs          # write
//   node tools/build-pages.mjs --check  # exit 1 if a committed page is out of date
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderEpisodePages } from "./episode-pages.mjs";
import { precacheList, precacheSource } from "./precache.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
let stale = 0;

for (const [path, html] of Object.entries(renderEpisodePages())) {
  const target = join(ROOT, path);
  const current = await readFile(target, "utf8").catch(() => "");
  if (current === html) continue;
  if (check) {
    console.error(`out of date: ${path}`);
    stale += 1;
    continue;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`wrote ${path}`);
}
const precache = precacheSource(await precacheList(ROOT));
const precachePath = join(ROOT, "precache.js");
if ((await readFile(precachePath, "utf8").catch(() => "")) !== precache) {
  if (check) {
    console.error("out of date: precache.js");
    stale += 1;
  } else {
    await writeFile(precachePath, precache);
    console.log("wrote precache.js");
  }
}
if (check && stale) process.exit(1);
