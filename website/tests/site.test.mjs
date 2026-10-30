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
import { loadCatalog, loadDraftCatalog, withoutArtwork, withLocalizations, withoutLocalizations } from "./fixtures.mjs";
import { embedUrlFor } from "../tools/lib/site.mjs";
const jsonLdBlocks = (page) => [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

/** A throwaway copy of the parts of the site the tools read and write (optionally with a different catalog). */
function copySite({ withArtwork = true, catalog = loadCatalog() } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "dyk-site-"));
  mkdirSync(join(dir, "data"));
  writeFileSync(join(dir, "data", "episodes.json"), `${JSON.stringify(catalog, null, 2)}\n`);
  if (withArtwork) cpSync(join(SITE_ROOT, "assets", "episodes"), join(dir, "assets", "episodes"), { recursive: true });
  return dir;
}

test("the committed pages match data/episodes.json (run npm run build:site)", () => {
  const result = buildSite(SITE_ROOT, { check: true });
  assert.deepEqual({ outdated: result.outdated, stale: result.stale }, { outdated: [], stale: [] });
});

test("a replaced thumbnail gets a new URL, so a week-long asset cache can't keep the old image", () => {
  const dir = copySite();
  try {
    buildSite(dir);
    const versionOf = () => readFileSync(join(dir, "episodes", "food", "index.html"), "utf8").match(/food\/thumb-640\.webp\?v=([0-9a-f]{8}) 640w/)?.[1];
    const before = versionOf();
    assert.ok(before, "the srcset carries a content version");
    writeFileSync(join(dir, "assets", "episodes", "food", "thumb-640.webp"), "replaced artwork");
    buildSite(dir);
    assert.notEqual(versionOf(), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
  for (const r of catalog.requested) assert.match(files[`subject/${r.slug}/index.html`], r.status === "next" ? /[Cc]oming next · in production/ : /vote in the comments/i, r.slug);
  assert.ok(files["episodes/index.html"], "the episodes index page exists");
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/<\/loc>/);
});

test("the shipped site references no test video ids, and only published episodes link to YouTube", () => {
  const catalog = loadCatalog();
  const files = renderSite(catalog);
  const liveIds = catalog.episodes.filter((e) => e.status === "published").map((e) => e.youtubeId);
  for (const [path, contents] of Object.entries(files)) {
    assert.doesNotMatch(contents, /TESTID/, path);
    for (const [, id] of contents.matchAll(/(?:youtube\.com\/watch\?v=|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/g)) assert.ok(liveIds.includes(id), `${path} links to ${id}, which is not a published episode`);
  }
  assert.deepEqual(liveIds, ["Sw1xP57TNTk", "WlClbKXSdSo", "rchexCb48LM", "GkEBiDLa1WY", "a4qHdjL8bok", "_RD_Qz66FCg", "HbsIy38RGvI", "o5NXRlNytjo", "Jjw8_rIPOYA"], "episodes 01, 02 (v2), 03, 04, 05, 06 and 07, plus Medicine 1 and 2, are live");
  assert.match(files["episodes/time-compressed/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/Sw1xP57TNTk"/);
  assert.match(files["episodes/the-sun/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/WlClbKXSdSo"/);
  assert.match(files["episodes/school/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/rchexCb48LM"/);
  assert.match(files["episodes/the-sun/index.html"], /class="next-tile" href="\/episodes\/school\/"/, "episode 02 points on to School");
  assert.match(files["episodes/money/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/GkEBiDLa1WY"/);
  assert.match(files["episodes/school/index.html"], /class="next-tile" href="\/episodes\/money\/"/, "episode 03 points on to Money");
  assert.match(files["episodes/food/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/a4qHdjL8bok"/);
  assert.match(files["episodes/money/index.html"], /class="next-tile" href="\/episodes\/food\/"/, "episode 04 points on to Food");
  assert.match(files["episodes/medicine/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/_RD_Qz66FCg"/);
  assert.match(files["episodes/food/index.html"], /class="next-tile" href="\/episodes\/medicine\/"/, "episode 05 points on to Medicine");
  assert.match(files["episodes/light/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/HbsIy38RGvI"/);
  assert.match(files["episodes/medicine/index.html"], /class="next-tile" href="\/episodes\/light\/"/, "episode 06 points on to Light");
  assert.match(files["episodes/weight/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/o5NXRlNytjo"/);
  assert.match(files["episodes/diabetes/index.html"], /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/Jjw8_rIPOYA"/);
  assert.match(files["episodes/weight/index.html"], /class="next-tile" href="\/episodes\/diabetes\/"><span class="next-kicker">Medicine 2 · play it next<\/span>/, "Medicine 1 points on to Medicine 2");
  const medicine3Tile = /class="next-tile" href="\/subject\/ozempic-mounjaro\/"><span class="next-kicker">Medicine 3 · coming next · in production<\/span><strong>Ozempic &amp; Mounjaro<\/strong><span>What do Ozempic and Mounjaro actually do in the body\?/;
  assert.match(files["episodes/diabetes/index.html"], medicine3Tile, "Medicine 2 teases Medicine 3");
  assert.match(files["episodes/light/index.html"], medicine3Tile, "the newest main episode teases what is in production");
  assert.doesNotMatch(files["subject/diabetes/index.html"], /[Cc]oming next · in production/, "Diabetes is no longer a teaser");
  assert.match(files["subject/diabetes/index.html"], /href="\/episodes\/diabetes\/"/, "the Diabetes subject page links to the live episode");
  assert.match(files["subject/ozempic-mounjaro/index.html"], /Medicine 3 of 10 · coming next · in production/);
  assert.doesNotMatch(files["subject/weight/index.html"], /Coming next · in production/, "Weight is no longer a teaser");
  assert.doesNotMatch(files["subject/light/index.html"], /Coming next · in production/, "Light is no longer a teaser");
  assert.doesNotMatch(files["subject/medicine/index.html"], /Coming next · in production/, "Medicine is no longer a teaser");
  assert.doesNotMatch(files["subject/money/index.html"], /Coming next · in production/, "Money is no longer a teaser");
  assert.doesNotMatch(files["subject/food/index.html"], /Coming next · in production/, "Food is no longer a teaser");
  for (const [path, contents] of Object.entries(files)) assert.doesNotMatch(contents, /WI9P4hHcSoc|XSQmwP_GSEM/, `${path} still names a removed upload`);
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/the-sun\//);
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/school\//);
  assert.match(files["subject/sun/index.html"], /href="\/episodes\/the-sun\/"/, "the Sun subject page links to episode 02");
  assert.match(files["subject/school/index.html"], /href="\/episodes\/school\/"/, "the School subject page links to episode 03");
  assert.match(files["subject/money/index.html"], /href="\/episodes\/money\/"/, "the Money subject page links to episode 04");
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/money\//);
  assert.match(files["subject/food/index.html"], /href="\/episodes\/food\/"/, "the Food subject page links to episode 05");
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/food\//);
  assert.match(files["subject/medicine/index.html"], /href="\/episodes\/medicine\/"/, "the Medicine subject page links to episode 06");
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/medicine\//);
  assert.match(files["subject/light/index.html"], /href="\/episodes\/light\/"/, "the Light subject page links to episode 07");
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/light\//);
  assert.match(files["subject/weight/index.html"], /href="\/episodes\/weight\/"/, "the Weight subject page links to Medicine 1");
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/weight\//);
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/episodes\/diabetes\//);
  assert.match(files["sitemap.xml"], /https:\/\/dexty\.live\/subject\/ozempic-mounjaro\//);
  assert.match(files["index.html"], /Newest sub-episode · Medicine 2 of 10/);
  assert.match(files["index.html"], /href="https:\/\/www\.youtube\.com\/watch\?v=Jjw8_rIPOYA"/, "comment buttons point at the newest video, Medicine 2");
  assert.match(files["collection/index.html"], /sun-answer/);
  assert.match(files["collection/index.html"], /school-answer/);
  assert.match(files["collection/index.html"], /money-answer/);
  assert.match(files["collection/index.html"], /food-answer/);
  assert.match(files["collection/index.html"], /medicine-answer/);
  assert.match(files["collection/index.html"], /light-answer/);
  for (const page of ["episodes/the-sun/index.html", "episodes/time-compressed/index.html", "episodes/school/index.html", "episodes/money/index.html", "episodes/food/index.html", "episodes/medicine/index.html", "episodes/light/index.html", "episodes/weight/index.html", "episodes/diabetes/index.html"]) assert.doesNotMatch(files[page], /Quiz coming soon|pill-soon/, page);
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

test("an episode with localizations carries them on the facade as escaped JSON; others carry no attribute", () => {
  // Arrange
  const localizations = { ro: { subtitles: "/assets/captions/food/ro.vtt", audio: "https://abc123.public.blob.vercel-storage.com/dub/v1/food/ro.m4a" }, fr: { subtitles: "/assets/captions/food/fr.vtt" } };
  const catalog = withLocalizations(withoutLocalizations(loadCatalog()), "food", localizations);
  // Act
  const files = renderSite(catalog);
  const food = files["episodes/food/index.html"];
  const money = files["episodes/money/index.html"];
  // Assert
  assert.equal(embedUrlFor("a4qHdjL8bok"), "https://www.youtube-nocookie.com/embed/a4qHdjL8bok");
  const attribute = food.match(/data-facade data-embed="[^"]+" data-localizations='([^']*)'/);
  assert.ok(attribute, "food facade has data-localizations right after data-embed");
  assert.equal(attribute[1], escapeHtml(JSON.stringify(localizations)), "quotes are escaped inside the attribute");
  assert.ok(attribute[1].includes("&quot;subtitles&quot;"), "no raw double quote can end the attribute early");
  assert.deepEqual(JSON.parse(attribute[1].replaceAll("&quot;", '"')), localizations, "the browser reads it back as JSON");
  assert.doesNotMatch(money, /data-localizations/);
  assert.match(renderSite(withLocalizations(withoutLocalizations(loadCatalog()), "diabetes", localizations))["index.html"], /data-localizations='/, "the home page features the newest episode with the same facade");
  assert.doesNotMatch(files["episodes/index.html"], /data-localizations/, "cards carry no facade");
  assert.doesNotMatch(food, /<iframe/, "still nothing loads before play");
  assert.doesNotMatch(renderSite(withoutLocalizations(loadCatalog()))["episodes/food/index.html"], /data-localizations/, "the committed catalog has none yet");
});

test("the language picker groups Dexty subtitles/voice-over apart from YouTube's auto-translated captions", () => {
  // Arrange
  const picker = (page) => page.match(/<select data-player-lang>([\s\S]*?)<\/select>/)[1];
  const groups = (select) => [...select.matchAll(/<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>/g)].map(([, label, body]) => ({
    label, options: [...body.matchAll(/<option value="(\w+)"[^>]*>([^<]*)<\/option>/g)].map(([, code, text]) => [code, text]),
  }));
  const withLoc = withLocalizations(withoutLocalizations(loadCatalog()), "food", {
    ro: { subtitles: "/assets/captions/food/ro.vtt", audio: "https://abc123.public.blob.vercel-storage.com/dub/v1/food/ro.m4a" },
    fr: { subtitles: "/assets/captions/food/fr.vtt" },
  });
  // Act
  const withPicker = picker(renderSite(withLoc)["episodes/food/index.html"]);
  const withoutPicker = picker(renderSite(withoutLocalizations(loadCatalog()))["episodes/food/index.html"]);
  // Assert
  assert.match(withPicker, /^\s*<option value="en" lang="en" selected>English<\/option>/);
  assert.deepEqual(groups(withPicker), [
    { label: "Subtitles and voice-over by Dexty", options: [["ro", "Română · subtitles + voice-over"], ["fr", "Français · subtitles"]] },
    { label: "YouTube auto-translated captions", options: [["de", "Deutsch"], ["es", "Español"], ["zh", "中文"], ["it", "Italiano"], ["pt", "Português"]] },
  ]);
  assert.deepEqual(groups(withoutPicker).map((g) => g.label), ["YouTube auto-translated captions"], "no localizations: one group");
  assert.deepEqual(groups(withoutPicker)[0].options.map(([code]) => code), ["ro", "de", "es", "fr", "zh", "it", "pt"]);
});

test("pages carry SEO basics and no inline styles or inline scripts (CSP)", () => {
  const files = renderSite(withoutLocalizations(loadCatalog()));
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
  const dir = copySite({ catalog: withoutArtwork(loadDraftCatalog(), "the-sun") });
  try {
    const out = execFileSync(process.execPath, [join(SITE_ROOT, "tools", "add-video.mjs"), "the-sun", "https://youtu.be/TESTID00001", "--date", "2026-11-01", "--root", dir], { encoding: "utf8" });
    assert.match(out, /Published No\. 02 "The Sun"/);
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
  const home = renderSite(withoutLocalizations(loadCatalog()))["index.html"];
  assert.match(home, /<h1 id="hero-title" class="hero-banner">/);
  assert.match(home, /<img class="hero-banner-img" src="\/assets\/brand\/hero-wide-1600\.jpg" width="1600" height="400" alt="Did You Know That\?" fetchpriority="high"/);
  assert.match(home, /<source type="image\/webp" media="\(max-width: 639px\)" srcset="\/assets\/brand\/hero-tall-800\.webp 800w/);
  assert.match(home, /<link rel="preload" as="image" type="image\/webp" imagesrcset="\/assets\/brand\/hero-tall-800\.webp[^"]*" imagesizes="100vw" media="\(max-width: 639px\)"/);
  assert.match(home, /<link rel="preload" as="image" type="image\/webp" imagesrcset="\/assets\/brand\/hero-wide-1600\.webp[^"]*" imagesizes="min\(100vw, 2160px\)" media="\(min-width: 640px\)"/);
  assert.match(home, /href="https:\/\/www\.youtube\.com\/channel\/UC7j29XhArv5tlRqQj2qAb4Q\?sub_confirmation=1"[^>]*>.*Subscribe on YouTube/);
  for (const file of ["hero-wide-1600.jpg", "hero-wide-1600.webp", "hero-wide-2560.webp", "hero-tall-800.webp", "hero-tall-1200.webp", "hero-tall-1200.jpg"]) {
    assert.ok(existsSync(join(SITE_ROOT, "assets", "brand", file)), file);
  }
  assert.doesNotMatch(renderSite(withoutLocalizations(loadCatalog()))["collection/index.html"], /rel="preload" as="image"/, "only the home page preloads the banner");
});

test("home: hero, newest episode, continue, episodes, daily fact, collection, community, newsletter, search, about", () => {
  const home = renderSite(withoutLocalizations(loadCatalog()))["index.html"];
  const order = ['id="hero-title"', 'id="featured"', 'id="continue"', 'id="series"', 'id="daily"', 'id="collect"', 'id="community"', 'id="nl-title-home"', 'id="map"', 'id="about"'].map((marker) => home.indexOf(marker));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `section order ${order}`);
  const railCards = home.slice(home.indexOf('class="cards rail"'), home.indexOf("card card-next")).match(/class="card accent/g) ?? [];
  assert.equal(railCards.length, loadCatalog().episodes.length, "the rail lists every episode");
});

test("home: the first screen is the newest episode's guess, one tap per answer, before the subscribe button", () => {
  const catalog = loadCatalog();
  const home = renderSite(withoutLocalizations(catalog))["index.html"];
  const episode = catalog.episodes.find((e) => e.slug === "diabetes");
  const hero = home.slice(home.indexOf('id="hero-title"'), home.indexOf('id="featured"'));
  assert.match(hero, new RegExp(`<form class="hero-guess" data-hero-guess data-slug="${episode.slug}" action="/episodes/${episode.slug}/" aria-labelledby="hero-guess-q">`));
  assert.match(hero, /<span>Medicine 2 · Diabetes<\/span>/, "the newest sub-episode is labelled by its series, not a number");
  assert.ok(hero.includes(`id="hero-guess-q">${escapeHtml(episode.quiz.question)}</p>`), "the episode's guess question");
  episode.quiz.options.forEach((option, i) => {
    assert.ok(hero.includes(`<button class="hero-guess-option" type="submit" name="guess" value="${i}">`), `option ${i} is a one-tap button`);
    assert.ok(hero.includes(escapeHtml(option)), `option ${i} text`);
  });
  assert.ok(hero.indexOf("data-hero-guess") < hero.indexOf("Subscribe on YouTube"), "the guess comes before the subscribe button");
  assert.match(hero, /class="how how-strip"/, "the four steps stay, as a compact strip");
  assert.doesNotMatch(hero, /Play the newest episode/, "the guess replaces the old play button");
});

test("episode guess step: a challenge banner for invited friends and a Challenge a friend button after the lock", () => {
  const catalog = loadCatalog();
  const episode = catalog.episodes.at(-1);
  const page = renderSite(withoutLocalizations(catalog))[`episodes/${episode.slug}/index.html`];
  const guess = page.slice(page.indexOf('id="guess"'), page.indexOf('id="player"'));
  assert.match(guess, /<p class="challenge-banner" data-challenge-banner hidden>/, "hidden until a ?vs= link opens the page");
  assert.ok(guess.indexOf("data-challenge-banner") < guess.indexOf("data-quiz-form"), "the banner sits above the guess");
  const after = guess.slice(guess.indexOf("data-quiz-after"));
  assert.match(after, new RegExp(`<div class="challenge" data-challenge data-title="${escapeHtml(episode.title)}" hidden>`));
  assert.match(after, /<button class="btn btn-sub" type="button" data-challenge-share>/);
  assert.match(after, /Challenge a friend/);
  assert.match(after, /data-challenge-result hidden/);
});

test("before anything is published, the next premiere is featured as Premieres soon with its artwork", () => {
  const home = renderSite(loadDraftCatalog())["index.html"];
  const featured = home.slice(home.indexOf('id="featured"'), home.indexOf('id="continue"'));
  assert.match(featured, /Premieres soon · No\. 01/);
  assert.match(featured, /Time, Compressed/);
  assert.match(featured, /\/assets\/episodes\/time-compressed\/thumb-640\.webp/);
  assert.match(featured, /href="\/episodes\/time-compressed\/#guess"[^>]*>.*Guess before it premieres/);
  assert.doesNotMatch(featured, /data-facade|youtube/);
  assert.match(renderSite(loadDraftCatalog())["episodes/time-compressed/index.html"], /<section class="step-panel" id="guess"/);
  const files = renderSite(loadDraftCatalog());
  const ep1 = files["episodes/time-compressed/index.html"];
  assert.match(ep1, /data-questions="8"/);
  assert.match(ep1, /data-quiz-start/);
  assert.match(ep1, /href="#player"[^>]*>.*See the premiere/s, "after the guess, a plain link leads on to the video step");
  assert.match(ep1, /data-quiz-gate/, "the quiz waits for a locked guess");
  assert.match(ep1, /data-quiz-summary/);
  const ep2 = files["episodes/the-sun/index.html"];
  assert.match(ep2, /data-questions="8"/);
  assert.match(ep2, /data-quiz-start/);
  assert.doesNotMatch(ep2, /Quiz coming soon/);
  assert.match(files["collection/index.html"], /150\+ points/);
  assert.match(files["collection/index.html"], /Your rank: <strong data-rank-name>/);
  assert.match(files["collection/index.html"], /points earned · <a href="\/vault\/"><strong data-balance>0<\/strong> to spend in the Vault<\/a>/);
  assert.doesNotMatch(files["collection/index.html"], /Explorer rank:|the The /);
  assert.match(files["collection/index.html"], /Unlocks when you answer its question in the <a href="\/episodes\/the-sun\/">The Sun<\/a> quiz/);
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
  const featured = home.slice(home.indexOf('id="featured"'), home.indexOf('id="continue"'));
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

test("an explainer episode (the Medicine sub-series) drops the main series' seven-mornings wording", () => {
  // Arrange
  const files = renderSite(loadCatalog());
  // Act
  const weight = files["episodes/weight/index.html"];
  const light = files["episodes/light/index.html"];
  // Assert
  assert.match(weight, /One experiment, one mystery — and the answer to your guess at the end\./);
  assert.match(weight, /<p class="section-kicker">One experiment<\/p>\s*<h2 id="ladder-title" class="section-title">The story<\/h2>/);
  assert.doesNotMatch(weight, /Seven mornings|1500 → 2100|You wake up/);
  assert.match(weight, /<span class="era-place">A hospital ward in Maryland<\/span>/, "an explainer scene is labelled with its place only");
  assert.match(light, /You wake up: /, "main-series eras keep the wake-up label");
  assert.match(light, /Seven mornings, one subject — and the answer to your guess at the end\./, "main-series episodes keep their wording");
});

test("the Medicine episode page lists its series in order: live parts link to their pages, the next part is coming next", () => {
  // Arrange
  const files = renderSite(loadCatalog());
  const medicine = files["episodes/medicine/index.html"];
  // Act
  const section = medicine.slice(medicine.indexOf('id="medicine-series"'), medicine.indexOf("</section>", medicine.indexOf('id="medicine-series"')));
  const links = [...section.matchAll(/class="card-link" href="([^"]+)"/g)].map((m) => m[1]);
  const kickers = [...section.matchAll(/<span class="card-kicker">([^<·]+)·/g)].map((m) => m[1].trim());
  // Assert
  assert.match(section, /<h2 id="medicine-series-title" class="section-title">Medicine series<\/h2>/);
  assert.match(section, /2 of 10 out so far\./);
  assert.deepEqual(links, ["/episodes/weight/", "/episodes/diabetes/", "/subject/ozempic-mounjaro/"], "Medicine 1, Medicine 2, then the coming Medicine 3");
  assert.deepEqual(kickers, ["Medicine 1 of 10", "Medicine 2 of 10", "Medicine 3"]);
  assert.match(section, /Medicine 3 · coming next · in production/);
  assert.doesNotMatch(files["episodes/light/index.html"], /id="light-series"/, "an episode without a sub-series has no series section");
});

test("a sub-episode page names its parent, lists its series with itself marked, and is never numbered", () => {
  // Arrange
  const files = renderSite(loadCatalog());
  // Act
  const weight = files["episodes/weight/index.html"];
  const diabetes = files["episodes/diabetes/index.html"];
  // Assert
  assert.match(weight, /<title>Medicine 1 — Weight · Did You Know That\?<\/title>/);
  assert.match(weight, /<a href="\/episodes\/medicine\/">No\. 06 Medicine<\/a> <span aria-hidden="true">\/<\/span> <span aria-current="page">Medicine 1<\/span>/, "breadcrumb runs through No. 06 Medicine");
  assert.match(diabetes, /<p class="ep-kicker">Medicine 2 of 10 · part of <a href="\/episodes\/medicine\/">No\. 06 Medicine<\/a>/);
  assert.match(weight, /<a class="card-link" href="\/episodes\/weight\/" aria-current="page">/, "the series list marks the current part");
  assert.match(weight, /"name":"Did You Know That\? Medicine 1 of 10 — Weight"/, "VideoObject names the part, not a number");
  assert.match(diabetes, /<span class="fact-foot">Medicine 2 · Diabetes<\/span>/, "locked cards are labelled by the series");
  assert.match(diabetes, /data-questions="8"/, "the quiz is still on the page");
  assert.match(diabetes, /data-set-meter="diabetes" data-total="8"/, "the cards step is still on the page");
  for (const [path, contents] of Object.entries(files)) assert.doesNotMatch(contents, /No\. 08|No\. 09/, `${path} numbers a sub-episode`);
});

test("the episodes index groups sub-episodes under Medicine instead of listing them as numbered episodes", () => {
  // Arrange
  const index = renderSite(loadCatalog())["episodes/index.html"];
  // Act
  const grid = index.slice(index.indexOf('aria-label="Episodes"'), index.indexOf("</section>", index.indexOf('aria-label="Episodes"')));
  const series = index.slice(index.indexOf('id="medicine-series"'));
  // Assert
  assert.doesNotMatch(grid, /\/episodes\/weight\/|\/episodes\/diabetes\/|ozempic-mounjaro/, "the main grid holds main episodes only");
  assert.equal([...grid.matchAll(/<span class="card-kicker">No\. \d\d/g)].length, 7, "the seven numbered episodes");
  assert.ok(index.indexOf('id="medicine-series"') > index.indexOf('aria-label="Episodes"'), "the series follows the main grid");
  assert.match(series, /href="\/episodes\/weight\/"[\s\S]*href="\/episodes\/diabetes\/"[\s\S]*href="\/subject\/ozempic-mounjaro\/"/);
});

test("the old /episodes/weight/ URL still resolves to Medicine 1, and Diabetes has its own page", () => {
  // Arrange
  const files = renderSite(loadCatalog());
  const vercel = JSON.parse(readFileSync(join(SITE_ROOT, "vercel.json"), "utf8"));
  // Act
  const weight = files["episodes/weight/index.html"];
  const sources = (vercel.redirects ?? []).map((r) => r.source);
  // Assert
  assert.match(weight, /<link rel="canonical" href="https:\/\/dexty\.live\/episodes\/weight\/">/);
  assert.match(weight, /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/o5NXRlNytjo"/);
  assert.ok(!sources.some((source) => source.startsWith("/episodes")), "no redirect hides an episode page");
  assert.match(files["episodes/diabetes/index.html"], /<link rel="canonical" href="https:\/\/dexty\.live\/episodes\/diabetes\/">/);
});
