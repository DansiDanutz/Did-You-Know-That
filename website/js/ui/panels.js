// Overlay panels: language/audience pickers, inventory and leaderboard.

import { LANGUAGES } from "../i18n/index.js";
import { cardMarkup, enableTilt } from "./card.js";
import { inspectCard } from "./card-inspect.js";
import { cardPoints, totalPoints } from "../lib/points.js";

const MEDALS = ["🥇", "🥈", "🥉"];
const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function pickersMarkup(settings, t) {
  const langs = LANGUAGES.map(
    ({ code, name, flag }) =>
      `<button class="lang-btn${code === settings.lang ? " is-active" : ""}" data-lang="${code}" aria-pressed="${code === settings.lang}">
        <span aria-hidden="true">${flag}</span>${name}</button>`,
  ).join("");
  const audience = (key, icon) => `
    <button class="aud-btn${settings.audience === key ? " is-active" : ""}" data-audience="${key}" aria-pressed="${settings.audience === key}">
      <span class="aud-icon" aria-hidden="true">${icon}</span>
      <b>${t(`aud.${key}`)}</b><small>${t(`aud.${key}Hint`)}</small>
    </button>`;
  return `
    <p class="picker-label">${t("start.lang")}</p>
    <div class="lang-grid">${langs}</div>
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

// Earned cards stay in the library: each one can replay its video or re-open its book.
export function openInventory(layer, { stories, cards, audience, t, onWatch, onRead, onSelect }) {
  const total = totalPoints(cards, audience);
  const slots = stories
    .map((story) => {
      const owned = cards[story.card.id];
      if (owned) {
        const points = cardPoints(owned, audience);
        return `<div class="inv-slot">${cardMarkup(story.card, owned.rarity, { tilt: true, t, points })}
          <div class="inv-actions">
            <button class="btn-gold" data-watch="${story.id}">${t("inv.watch")}</button>
            <button class="btn-ink" data-read="${story.id}">${t("inv.read")}</button>
          </div></div>`;
      }
      return `<div class="inv-slot is-locked"><div class="locked-card"><span>?</span><b>#${story.card.number}</b>
        <small>${story.comingSoon ? t("album.soon") : t("album.notFound")}</small></div></div>`;
    })
    .join("");
  const close = openLayer(
    layer,
    `<div class="panel inventory" role="dialog" aria-modal="true" aria-label="${t("inv.title")}">
      <button class="panel-close" data-close aria-label="${t("album.close")}">✕</button>
      <h2>🎒 ${t("inv.title")}</h2>
      <p class="panel-sub">${t("inv.mode", { audience: t(`aud.${audience}`) })} · ${t("inv.count", { n: Object.keys(cards).length, total: stories.length })}</p>
      <p class="points-total">★ ${t("inv.total", { n: total })}</p>
      <div class="inv-grid">${slots}</div>
    </div>`,
  );
  layer.querySelectorAll(".dyk-card.can-tilt").forEach(enableTilt);
  const runAction = (btn) => {
    close();
    if (btn.dataset.watch) onWatch(btn.dataset.watch);
    else onRead(btn.dataset.read);
  };
  layer.querySelectorAll("[data-watch], [data-read]").forEach((btn) => btn.addEventListener("click", () => runAction(btn)));
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

function joinForm(profile, t) {
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
      ${joinForm(profile, t)}
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
  layer.querySelector("[data-join]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const msg = layer.querySelector(".lb-msg");
    const outcome = await join(new FormData(event.target).get("nickname"));
    msg.textContent = outcome.message;
    if (outcome.ok) refresh();
  });
  refresh();
}

export function openSettings(layer, { settings, t, onPick }) {
  const render = (current) => `
    <div class="panel settings" role="dialog" aria-modal="true" aria-label="${t("settings.title")}">
      <button class="panel-close" data-close aria-label="${t("listen.close")}">✕</button>
      <h2>🌐 ${t("settings.title")}</h2>
      ${pickersMarkup(current, t)}
      <button class="btn-gold" data-close>${t("settings.done")}</button>
    </div>`;
  openLayer(layer, render(settings));
  layer.addEventListener("click", function pick(event) {
    const btn = event.target.closest("[data-lang], [data-audience]");
    if (!btn) return;
    onPick(btn.dataset.lang ? { lang: btn.dataset.lang } : { audience: btn.dataset.audience });
    layer.removeEventListener("click", pick);
  });
}
