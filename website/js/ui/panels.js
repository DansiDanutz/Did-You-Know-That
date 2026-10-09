// Overlay panels: language/audience pickers, inventory and settings.

import { currentLanguageButton } from "./language-sheet.js";
import { cardMarkup, enableTilt } from "./card.js";
import { inspectCard } from "./card-inspect.js";
import { searchCards } from "../lib/collection.js";
import { ITEMS, MISSIONS, missionStatus } from "../lib/progression.js";
import { DAXTER_SVG } from "./character.js";

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
    <div class="aud-grid">${audience("kids", "🧒")}${audience("adults", "🎓")}</div>
    <label class="picker-label" for="player-name">${t("name.ask")}</label>
    <input id="player-name" class="name-input" data-name type="text" maxlength="20" autocomplete="off" autocapitalize="words"
      value="${(settings.name ?? "").replace(/"/g, "&quot;")}" placeholder="${t("name.placeholder")}" />
    <p class="name-note">🔒 ${t("name.privacy")}</p>`;
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
// Kids: Dexter's wardrobe, equipment looks and workshop (earned in app missions).
const MISSION_NAMES = { "missing-shadow": "The Missing Shadow" }; // English pilot

// Tried and solved stay distinct; neither is presented as mastery.
const missionLines = (explorer, t) =>
  Object.keys(MISSIONS)
    .map((id) => ({ id, status: missionStatus(explorer, id) }))
    .filter(({ status }) => status !== "new")
    .map(({ id, status }) => `<p class="explorer-line">${t(`explorer.${status}`, { name: MISSION_NAMES[id] ?? id })}</p>`)
    .join("");

function explorerSection(explorer, t) {
  if (!explorer) return "";
  const owned = Object.keys(explorer.owned);
  if (!owned.length) return `<section class="explorer-panel"><h3>🧭 ${t("explorer.title")}</h3><p>${t("explorer.empty")}</p>${missionLines(explorer, t)}</section>`;
  const outfits = owned.filter((id) => ITEMS[id].kind === "outfit");
  const gear = owned.filter((id) => ITEMS[id].kind === "equipment");
  return `<section class="explorer-panel"><h3>🧭 ${t("explorer.title")}</h3>
    <div class="outfit-row">${outfits.map((id) => `<button class="outfit-choice${explorer.appearance.outfit === id ? " is-worn" : ""}" type="button" data-equip="${id}" aria-pressed="${explorer.appearance.outfit === id}"><span class="outfit-preview outfit-${id}">${DAXTER_SVG}</span><b>${ITEMS[id].name}</b></button>`).join("")}</div>
    <p class="explorer-line">🔦 ${gear.map((id) => ITEMS[id].name).join(" · ")}</p>
    ${missionLines(explorer, t)}
    <p class="explorer-line">🏠 ${t("explorer.workshop")}: ${explorer.workshop.map((id) => ITEMS[id].name).join(" · ")}</p></section>`;
}

export function openInventory(layer, { stories, cards, audience, t, explorer, practised = new Set(), onEquip, onWatch, onRead, onShare, onSelect }) {
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
      <p class="inv-status">${t("inv.saved")}${practised.has(story.id) ? ` · ${t("inv.practised")}` : ""}</p>
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
      ${explorerSection(explorer, t)}
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
  layer.querySelectorAll("[data-equip]").forEach((btn) => btn.addEventListener("click", () => onEquip?.(btn.dataset.equip)));
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
        closeLabel: t("listen.close"),
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
      <p class="parents-link"><a href="/parents/">👪 ${t("parents.link")}</a></p>
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
  layer.querySelector("[data-name]").addEventListener("change", (event) => onPick({ name: event.target.value }));
  layer.addEventListener("click", function pick(event) {
    const btn = event.target.closest("[data-audience]");
    if (!btn) return;
    onPick({ audience: btn.dataset.audience });
    layer.removeEventListener("click", pick);
  });
}
