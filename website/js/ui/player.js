// Lite YouTube facade: no iframe, cookie or request to YouTube until the visitor presses play.
// Episode pages add a Mute toggle and a Language picker ([data-player]). Their choices are kept in this
// browser only and are applied when the player starts. The page talks to the player with the IFrame
// API's own postMessage commands (enablejsapi=1), so no YouTube script is loaded into this page.
//
// Languages with a localization for the episode (data-localizations) get our own subtitles over the
// video; muting the English then plays the language's voice-over audio in sync (js/ui/player-dub.js)
// when the episode has one. Other languages keep YouTube's auto-translated captions.
import {
  DEFAULT_LANGUAGE, DEFAULT_PREFS, captionTrackFor, loadPrefs, playerCommand, playerSrc, savePrefs, wantsCaptions, youtubeLanguage,
} from "../lib/player-prefs.js";
import { parseLocalizations, localizationFor, hintText } from "../lib/localizations.js";
import { estimateTime, YT_PLAYING } from "../lib/dub-sync.js";
import { createSubtitles } from "./player-subs.js";
import { createDub } from "./player-dub.js";

const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";
const LISTEN_INTERVAL_MS = 250;
const READY_TIMEOUT_MS = 8000;
const CAPTION_ATTEMPTS = 4;
const TICK_MS = 100; // subtitle and voice-over sync cadence (the player itself reports every ~250 ms)
const UNSTARTED = -1;

export function init() {
  for (const facade of document.querySelectorAll("[data-facade]")) setUpPlayer(facade);
}

function setUpPlayer(facade) {
  const wrapper = facade.closest("[data-player]");
  const ui = wrapper ? controlsFor(wrapper) : null;
  const localizations = parseLocalizations(facade.dataset.localizations);
  const state = {
    prefs: ui ? loadPrefs() : DEFAULT_PREFS, iframe: null, ready: false, apiFailed: false, captionTries: 0, sawPlaying: false,
    time: 0, timeAt: 0, ytState: UNSTARTED, subtitlesFailed: false, subtitlesFor: null, ownSubtitles: false,
  };
  const stage = wrapper?.querySelector("[data-player-stage]") ?? facade.parentElement;
  const overlay = ui ? overlayFor(stage, () => resumeVoiceOver()) : null;
  const subs = overlay ? createSubtitles(overlay.subs) : null;
  const dub = overlay ? createDub({ onBlocked: (blocked) => void (overlay.tap.hidden = !blocked) }) : null;
  const localization = () => localizationFor(localizations, state.prefs.language);
  const wantsVoiceOver = () => Boolean(state.prefs.muted && localization()?.audio);
  const videoTime = () => estimateTime({ time: state.time, at: state.timeAt, playing: state.ytState === YT_PLAYING }, performance.now());
  let ticker = null;

  const tick = () => {
    const ytTime = videoTime();
    subs.update(ytTime);
    dub.sync({ ytState: state.ytState, ytTime, wantAudio: wantsVoiceOver(), now: performance.now() });
  };

  /** Everything that follows from the language, the mute choice and whether the player runs. */
  const refresh = () => {
    const loc = localization();
    render(ui, state.prefs, loc, state.subtitlesFailed);
    overlay.fullscreen.hidden = !(loc && state.iframe && canFullscreen(stage));
    if (wantsVoiceOver()) dub.setSource(loc.audio);
    else dub.stop();
    const running = Boolean(loc && state.iframe);
    if (running && !ticker) ticker = setInterval(tick, TICK_MS);
    if (!running && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };

  /** Our subtitles for the chosen language, fetched the first time it is used (a failure only hides them). */
  const ensureSubtitles = async () => {
    const { language } = state.prefs;
    const loc = localization();
    if (state.subtitlesFor === language) return;
    state.subtitlesFor = language;
    state.subtitlesFailed = false;
    if (!loc) return subs.clear();
    const loaded = await subs.select(language, loc.subtitles);
    if (state.prefs.language !== language) return;
    state.subtitlesFailed = !loaded;
    refresh();
  };

  const resumeVoiceOver = () => dub.resume(videoTime());

  const start = () => {
    if (state.iframe) state.time = videoTime();
    const iframe = document.createElement("iframe");
    const loc = localization();
    // Our subtitles replace YouTube's captions; and the iframe's own fullscreen would hide them, so
    // there our fullscreen button takes over (where the browser can fullscreen a page element).
    const ownSubtitles = Boolean(loc);
    iframe.src = playerSrc(facade.dataset.embed, { ...state.prefs, language: ownSubtitles ? DEFAULT_LANGUAGE : state.prefs.language, origin: location.origin, start: state.time });
    iframe.title = `Did You Know That? — ${facade.dataset.title}`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = !(ownSubtitles && canFullscreen(stage));
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    Object.assign(state, {
      iframe, ready: false, apiFailed: false, captionTries: 0, sawPlaying: false, loadedMuted: state.prefs.muted, ytState: UNSTARTED, timeAt: performance.now(), ownSubtitles,
    });
    if (ui) connect(state, iframe, () => {
      // No answer from the player: if Mute was pressed meanwhile, reload it with the current choice.
      if (state.prefs.muted !== state.loadedMuted) start();
    });
    facade.replaceChildren(iframe);
    if (ui) {
      ensureSubtitles();
      refresh();
    }
    return iframe;
  };

  facade.querySelector("[data-play]")?.addEventListener("click", () => start().focus(), { once: true });
  if (!ui) return;

  window.addEventListener("message", (event) => onPlayerMessage(state, event));
  overlay.fullscreen.addEventListener("click", () => toggleFullscreen(stage));
  watchFullscreen(stage, overlay.fullscreen);
  refresh();
  ui.root.hidden = false;

  ui.mute.addEventListener("click", () => {
    state.prefs = savePrefs({ ...state.prefs, muted: !state.prefs.muted });
    refresh();
    if (!state.iframe) return;
    if (state.ready) send(state, state.prefs.muted ? "mute" : "unMute");
    else if (state.apiFailed) start(); // The player never answered: reload it with mute=1 / without.
  });

  ui.language.addEventListener("change", () => {
    state.prefs = savePrefs({ ...state.prefs, language: ui.language.value });
    state.subtitlesFor = null;
    dub.stop();
    subs.clear();
    // Re-create the embed with the new caption / fullscreen settings, from the same moment.
    if (state.iframe) start();
    else refresh();
    ensureSubtitles();
  });
}

function controlsFor(wrapper) {
  const root = wrapper.querySelector("[data-player-controls]");
  const mute = root?.querySelector("[data-player-mute]");
  const language = root?.querySelector("[data-player-lang]");
  if (!root || !mute || !language) return null;
  return { root, mute, language, icon: mute.querySelector("[data-mute-icon]"), hint: wrapper.querySelector("[data-player-hint]") };
}

/** The subtitle box, the fullscreen button and the "tap to hear" button, all inside the player stage. */
function overlayFor(stage, onTap) {
  const subs = document.createElement("div");
  subs.className = "player-subs";
  subs.setAttribute("aria-live", "off");
  subs.hidden = true;
  const fullscreen = document.createElement("button");
  fullscreen.type = "button";
  fullscreen.className = "player-fs";
  fullscreen.setAttribute("aria-label", "Fullscreen");
  fullscreen.setAttribute("aria-pressed", "false");
  fullscreen.textContent = "⛶";
  fullscreen.hidden = true;
  const tap = document.createElement("button");
  tap.type = "button";
  tap.className = "btn btn-small player-tap";
  tap.textContent = "Tap to hear the voice-over";
  tap.hidden = true;
  tap.addEventListener("click", onTap);
  stage.append(subs, fullscreen, tap);
  return { subs, fullscreen, tap };
}

const canFullscreen = (stage) =>
  document.fullscreenEnabled !== false && (typeof stage.requestFullscreen === "function" || typeof stage.webkitRequestFullscreen === "function");
const fullscreenElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;

function toggleFullscreen(stage) {
  const request = stage.requestFullscreen ?? stage.webkitRequestFullscreen;
  const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
  const result = fullscreenElement() ? exit?.call(document) : request?.call(stage);
  result?.catch?.(() => undefined);
}

function watchFullscreen(stage, button) {
  const update = () => button.setAttribute("aria-pressed", String(fullscreenElement() === stage));
  document.addEventListener("fullscreenchange", update);
  document.addEventListener("webkitfullscreenchange", update);
}

function render(ui, prefs, loc, subtitlesFailed) {
  ui.mute.setAttribute("aria-pressed", String(prefs.muted));
  if (ui.icon) ui.icon.textContent = prefs.muted ? "🔇" : "🔊";
  ui.language.value = prefs.language;
  if (!ui.hint) return;
  ui.hint.hidden = !wantsCaptions(prefs.language);
  ui.hint.textContent = ui.hint.hidden ? "" : hintText({ language: prefs.language, loc, muted: prefs.muted, subtitlesFailed });
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
  if (data?.event === "onStateChange" && typeof data.info === "number") {
    state.ytState = data.info;
    if (data.info === YT_PLAYING) onPlaying(state);
  }
  const info = data?.info;
  if (!info || typeof info !== "object") return;
  if (typeof info.currentTime === "number") {
    state.time = info.currentTime;
    state.timeAt = performance.now();
  }
  if (typeof info.playerState === "number") state.ytState = info.playerState;
  if (info.playerState === YT_PLAYING) onPlaying(state);
  const captions = info.captions;
  if (captions?.tracklist && !isTranslatedTo(captions.track, state.prefs.language)) applyCaptions(state, captions.tracklist);
}

function onPlaying(state) {
  if (state.sawPlaying) return;
  state.sawPlaying = true;
  applyCaptions(state, []);
}

const isTranslatedTo = (track, language) =>
  track?.languageCode === youtubeLanguage(language) || track?.translationLanguage?.languageCode === youtubeLanguage(language);

/** YouTube's captions in the chosen language (a few tries: the captions module loads after playback starts). Not with our own subtitles. */
function applyCaptions(state, tracklist) {
  if (state.ownSubtitles) return;
  const track = captionTrackFor(state.prefs.language, tracklist);
  if (!track || state.captionTries >= CAPTION_ATTEMPTS) return;
  state.captionTries += 1;
  send(state, "loadModule", ["captions"]);
  send(state, "setOption", ["captions", "track", track]);
}

function send(state, func, args) {
  state.iframe?.contentWindow?.postMessage(playerCommand(func, args), PLAYER_ORIGIN);
}
