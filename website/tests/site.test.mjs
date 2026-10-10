import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderSite, buildSite } from "../tools/build-site.mjs";
import { addVideo } from "../tools/lib/catalog.mjs";
import { extractYoutubeId } from "../tools/add-video.mjs";
import { escapeHtml, html } from "../tools/lib/html.mjs";

const SITE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const loadCatalog = () => JSON.parse(readFileSync(join(SITE_ROOT, "data", "episodes.json"), "utf8"));
const jsonLdBlocks = (page) => [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

/** A throwaway copy of the parts of the site the tools read and write. */
function copySite({ withArtwork = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "dyk-site-"));
  mkdirSync(join(dir, "data"));
  cpSync(join(SITE_ROOT, "data", "episodes.json"), join(dir, "data", "episodes.json"));
  if (withArtwork) cpSync(join(SITE_ROOT, "assets", "episodes"), join(dir, "assets", "episodes"), { recursive: true });
  return dir;
}

test("the committed pages match data/episodes.json (run npm run build:site)", () => {
  const result = buildSite(SITE_ROOT, { check: true });
  assert.deepEqual({ outdated: result.outdated, stale: result.stale }, { outdated: [], stale: [] });
});

test("html escapes interpolated text but keeps nested markup", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(String(html`<p>${"<b>"}${html`<i>ok</i>`}${null}${["a", "b"]}</p>`), "<p>&lt;b&gt;<i>ok</i>ab</p>");
});

test("every episode, subject and requested subject gets a page and a sitemap entry", () => {
  const catalog = loadCatalog();
  const files = renderSite(catalog);
  for (const e of catalog.episodes) {
    assert.ok(files[`episodes/${e.slug}/index.html`]);
    assert.ok(files[`subject/${e.subjectSlug}/index.html`]);
    assert.ok(files["sitemap.xml"].includes(`https://dexty.live/episodes/${e.slug}/`));
  }
  for (const r of catalog.requested) assert.match(files[`subject/${r.slug}/index.html`], /vote in the comments/i);
});

test("the shipped site references no test video ids and no published episodes yet", () => {
  const files = renderSite(loadCatalog());
  for (const [path, contents] of Object.entries(files)) assert.doesNotMatch(contents, /TESTID|youtube\.com\/watch\?v=|youtube-nocookie\.com\/embed/, path);
  assert.doesNotMatch(files["index.html"], /Watch now/);
});

test("draft episodes show Coming soon, our artwork, no iframe and no VideoObject", () => {
  const files = renderSite(loadCatalog());
  const page = files["episodes/time-compressed/index.html"];
  assert.match(page, /<meta property="og:image" content="https:\/\/dexty\.live\/assets\/episodes\/time-compressed\/thumb\.png">/);
  assert.match(page, /srcset="\/assets\/episodes\/time-compressed\/thumb-640\.webp 640w/);
  assert.match(files["index.html"], /card-badge">Coming soon/);
  assert.match(page, /Coming soon/);
  assert.doesNotMatch(page, /<iframe/);
  assert.ok(!jsonLdBlocks(page).some((block) => block["@type"] === "VideoObject"));
});

test("a published episode gets a click-to-load facade and VideoObject JSON-LD", () => {
  const catalog = addVideo(loadCatalog(), "time-compressed", "TESTID00000", new Date("2026-10-12T00:00:00Z"));
  const files = renderSite(catalog);
  const page = files["episodes/time-compressed/index.html"];
  assert.doesNotMatch(page, /<iframe/, "no iframe until the visitor clicks play");
  assert.match(page, /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/TESTID00000"/);
  const video = jsonLdBlocks(page).find((block) => block["@type"] === "VideoObject");
  assert.equal(video.uploadDate, "2026-10-12");
  assert.equal(video.embedUrl, "https://www.youtube-nocookie.com/embed/TESTID00000");
  assert.deepEqual(video.thumbnailUrl, ["https://dexty.live/assets/episodes/time-compressed/thumb.png"]);
  assert.doesNotMatch(page, /i\.ytimg\.com/, "self-hosted artwork: no request to YouTube before play");
  assert.match(files["index.html"], /node node-lit/, "the map lights the published subject");
  assert.match(files["index.html"], /href="https:\/\/www\.youtube\.com\/watch\?v=TESTID00000"/, "comment buttons point at the newest video");
});

test("pages carry SEO basics and no inline styles or inline scripts (CSP)", () => {
  const files = renderSite(loadCatalog());
  for (const [path, page] of Object.entries(files).filter(([p]) => p.endsWith(".html"))) {
    assert.match(page, /<title>[^<]+<\/title>/, path);
    assert.match(page, /<meta name="description" content="[^"]+">/, path);
    assert.match(page, /<meta property="og:image" content="https:\/\/dexty\.live\/assets\/[^"]+\.(jpg|png)">/, path);
    assert.doesNotMatch(page, /\sstyle="/, `${path} has an inline style`);
    assert.doesNotMatch(page, /<script(?![^>]*(type="application\/ld\+json"|type="module" src=))/, `${path} has an inline script`);
    assert.equal((page.match(/<h1[\s>]/g) ?? []).length, 1, `${path} needs exactly one h1`);
  }
  assert.match(files["404.html"], /noindex/);
});

test("catalog text is escaped in the pages", () => {
  const catalog = loadCatalog();
  const hostile = { ...catalog, episodes: catalog.episodes.map((e, i) => (i === 0 ? { ...e, title: `<img src=x onerror=alert(1)>` } : e)) };
  const page = renderSite(hostile)["episodes/time-compressed/index.html"];
  assert.doesNotMatch(page, /<img src=x/);
  assert.match(page, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("extractYoutubeId accepts ids and common YouTube URLs", () => {
  assert.equal(extractYoutubeId("TESTID00000"), "TESTID00000");
  assert.equal(extractYoutubeId("https://www.youtube.com/watch?v=TESTID00000&t=3"), "TESTID00000");
  assert.equal(extractYoutubeId("https://youtu.be/TESTID00000"), "TESTID00000");
  assert.equal(extractYoutubeId("https://www.youtube.com/shorts/TESTID00000"), "TESTID00000");
});

test("add-video CLI publishes on a copy of the site and rebuilds its pages", () => {
  const dir = copySite();
  try {
    const out = execFileSync(process.execPath, [join(SITE_ROOT, "tools", "add-video.mjs"), "the-sun", "https://youtu.be/TESTID00001", "--date", "2026-11-01", "--root", dir], { encoding: "utf8" });
    assert.match(out, /Published No\. 2 "The Sun"/);
    assert.throws(() => execFileSync(process.execPath, [join(SITE_ROOT, "tools", "add-video.mjs"), "the-sun", "TESTID00002", "--root", dir], { stdio: "pipe" }), "re-publishing needs --force");
    const saved = JSON.parse(readFileSync(join(dir, "data", "episodes.json"), "utf8"));
    const sun = saved.episodes.find((e) => e.slug === "the-sun");
    assert.deepEqual([sun.status, sun.youtubeId, sun.publishedAt, sun.thumbnail], ["published", "TESTID00001", "2026-11-01", "https://i.ytimg.com/vi/TESTID00001/maxresdefault.jpg"]);
    assert.match(readFileSync(join(dir, "episodes", "the-sun", "index.html"), "utf8"), /youtube-nocookie\.com\/embed\/TESTID00001/);
    assert.ok(buildSite(dir, { check: true }).ok);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the build refuses a local thumbnail whose files are missing", () => {
  const dir = copySite({ withArtwork: false });
  try {
    assert.throws(() => buildSite(dir), /missing thumbnail file \/assets\/episodes\/time-compressed\/thumb\.png/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add-video CLI refuses bad input and leaves the data untouched", () => {
  const dir = copySite();
  try {
    const before = readFileSync(join(dir, "data", "episodes.json"), "utf8");
    assert.throws(() => execFileSync(process.execPath, [join(SITE_ROOT, "tools", "add-video.mjs"), "the-sun", "bad", "--root", dir], { stdio: "pipe" }));
    assert.throws(() => execFileSync(process.execPath, [join(SITE_ROOT, "tools", "add-video.mjs"), "--root", dir], { stdio: "pipe" }));
    assert.equal(readFileSync(join(dir, "data", "episodes.json"), "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the build removes pages for subjects that left the catalog", () => {
  const dir = copySite();
  try {
    mkdirSync(join(dir, "subject", "gone"), { recursive: true });
    writeFileSync(join(dir, "subject", "gone", "index.html"), "old");
    buildSite(dir);
    assert.equal(existsSync(join(dir, "subject", "gone")), false);
    assert.ok(existsSync(join(dir, "subject", "money", "index.html")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
