import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { renderEpisodePages, SITE } from "../tools/episode-pages.mjs";

const pages = renderEpisodePages();

test("every published-or-draft episode gets one public page per audience", () => {
  assert.deepEqual(Object.keys(pages).sort(), [
    "e/ancient-honey/index.html", "e/honey-that-never-spoils/index.html", "e/re-reading-trap/index.html", "e/who-keeps-pressing-play/index.html",
  ]);
});

test("link previews get title, description, canonical URL and image without running scripts", () => {
  const html = pages["e/who-keeps-pressing-play/index.html"];
  assert.match(html, /<title>Who Keeps Pressing Play\? · Did You Know That\?<\/title>/);
  for (const tag of ["og:title", "og:description", "og:url", "og:image", "og:type"]) assert.match(html, new RegExp(`property="${tag}" content="[^"]+"`), tag);
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}/e/who-keeps-pressing-play/" />`));
});

test("draft episodes never show a Play button; the card is saveable without the video", () => {
  const html = pages["e/who-keeps-pressing-play/index.html"];
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /Coming soon/);
  assert.match(html, /data-save/);
  assert.match(html, /Your card stays on this device/);
  assert.match(html, /href="\/\?audience=kids&amp;story=why-wonder"/, "opening the app keeps the story and audience");
});

test("public pages carry no personal state and no leaderboard", () => {
  Object.values(pages).forEach((html) => {
    assert.doesNotMatch(html, /nickname|playerId|leaderboard|points/i);
    assert.doesNotMatch(html, /\?(.*)(id|user|player)=/i);
  });
});

test("committed pages match the generator (run: node tools/build-pages.mjs)", async () => {
  for (const [path, html] of Object.entries(pages)) {
    assert.equal(await readFile(new URL(`../${path}`, import.meta.url), "utf8"), html, path);
  }
});
