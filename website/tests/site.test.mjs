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
import { loadCatalog, loadDraftCatalog } from "./fixtures.mjs";
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

test("the shipped site references no test video ids, and only published episodes link to YouTube", () => {
  const catalog = loadCatalog();
  const files = renderSite(catalog);
  const liveIds = catalog.episodes.filter((e) => e.status === "published").map((e) => e.youtubeId);
  for (const [path, contents] of Object.entries(files)) {
    assert.doesNotMatch(contents, /TESTID/, path);
    for (const [, id] of contents.matchAll(/(?:youtube\.com\/watch\?v=|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/g)) assert.ok(liveIds.includes(id), `${path} links to ${id}, which is not a published episode`);
  }
  assert.deepEqual(liveIds, ["WI9P4hHcSoc"], "episode 01 is the only live episode");
  assert.match(files["episodes/time-compressed/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/WI9P4hHcSoc"/);
});

test("before launch, the site references no video at all", () => {
  const files = renderSite(loadDraftCatalog());
  for (const [path, contents] of Object.entries(files)) assert.doesNotMatch(contents, /youtube\.com\/watch\?v=|youtube-nocookie\.com\/embed/, path);
  assert.doesNotMatch(files["index.html"], /Watch now/);
});

test("draft episodes show Coming soon, our artwork, no iframe and no VideoObject", () => {
  const files = renderSite(loadDraftCatalog());
  const page = files["episodes/time-compressed/index.html"];
  assert.match(page, /<meta property="og:image" content="https:\/\/dexty\.live\/assets\/episodes\/time-compressed\/thumb\.png">/);
  assert.match(page, /srcset="\/assets\/episodes\/time-compressed\/thumb-640\.webp 640w/);
  assert.match(files["index.html"], /card-badge">Coming soon/);
  assert.match(page, /Coming soon/);
  assert.doesNotMatch(page, /<iframe/);
  assert.ok(!jsonLdBlocks(page).some((block) => block["@type"] === "VideoObject"));
});

test("a published episode gets a click-to-load facade and VideoObject JSON-LD", () => {
  const catalog = addVideo(loadDraftCatalog(), "time-compressed", "TESTID00000", new Date("2026-10-12T00:00:00Z"));
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

test("the home hero is the real banner: art-directed, preloaded, sized, and the page h1", () => {
  const home = renderSite(loadCatalog())["index.html"];
  assert.match(home, /<h1 id="hero-title" class="hero-banner">/);
  assert.match(home, /<img class="hero-banner-img" src="\/assets\/brand\/hero-1600\.jpg" width="1600" height="238" alt="Did You Know That\?" fetchpriority="high"/);
  assert.match(home, /<source type="image\/webp" media="\(max-width: 639px\)" srcset="\/assets\/brand\/hero-mobile-800\.webp 800w/);
  assert.match(home, /<link rel="preload" as="image" type="image\/webp" imagesrcset="\/assets\/brand\/hero-mobile-800\.webp[^"]*" imagesizes="100vw" media="\(max-width: 639px\)"/);
  assert.match(home, /<link rel="preload" as="image" type="image\/webp" imagesrcset="\/assets\/brand\/hero-1600\.webp[^"]*" imagesizes="143vw" media="\(min-width: 640px\)"/);
  assert.match(home, /href="https:\/\/www\.youtube\.com\/channel\/UC7j29XhArv5tlRqQj2qAb4Q\?sub_confirmation=1"[^>]*>.*Subscribe on YouTube/);
  for (const file of ["hero-1600.jpg", "hero-1600.webp", "hero-2560.webp", "hero-mobile-800.webp", "hero-mobile-1200.webp", "hero-mobile-1200.jpg"]) {
    assert.ok(existsSync(join(SITE_ROOT, "assets", "brand", file)), file);
  }
  assert.doesNotMatch(renderSite(loadCatalog())["collection/index.html"], /rel="preload" as="image"/, "only the home page preloads the banner");
});

test("videos come first: featured episode, then the rail of all episodes, then search, rule and about", () => {
  const home = renderSite(loadCatalog())["index.html"];
  const order = ['id="hero-title"', 'id="featured"', 'id="series"', 'id="map"', 'id="rule"', 'id="about"'].map((marker) => home.indexOf(marker));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `section order ${order}`);
  const railCards = home.slice(home.indexOf('class="cards rail"'), home.indexOf("card-next")).match(/class="card accent/g) ?? [];
  assert.equal(railCards.length, loadCatalog().episodes.length, "the rail lists every episode");
});

test("before anything is published, the next premiere is featured as Premieres soon with its artwork", () => {
  const home = renderSite(loadDraftCatalog())["index.html"];
  const featured = home.slice(home.indexOf('id="featured"'), home.indexOf('id="nl-title-home"'));
  assert.match(featured, /Premieres soon · No\. 01/);
  assert.match(featured, /Time, Compressed/);
  assert.match(featured, /\/assets\/episodes\/time-compressed\/thumb-640\.webp/);
  assert.match(featured, /href="\/episodes\/time-compressed\/#guess"[^>]*>.*Guess before it premieres/);
  assert.doesNotMatch(featured, /data-facade|youtube/);
  assert.match(renderSite(loadDraftCatalog())["episodes/time-compressed/index.html"], /<section class="quiz wrap" id="guess"/);
  const files = renderSite(loadDraftCatalog());
  const ep1 = files["episodes/time-compressed/index.html"];
  assert.match(ep1, /data-questions="8"/);
  assert.match(ep1, /data-quiz-start/);
  assert.match(ep1, /href="#player"[^>]*>.*Watch the episode/s, "a plain watch link stays");
  assert.match(ep1, /data-quiz-summary/);
  const ep2 = files["episodes/the-sun/index.html"];
  assert.match(ep2, /Quiz coming soon/);
  assert.doesNotMatch(ep2, /data-quiz-start|data-quiz-run/);
  assert.match(files["collection/index.html"], /150\+ points/);
  const special = JSON.parse(readFileSync(join(SITE_ROOT, "data", "special-cards.json"), "utf8"));
  const withVault = renderSite({ ...loadDraftCatalog(), special });
  const vault = withVault["vault/index.html"];
  assert.equal((vault.match(/data-special-card /g) ?? []).length, 3);
  assert.match(vault, /Special video coming soon/);
  assert.doesNotMatch(vault, /youtube-nocookie\.com\/embed|i\.ytimg\.com/, "nothing from YouTube while no special video exists");
  assert.match(vault, /data-condition="perfect:time-compressed"/);
  assert.match(withVault["sitemap.xml"], /\/vault\//);
  assert.match(vault, /href="\/vault\/" aria-current="page"/);
  // Once a real video id is set, the vault uses the click-to-play facade with our own art as poster.
  const withVideo = renderSite({ ...loadDraftCatalog(), special: { cards: [{ ...special.cards[0], video: { youtubeId: "AbCdEfGhIjK" } }] } })["vault/index.html"];
  assert.match(withVideo, /data-facade data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/AbCdEfGhIjK"/);
  assert.doesNotMatch(withVideo, /<iframe|i\.ytimg\.com/);
});

test("once published, the newest episode is featured with a large click-to-play facade", () => {
  let catalog = addVideo(loadDraftCatalog(), "time-compressed", "TESTID00000", new Date("2026-10-12T00:00:00Z"));
  catalog = addVideo(catalog, "the-sun", "TESTID00001", new Date("2026-10-19T00:00:00Z"));
  const home = renderSite(catalog)["index.html"];
  const featured = home.slice(home.indexOf('id="featured"'), home.indexOf('id="nl-title-home"'));
  assert.match(featured, /Newest episode · No\. 02/);
  assert.match(featured, /<div class="facade" data-facade data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/TESTID00001"/);
  assert.doesNotMatch(featured, /<iframe/);
  assert.match(featured, /Watch on YouTube/);
});

test("featuredEpisode handles an empty catalog", async () => {
  const { featuredEpisode } = await import("../tools/lib/site.mjs");
  assert.equal(featuredEpisode({ episodes: [] }), null);
});

test("the build refuses an invalid special-cards catalogue or missing art", () => {
  const dir = copySite();
  try {
    mkdirSync(join(dir, "assets", "special"), { recursive: true });
    const special = JSON.parse(readFileSync(join(SITE_ROOT, "data", "special-cards.json"), "utf8"));
    writeFileSync(join(dir, "data", "special-cards.json"), JSON.stringify(special));
    assert.throws(() => buildSite(dir), /missing art file \/assets\/special\//);
    writeFileSync(join(dir, "data", "special-cards.json"), JSON.stringify({ cards: [{ ...special.cards[0], video: { youtubeId: "dQw4w9WgXcQ" } }] }));
    assert.throws(() => buildSite(dir), /placeholder\/test video/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
