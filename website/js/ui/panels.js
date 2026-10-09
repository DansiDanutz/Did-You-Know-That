// Overlay panels: language/audience pickers, inventory and leaderboard.

import { kidNickname, isKidNickname } from "../lib/kid-names.js";
import { currentLanguageButton } from "./language-sheet.js";
import { cardMarkup, enableTilt } from "./card.js";
import { inspectCard } from "./card-inspect.js";
import { searchCards } from "../lib/collection.js";

const MEDALS = ["🥇", "🥈", "🥉"];
const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function pickersMarkup(settings, t) {
  const audience = (key, icon) => `
    <button class="aud-btn${settings.audience === key ? " is-active" : ""}" data-audience="${key}" aria-pressed="${settings.audience === key}">
      <span class="aud-icon" aria-hidden="true">${icon}</span>
      <b>${t(`aud.${key}`)}</b><small>${t(`aud.${key}Hint`)}</small>
    </button>`;
  return `
    <p class="picker-label">${t("start.lang")}</p>
    ${currentLanguageButton(settings.lang, t)}
    <p class="picker-label">${t("start.audience")}</p>
    <div class="aud-grid">${audience("kids", "🧒")}${audience("adults", "🎓")}</div>`;
}

function openLayer(layer, html, onClose) {
  layer.innerHTML = html;
  layer.hidden = false;
  requestAnimationFrame(() => layer.classList.add("is-open"));
  const close = () => {
    layer.classList.remove("is-open");
    setTimeout(() => {
      layer.hidden = true;
      layer.innerHTML = "";
      onClose?.();
    }, 300);
  };
  layer.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", close));
  return close;
}

// Saved cards stay in the library: each one can replay its video, re-open its
// book or share its public discovery page. Search and topic filters help once
// the collection grows; no points, ranks or rarity ladders.
export function openInventory(layer, { stories, cards, audience, t, onWatch, onRead, onShare, onSelect }) {
  const saved = stories.filter((story) => cards[story.card.id]);
  const topics = [...new Set(saved.map((story) => story.publication?.topic).filter(Boolean))];
  const entry = (story) => ({ cardId: story.card.id, title: story.card.name, summary: story.card.fact, topic: story.publication?.topic ?? "" });
  const slot = (story) => {
    const owned = cards[story.card.id];
    if (!owned) {
      return `<div class="inv-slot is-locked"><div class="locked-card"><span>?</span><b>#${story.card.number}</b>
        <small>${story.comingSoon ? t("album.soon") : t("album.notFound")}</small></div></div>`;
    }
    const share = story.publication?.slug ? `<button class="btn-ink" data-share="${story.id}">${t("inv.share")}</button>` : "";
    return `<div class="inv-slot" data-card="${story.card.id}">${cardMarkup(story.card, owned.rarity, { tilt: true, t, firstSeason: owned.firstSeason })}
      <div class="inv-actions">
        ${story.youtubeId ? `<button class="btn-gold" data-watch="${story.id}">${t("inv.watch")}</button>` : ""}
        <button class="btn-ink" data-read="${story.id}">${t("inv.read")}</button>
        ${share}
      </div></div>`;
  };
  const tools = saved.length > 1
    ? `<div class="inv-tools" role="search">
        <label class="visually-hidden" for="inv-search">${t("inv.search")}</label>
        <input id="inv-search" type="search" placeholder="${t("inv.search")}" autocomplete="off" />
        <div class="inv-topics">
          <button class="chip is-active" data-topic="" aria-pressed="true">${t("inv.allTopics")}</button>
          ${topics.map((topic) => `<button class="chip" data-topic="${topic}" aria-pressed="false">${t(`topic.${topic}`)}</button>`).join("")}
        </div>
      </div>`
    : "";
  const empty = saved.length === 0 ? `<p class="inv-empty">${t("inv.empty")}</p>` : "";
  const close = openLayer(
    layer,
    `<div class="panel inventory" role="dialog" aria-modal="true" aria-label="${t("inv.title")}">
      <button class="panel-close" data-close aria-label="${t("album.close")}">✕</button>
      <h2>🎒 ${t("inv.title")}</h2>
      <p class="panel-sub">${t("inv.mode", { audience: t(`aud.${audience}`) })} · ${t("inv.count", { n: saved.length, total: stories.length })}</p>
      ${tools}
      ${empty}
      <p class="inv-nomatch" hidden>${t("inv.noMatch")}</p>
      <div class="inv-grid">${stories.map(slot).join("")}</div>
    </div>`,
  );
  let filter = { query: "", topic: "" };
  const applyFilter = () => {
    const shown = new Set(searchCards(saved.map(entry), filter).map((card) => card.cardId));
    const filtering = Boolean(filter.query || filter.topic);
    layer.querySelectorAll(".inv-slot").forEach((el) => {
      el.hidden = filtering && !shown.has(el.dataset.card);
    });
    layer.querySelector(".inv-nomatch").hidden = !filtering || shown.size > 0;
  };
  layer.querySelector("#inv-search")?.addEventListener("input", (event) => {
    filter = { ...filter, query: event.target.value };
    applyFilter();
  });
  layer.querySelectorAll("[data-topic]").forEach((chip) =>
    chip.addEventListener("click", () => {
      filter = { ...filter, topic: chip.dataset.topic };
      layer.querySelectorAll("[data-topic]").forEach((other) => {
        other.classList.toggle("is-active", other === chip);
        other.setAttribute("aria-pressed", String(other === chip));
      });
      applyFilter();
    }),
  );
  layer.querySelectorAll(".dyk-card.can-tilt").forEach(enableTilt);
  const runAction = (btn) => {
    close();
    if (btn.dataset.watch) onWatch(btn.dataset.watch);
    else if (btn.dataset.share) onShare(btn.dataset.share);
    else onRead(btn.dataset.read);
  };
  layer.querySelectorAll("[data-watch], [data-read], [data-share]").forEach((btn) => btn.addEventListener("click", () => runAction(btn)));
  layer.querySelectorAll(".inv-slot:not(.is-locked) .dyk-card").forEach((card) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    const open = () =>
      inspectCard(card, {
        actionsHtml: card.closest(".inv-slot").querySelector(".inv-actions").innerHTML,
        onSettled: onSelect,
        onAction: runAction,
      });
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function boardRows(data, t) {
  if (!data.top.length) return `<p class="lb-empty">${t("lb.empty")}</p>`;
  const rows = data.top
    .map(
      (row) => `<li class="lb-row${row.isYou ? " is-you" : ""}">
        <span class="lb-rank">${MEDALS[row.rank - 1] ?? `#${row.rank}`}</span>
        <span class="lb-nick">${escapeHtml(row.nickname)}${row.isYou ? ` <em>(${t("lb.you")})</em>` : ""}</span>
        <span class="lb-cards">${t("lb.cards", { n: row.cards })}</span>
        <span class="lb-points">★ ${row.points}</span>
      </li>`,
    )
    .join("");
  const me = data.me && !data.top.some((r) => r.isYou) ? `<p class="lb-me">${t("lb.rank", { rank: data.me.rank })} · ★ ${data.me.points}</p>` : "";
  return `<ol class="lb-list">${rows}</ol>${me}`;
}

function joinForm(profile, t, audience) {
  if (audience === "kids") return kidsJoinForm(profile, t);
  return `
    <form class="lb-join" data-join>
      <label for="lb-nick">${profile.nickname ? t("lb.change") : t("lb.join")}</label>
      <div class="secret-row">
        <input id="lb-nick" name="nickname" maxlength="16" autocomplete="off" value="${escapeHtml(profile.nickname)}" placeholder="${t("lb.nickname")}" />
        <button class="btn-gold" type="submit">${t("lb.save")}</button>
      </div>
      <small>${t("lb.rules")}</small>
      <p class="lb-msg" aria-live="polite"></p>
    </form>`;
}

// Kids pick a made-up explorer name; there is no text box to type into.
function kidsJoinForm(profile, t) {
  // Never show a typed (possibly real) name on the kids board: only generated ones.
  const name = isKidNickname(profile.nickname) ? profile.nickname : kidNickname();
  return `
    <form class="lb-join is-kids" data-join>
      <label>${t("lb.kidsJoin")}</label>
      <input type="hidden" name="nickname" value="${escapeHtml(name)}" />
      <p class="lb-kid-name" aria-live="polite">${escapeHtml(name)}</p>
      <div class="secret-row">
        <button class="btn-ink" type="button" data-shuffle>${t("lb.shuffle")}</button>
        <button class="btn-gold" type="submit">${t("lb.save")}</button>
      </div>
      <small>${t("lb.kidsRules")}</small>
      <p class="lb-msg" aria-live="polite"></p>
    </form>`;
}

// `load(audience)` and `join(nickname)` are supplied by the app.
export function openLeaderboard(layer, { audience, profile, t, load, join }) {
  let board = audience;
  openLayer(
    layer,
    `<div class="panel leaderboard" role="dialog" aria-modal="true" aria-label="${t("lb.title")}">
      <button class="panel-close" data-close aria-label="${t("album.close")}">✕</button>
      <h2>🏆 ${t("lb.title")}</h2>
      <div class="lb-tabs" role="tablist">
        <button role="tab" data-board="kids">🧒 ${t("aud.kids")}</button>
        <button role="tab" data-board="adults">🎓 ${t("aud.adults")}</button>
      </div>
      <div class="lb-body" aria-live="polite"></div>
      ${joinForm(profile, t, audience)}
    </div>`,
  );
  const body = layer.querySelector(".lb-body");
  const refresh = async () => {
    layer.querySelectorAll("[data-board]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.board === board)));
    body.innerHTML = `<p class="lb-empty">${t("lb.loading")}</p>`;
    const result = await load(board);
    body.innerHTML = result.ok ? boardRows(result.data, t) : `<p class="lb-empty">📡 ${t("lb.offline")}</p>`;
  };
  layer.querySelectorAll("[data-board]").forEach((tab) =>
    tab.addEventListener("click", () => {
      board = tab.dataset.board;
      refresh();
    }),
  );
  layer.querySelector("[data-shuffle]")?.addEventListener("click", () => {
    const name = kidNickname();
    layer.querySelector('[data-join] input[name="nickname"]').value = name;
    layer.querySelector(".lb-kid-name").textContent = name;
  });
  layer.querySelector("[data-join]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const msg = layer.querySelector(".lb-msg");
    const outcome = await join(new FormData(event.target).get("nickname"));
    msg.textContent = outcome.message;
    if (outcome.ok) refresh();
  });
  refresh();
}

export function openSettings(layer, { settings, t, muted, onPick, onOpenLanguage, onToggleSound, onExport, onImport }) {
  const render = (current) => `
    <div class="panel settings" role="dialog" aria-modal="true" aria-label="${t("settings.title")}">
      <button class="panel-close" data-close aria-label="${t("listen.close")}">✕</button>
      <h2>⚙️ ${t("settings.title")}</h2>
      ${pickersMarkup(current, t)}
      <p class="picker-label">${t("settings.sound")}</p>
      <button class="setting-row" type="button" role="switch" data-sound aria-checked="${!muted}">
        <span>${muted ? "🔇" : "🔊"} ${t("settings.sound")}</span><span class="switch${muted ? "" : " is-on"}" aria-hidden="true"><i></i></span>
      </button>
      <section class="backup" aria-labelledby="backup-title">
        <p class="picker-label" id="backup-title">${t("backup.title")}</p>
        <p class="backup-note">${t("backup.note")}</p>
        <div class="backup-row">
          <button class="btn-ink" type="button" data-export>${t("backup.export")}</button>
          <label class="btn-ink backup-import">${t("backup.import")}<input type="file" accept="application/json,.json" data-import hidden /></label>
        </div>
        <p class="backup-msg" aria-live="polite"></p>
      </section>
      <button class="btn-gold" data-close>${t("settings.done")}</button>
    </div>`;
  openLayer(layer, render(settings));
  const message = (text) => (layer.querySelector(".backup-msg").textContent = text);
  layer.querySelector("[data-export]").addEventListener("click", () => message(onExport()));
  layer.querySelector("[data-import]").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) message(await onImport(file));
  });
  layer.querySelector("[data-open-lang]").addEventListener("click", onOpenLanguage);
  layer.querySelector("[data-sound]").addEventListener("click", onToggleSound);
  layer.addEventListener("click", function pick(event) {
    const btn = event.target.closest("[data-audience]");
    if (!btn) return;
    onPick({ audience: btn.dataset.audience });
    layer.removeEventListener("click", pick);
  });
}
