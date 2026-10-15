// Lite YouTube facade: no iframe, cookie or request to YouTube until the visitor presses play.
// Episode pages add a Mute toggle and a Language picker ([data-player]). Their choices are kept in this
// browser only and are applied when the player starts. The page talks to the player with the IFrame
// API's own postMessage commands (enablejsapi=1), so no YouTube script is loaded into this page.
// An episode with native narrations (data-narrations) embeds the upload narrated in the chosen language.
import {
  DEFAULT_LANGUAGE, DEFAULT_PREFS, captionTrackFor, languageLabel, loadPrefs, playerCommand, playerSourceFor, playerSrc,
  savePrefs, wantsCaptions,
} from "../lib/player-prefs.js";

const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";
const LISTEN_INTERVAL_MS = 250;
const READY_TIMEOUT_MS = 8000;
const CAPTION_ATTEMPTS = 4;
const PLAYING = 1;

export function init() {
  for (const facade of document.querySelectorAll("[data-facade]")) setUpPlayer(facade);
}

function setUpPlayer(facade) {
  const wrapper = facade.closest("[data-player]");
  const ui = wrapper ? controlsFor(wrapper) : null;
  const narrations = parseNarrations(facade.dataset.narrations);
  const state = {
    prefs: ui ? loadPrefs() : DEFAULT_PREFS, iframe: null, ready: false, apiFailed: false, captionTries: 0, sawPlaying: false, time: 0, nativeNarration: false,
  };

  const start = () => {
    const iframe = document.createElement("iframe");
    const source = playerSourceFor(state.prefs.language, facade.dataset.embed, narrations);
    // A native narration plays like the English original: its own soundtrack, no forced captions.
    const language = source.nativeNarration ? DEFAULT_LANGUAGE : state.prefs.language;
    iframe.src = playerSrc(source.embed, { ...state.prefs, language, origin: location.origin, start: state.time });
    iframe.title = `Did You Know That? — ${facade.dataset.title}`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    Object.assign(state, {
      iframe, ready: false, apiFailed: false, captionTries: 0, sawPlaying: false, loadedMuted: state.prefs.muted, nativeNarration: source.nativeNarration,
    });
    if (ui) connect(state, iframe, () => {
      // No answer from the player: if Mute was pressed meanwhile, reload it with the current choice.
      if (state.prefs.muted !== state.loadedMuted) start();
    });
    facade.replaceChildren(iframe);
    return iframe;
  };

  facade.querySelector("[data-play]")?.addEventListener("click", () => start().focus(), { once: true });
  if (!ui) return;

  window.addEventListener("message", (event) => onPlayerMessage(state, event));
  render(ui, state.prefs, narrations);
  ui.root.hidden = false;

  ui.mute.addEventListener("click", () => {
    state.prefs = savePrefs({ ...state.prefs, muted: !state.prefs.muted });
    render(ui, state.prefs, narrations);
    if (!state.iframe) return;
    if (state.ready) send(state, state.prefs.muted ? "mute" : "unMute");
    else if (state.apiFailed) start(); // The player never answered: reload it with mute=1 / without.
  });

  ui.language.addEventListener("change", () => {
    state.prefs = savePrefs({ ...state.prefs, language: ui.language.value });
    render(ui, state.prefs, narrations);
    // Re-create the embed with the new caption settings (or the other narration's video), from the same
    // moment. Native narrations are separate cuts with their own timing (the Romanian one runs about two
    // minutes longer), so resuming at the same second is approximate; good enough for a language switch.
    if (state.iframe) start();
  });
}

/** data-narrations JSON (language → embed URL) → an object; missing or broken → {}. */
function parseNarrations(json) {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function controlsFor(wrapper) {
  const root = wrapper.querySelector("[data-player-controls]");
  const mute = root?.querySelector("[data-player-mute]");
  const language = root?.querySelector("[data-player-lang]");
  if (!root || !mute || !language) return null;
  return { root, mute, language, icon: mute.querySelector("[data-mute-icon]"), hint: wrapper.querySelector("[data-player-hint]") };
}

function render(ui, prefs, narrations = {}) {
  ui.mute.setAttribute("aria-pressed", String(prefs.muted));
  if (ui.icon) ui.icon.textContent = prefs.muted ? "🔇" : "🔊";
  ui.language.value = prefs.language;
  if (!ui.hint) return;
  ui.hint.hidden = !wantsCaptions(prefs.language);
  ui.hint.textContent = ui.hint.hidden ? "" : hintFor(prefs.language, narrations);
}

function hintFor(language, narrations) {
  const label = languageLabel(language);
  if (playerSourceFor(language, "", narrations).nativeNarration) return `Narration in ${label}.`;
  return `Narration stays English; YouTube auto-translates the captions into ${label}. No captions? Press ⚙ → Subtitles → Auto-translate.`;
}

/** Ask the player to start sending events; give up (and fall back to reloads) if it never answers. */
function connect(state, iframe, onTimeout) {
  let listen = null;
  iframe.addEventListener("load", () => {
    listen = setInterval(() => {
      if (state.ready || state.iframe !== iframe) return clearInterval(listen);
      iframe.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), PLAYER_ORIGIN);
    }, LISTEN_INTERVAL_MS);
  }, { once: true });
  setTimeout(() => {
    clearInterval(listen);
    if (state.ready || state.iframe !== iframe) return;
    state.apiFailed = true;
    onTimeout();
  }, READY_TIMEOUT_MS);
}

function onPlayerMessage(state, event) {
  if (event.origin !== PLAYER_ORIGIN || !state.iframe || event.source !== state.iframe.contentWindow) return;
  let data;
  try {
    data = JSON.parse(event.data);
  } catch {
    return;
  }
  if (data?.event === "onReady" || (data?.event === "initialDelivery" && !state.ready)) {
    state.ready = true;
    send(state, state.prefs.muted ? "mute" : "unMute");
    applyCaptions(state, []);
  }
  if (data?.event === "onStateChange" && data.info === PLAYING) onPlaying(state);
  const info = data?.info;
  if (!info || typeof info !== "object") return;
  if (typeof info.currentTime === "number") state.time = info.currentTime;
  if (info.playerState === PLAYING) onPlaying(state);
  const captions = info.captions;
  if (captions?.tracklist && !isTranslatedTo(captions.track, state.prefs.language)) applyCaptions(state, captions.tracklist);
}

function onPlaying(state) {
  if (state.sawPlaying) return;
  state.sawPlaying = true;
  applyCaptions(state, []);
}

const isTranslatedTo = (track, language) =>
  track?.languageCode === language || track?.translationLanguage?.languageCode === language;

/** Captions in the chosen language (a few tries: the captions module loads after playback starts). Not for a native narration. */
function applyCaptions(state, tracklist) {
  if (state.nativeNarration) return;
  const track = captionTrackFor(state.prefs.language, tracklist);
  if (!track || state.captionTries >= CAPTION_ATTEMPTS) return;
  state.captionTries += 1;
  send(state, "loadModule", ["captions"]);
  send(state, "setOption", ["captions", "track", track]);
}

function send(state, func, args) {
  state.iframe?.contentWindow?.postMessage(playerCommand(func, args), PLAYER_ORIGIN);
}
