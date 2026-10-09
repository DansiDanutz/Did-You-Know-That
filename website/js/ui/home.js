// Audience homes (master plan §12).
// Adults: a calm "Today's Discovery" page — the newest episode first, then
// every other episode grouped by topic. No game map, no ranks.
// Kids: the map stays; a labelled "current adventure" bar gives direct Read /
// Watch buttons so walking is never the only way in.

const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const watchButton = (story, t) =>
  story.youtubeId
    ? `<button class="btn-gold" data-home="watch" data-story="${story.id}">${t("home.watch")}</button>`
    : `<span class="home-soon">${t("home.soon")}</span>`;

function discoveryCard(story, { t, saved, featured = false }) {
  const pub = story.publication;
  return `
    <article class="home-card${featured ? " is-featured" : ""}">
      <p class="home-meta">${t(`topic.${pub.topic}`)} · ${t("home.episode", { n: story.episode })}${pub.durationSeconds ? ` · ${Math.round(pub.durationSeconds / 60)} min` : ""}</p>
      <h3>${escape(story.title)}</h3>
      <p class="home-hook">${escape(story.teaser)}</p>
      <div class="home-actions">
        ${watchButton(story, t)}
        <button class="btn-ink" data-home="read" data-story="${story.id}">${t("home.read")}</button>
        ${saved ? `<span class="home-saved">✓ ${t("home.saved")}</span>` : `<button class="btn-ink" data-home="save" data-story="${story.id}">${t("home.save")}</button>`}
        <a class="btn-ink" href="/e/${escape(pub.slug)}/">${t("home.page")}</a>
      </div>
    </article>`;
}

export function renderAdultHome(host, { stories, isSaved, t }) {
  const episodes = stories.filter((story) => story.publication && !story.comingSoon);
  // Latest discovery = the newest published episode (no daily-release promise); until something is
  // published, the series starts at Episode 1 (drafts never pose as "new").
  const published = episodes.filter((story) => story.youtubeId).sort((a, b) => String(b.publication.publishedAt).localeCompare(String(a.publication.publishedAt)));
  const [today, ...rest] = published.length ? [published[0], ...episodes.filter((story) => story !== published[0])] : [...episodes].sort((a, b) => a.episode - b.episode);
  const topics = [...new Set(rest.map((story) => story.publication.topic))];
  host.innerHTML = today
    ? `<div class="adult-home">
        <h2 class="home-kicker">${t(today.youtubeId ? "home.today" : "home.upcoming")}</h2>
        ${discoveryCard(today, { t, saved: isSaved(today), featured: true })}
        <div class="home-row">
          <button class="btn-gold" data-home="collection">🎒 ${t("home.collection")}</button>
        </div>
        <h2 class="home-kicker">${t("home.archive")}</h2>
        <a class="archive-link" href="/archive/re-reading-trap/"><b>The Re-Reading Trap</b><span>${t("home.archiveNote")}</span></a>
        ${topics.length ? `<h2 class="home-kicker">${t("home.explore")}</h2>` : ""}
        ${topics
          .map(
            (topic) => `<section class="home-topic"><h3>${t(`topic.${topic}`)}</h3>${rest
              .filter((story) => story.publication.topic === topic)
              .map((story) => discoveryCard(story, { t, saved: isSaved(story) }))
              .join("")}</section>`,
          )
          .join("")}
      </div>`
    : `<div class="adult-home"><p class="home-hook">${t("home.none")}</p></div>`;
}

export function renderKidsBar(host, { story, t }) {
  if (!story || story.comingSoon) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = `
    <div class="kids-bar" role="region" aria-label="${t("home.adventure")}">
      <span class="kids-bar-title"><small>${t("home.adventure")}</small>${escape(story.title)}</span>
      <button class="btn-ink" data-home="read" data-story="${story.id}">📖 ${t("home.readKids")}</button>
      ${story.youtubeId ? `<button class="btn-gold" data-home="watch" data-story="${story.id}">▶ ${t("home.watchKids")}</button>` : ""}
      <button class="btn-gold" data-home="mission">🔦 ${t("home.mission")}</button>
    </div>`;
}
