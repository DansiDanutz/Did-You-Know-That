import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { installMode } from "../js/lib/install.js";
import { surpriseWords, pickWord, isWatchable } from "../js/lib/random-word.js";
import { loadCatalog, loadDraftCatalog } from "./fixtures.mjs";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36";

test("install: hidden once installed, one tap on Android, the two steps on iPhone, nothing elsewhere", () => {
  assert.equal(installMode({ standalone: true, hasPrompt: true, userAgent: ANDROID }), "hidden");
  assert.equal(installMode({ installedFlag: true, userAgent: IPHONE }), "hidden");
  assert.equal(installMode({ hasPrompt: true, userAgent: ANDROID }), "prompt");
  assert.equal(installMode({ userAgent: IPHONE }), "ios");
  assert.equal(installMode({ userAgent: ANDROID }), "hidden");
});

test("the manifest makes the site installable", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.name, "Did You Know That?");
  assert.equal(manifest.short_name, "Dexty");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#060818");
  for (const purpose of ["any", "maskable"]) for (const size of ["192x192", "512x512"]) {
    const icon = manifest.icons.find((i) => i.purpose === purpose && i.sizes === size);
    assert.ok(icon, `${purpose} ${size}`);
    readFileSync(new URL(`..${icon.src}`, import.meta.url));
  }
});

const episode = (over) => ({ slug: "x", subject: "Time", title: "T", keywords: ["clock", "time"], status: "published", youtubeId: "TESTID00000", ...over });

test("Surprise me only picks words from published episodes with a YouTube id", () => {
  const catalog = {
    episodes: [
      episode({ slug: "time-compressed", title: "Time, Compressed" }),
      episode({ slug: "draft", subject: "Sun", keywords: ["sun"], status: "draft", youtubeId: null }),
      episode({ slug: "no-id", subject: "Water", keywords: ["rain"], youtubeId: null }),
      episode({ slug: "bad-id", subject: "Food", keywords: ["bread"], youtubeId: "short" }),
    ],
    requested: [{ subject: "Money", slug: "money", status: "idea", keywords: ["money"] }],
  };
  const words = surpriseWords(catalog);
  assert.deepEqual(words.map((w) => w.word), ["Time", "clock"], "subject + keywords, deduplicated, drafts and requests excluded");
  assert.ok(words.every((w) => w.url === "/episodes/time-compressed/#player"));
  assert.equal(isWatchable(catalog.episodes[1]), false);
});

test("with nothing published there is nothing to pick (the page shows the honest state)", () => {
  assert.deepEqual(surpriseWords(loadDraftCatalog()), []);
  assert.equal(pickWord([]), null);
  assert.deepEqual(surpriseWords(null), []);
});

test("the shipped catalog offers only words from published episodes", () => {
  const shipped = loadCatalog();
  const published = new Set(shipped.episodes.filter(isWatchable).map((e) => e.slug));
  const words = surpriseWords(shipped);
  assert.ok(words.length > 0, "episode 01 is live, so there are words to pick");
  assert.ok(words.some((w) => w.word === "Time"));
  assert.ok(words.every((w) => published.has(w.url.split("/")[2])), "every word leads to a published episode");
});

test("pickWord is random but avoids repeating the previous word", () => {
  const words = [{ word: "a" }, { word: "b" }, { word: "c" }];
  assert.equal(pickWord(words, { random: () => 0 }).word, "a");
  assert.equal(pickWord(words, { random: () => 0.999 }).word, "c");
  assert.equal(pickWord(words, { random: () => 0, previous: "a" }).word, "b");
  assert.equal(pickWord([{ word: "a" }], { previous: "a" }).word, "a");
});
