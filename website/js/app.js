import { STORIES, CHANNEL_URL } from "./data/stories.js";
import { LOCALES, createTranslator, detectLanguage } from "./i18n/index.js";
import { localizeStory } from "./lib/localize.js";
import { createStore, normalizeSettings } from "./lib/storage.js";
import { withStorageLock } from "./lib/storage-lock.js";
import { saveCard, isSaved, withCoin, recordQuiz, recordBonusWord, cardsView, makeBackup, parseBackup } from "./lib/collection.js";
import { quizPoints, maxSparks } from "./lib/scoring.js";
import { verifySecret } from "./lib/secret.js";
import { emptyDays, todayKey, canWatch, registerVideo, videosLeft, DAILY_VIDEOS } from "./lib/daily-limit.js";
import { currentHouseIndex, houseStatus } from "./lib/journey.js";
import { createWorld } from "./ui/world.js";
import { createBook } from "./ui/book.js";
import { buildFaces, renderFace, isFaceComplete, BLOCKED_HINT } from "./ui/pages.js";
import { openListening } from "./ui/gate.js";
import { flagSvg } from "./ui/flags.js";
import { openLanguageSheet, languageName } from "./ui/language-sheet.js";
import { setupInstall } from "./ui/install.js";
import { renderAdultHome, renderKidsBar } from "./ui/home.js";
import { openMission } from "./ui/mission.js";
import { cleanName, personalize } from "./lib/player-name.js";
import { greetingClips, nameIndexPath } from "./lib/name-voice.js";
import { completeMission, recordAttempt, recordHint, equip } from "./lib/progression.js";
import { setupModalFocus } from "./ui/modal-focus.js";
import { greetingKey } from "./lib/greeting.js";
import { revealCard } from "./ui/card.js";
import { pickersMarkup, openInventory, openSettings } from "./ui/panels.js";
import { DAXTER_SVG } from "./ui/character.js";
import { createSfx } from "./ui/sfx.js";
import { createNarrator } from "./ui/narrator.js";
import { coinsOnRoad, COINS_PER_CARD } from "./lib/coins.js";
import { narrationFor } from "./lib/narration.js";

const $ = (sel) => document.querySelector(sel);
const KNOCK_MS = 750;
const CHEER_MS = 1300;
const TOAST_MS = 2800;

const sfx = createSfx();
const narrator = createNarrator({ onReady: () => updateReadButtons() });
const VOICE_KEY = "dykt-voice";
let reading = true; // the storyteller reads every page as it turns; the button stops it
let voice = readVoice();
let currentFaces = [];
let install = null; // the "Install the app" button controller
let narratedFaces = new Set(); // instruction pages already spoken in this book
// Pages that explain what to do are always spoken, even with Read aloud off.
const INSTRUCTION_FACES = new Set(["inside", "mission", "gate", "quiz", "reward"]);

function readVoice() {
  try {
    return localStorage.getItem(VOICE_KEY) === "female" ? "female" : "male";
  } catch {
    return "male";
  }
}
const store = createStore(safeLocalStorage());
let settings = store.loadSettings(detectLanguage(navigator.languages));
// A discovery page can link to /?audience=adults&story=<id>: keep that context.
const linkParams = new URLSearchParams(location.search);
if (["kids", "adults"].includes(linkParams.get("audience"))) settings = { ...settings, audience: linkParams.get("audience") };
const linkedStoryId = linkParams.get("story");
let profile = store.loadProfile(() => crypto.randomUUID());
// Saved cards and the private learning record (migrated once from the old progress).
let { collection, learning } = store.loadCollection(new Date().toISOString());
// Outfits, equipment looks, workshop and mission state (independent app missions only).
let explorer = store.loadExplorer();
let sessions = new Map();
let t = createTranslator(settings.lang);
let stories = localizeAll();
let openStory = null;
let book = null;
let daxterAt = -1;
let busy = false;

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function localizeAll() {
  return STORIES.map((story) => localizeStory(story, LOCALES[settings.lang], LOCALES.en, settings.audience));
}

const view = () => ({ cards: cardsView(collection, settings.audience) });
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------- session state

const sessionKey = (story) => `${story.id}:${settings.audience}`;

function session(story) {
  return (
    sessions.get(sessionKey(story)) ?? {
      sparks: new Set(),
      quiz: {},
      gateOpen: Boolean(learning[story.id]?.bonusWordAt),
      cardClaimed: isSaved(collection, settings.audience, story.card.id),
      gateMessage: "",
    }
  );
}

function setSession(story, patch) {
  sessions = new Map(sessions).set(sessionKey(story), { ...session(story), ...patch });
}

function score(story) {
  const s = session(story);
  const quizScore = Object.values(s.quiz).reduce((sum, q) => sum + (q.solved ? quizPoints(q.picked.length) : 0), 0);
  const sparkCount = s.sparks.size + quizScore;
  const max = maxSparks(story.pages);
  return { sparkCount, max };
}

// The look of a story's card: its first-season rarity if it was earned
// before cards became free to save, otherwise the one discovery style.
const cardStyle = (story) => view().cards[story.card.id]?.rarity ?? "gold";

// Every change is applied to the latest stored data under a cross-tab lock
// (another tab's saves are never overwritten). If the browser refuses to
// store anything, the player is told once that saves last for this visit only.
let storageWarned = false;
function warnIfNotPersisted(persisted) {
  if (persisted || storageWarned) return;
  storageWarned = true;
  toast(t("storage.sessionOnly"));
}

async function changeCollection(operation) {
  const result = await withStorageLock(() => store.updateCollection(operation, nowIso()));
  collection = result.collection;
  updateHud();
  warnIfNotPersisted(result.persisted);
  return result.persisted;
}

async function changeExplorer(operation) {
  const result = await withStorageLock(() => store.updateExplorer(operation));
  explorer = result.explorer;
  applyOutfit();
  warnIfNotPersisted(result.persisted);
  return result.persisted;
}

// Dexter wears the outfit the child chose (map, start screen, previews).
function applyOutfit() {
  document.querySelectorAll(".daxter, #start-daxter").forEach((el) => {
    [...el.classList].filter((name) => name.startsWith("outfit-")).forEach((name) => el.classList.remove(name));
    if (explorer.appearance.outfit) el.classList.add(`outfit-${explorer.appearance.outfit}`);
  });
}

const SHADOW_MISSION = "missing-shadow";
function showMission() {
  openMission($("#mission-layer"), {
    completed: Boolean(explorer.missions[SHADOW_MISSION]?.completedAt),
    playerName: settings.name,
    onAttempt: () => changeExplorer((state) => recordAttempt(state, SHADOW_MISSION, nowIso())),
    onHint: () => changeExplorer((state) => recordHint(state, SHADOW_MISSION)),
    onComplete: (choice) => changeExplorer((state) => equip(completeMission(state, SHADOW_MISSION, { choice }, nowIso()), choice)),
    onClose: () => renderHome(),
  });
}

async function changeLearning(operation) {
  const result = await withStorageLock(() => store.updateLearning(operation));
  learning = result.learning;
  warnIfNotPersisted(result.persisted);
  return result.persisted;
}

// ---------------------------------------------------------------- text + HUD

function applyStaticText() {
  document.documentElement.lang = settings.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
}

function updateHud() {
  const owned = Object.keys(view().cards).length;
  $("#hud-cards").textContent = `${owned}/${STORIES.length}`;
  $("#hud-coins").textContent = `🪙 ${collection.coins.length}`;
  $("#hud-lang").innerHTML = flagSvg(settings.lang);
  $("#hud-lang").setAttribute("aria-label", `${t("lang.title")}: ${languageName(settings.lang)}`);
  if (openStory) {
    const { sparkCount, max } = score(openStory);
    $("#book-sparks").textContent = t("book.sparks", { n: sparkCount, max });
    $("#book-prev").disabled = book?.isAtStart ?? true;
    $("#book-next").disabled = book?.isAtEnd ?? true;
  }
}

let toastTimer = 0;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), TOAST_MS);
}

function shake(el) {
  el?.classList.remove("shake");
  void el?.offsetWidth;
  el?.classList.add("shake");
}

// ---------------------------------------------------------------- daily videos + rarity ladder

const DAYS_KEY = "dykt-daily-videos-v1";
let watchDays = readDays();

function readDays() {
  try {
    return JSON.parse(localStorage.getItem(DAYS_KEY)) ?? emptyDays();
  } catch {
    return emptyDays();
  }
}

const mayWatch = (story) => canWatch(watchDays, todayKey(), story.id, settings.audience);

function countVideo(story) {
  watchDays = registerVideo(watchDays, todayKey(), story.id, settings.audience);
  try {
    localStorage.setItem(DAYS_KEY, JSON.stringify(watchDays));
  } catch {
    /* storage blocked: the limit still applies for this session */
  }
}

const leftToday = () => ({ n: videosLeft(watchDays, todayKey(), settings.audience), max: DAILY_VIDEOS[settings.audience] });

function showInventory() {
  const byId = (id) => stories.find((story) => story.id === id);
  openInventory($("#panel-layer"), {
    stories,
    cards: view().cards,
    explorer: settings.audience === "kids" ? explorer : null,
    onEquip: (itemId) => changeExplorer((state) => equip(state, itemId)).then(showInventory),
    audience: settings.audience,
    t,
    onWatch: (id) => watchStory(byId(id), { replay: true }),
    onShare: (id) => shareDiscovery(byId(id)),
    onSelect: () => sfx.unlock(),
    onRead: (id) => {
      if (book) closeBook();
      setTimeout(() => openBook(byId(id)), book ? 450 : 0);
    },
  });
}

// ---------------------------------------------------------------- settings

function applySettings(patch) {
  settings = { ...settings, ...patch, ...("name" in patch ? { name: cleanName(patch.name) } : {}) };
  store.saveSettings(settings);
  t = createTranslator(settings.lang);
  stories = localizeAll();
  applyStaticText();
  world.render(view(), stories, t);
  refreshCoins();
  if (patch.audience) {
    daxterAt = currentHouseIndex(stories, view());
    world.placeAtHouse(daxterAt);
  }
  if (openStory) reopenBook(openStory.id);
  install?.refresh();
  if (patch.lang) loadNameVoice(settings.lang);
  renderHome();
  updateHud();
}

// The language (or audience) can change while a book is open: re-open the
// same book in the new language, keeping the reader's progress.
function reopenBook(storyId) {
  narrator.stop();
  book?.destroy();
  openBook(stories.find((story) => story.id === storyId));
}

function showSettings() {
  openSettings($("#panel-layer"), {
    settings,
    t,
    onPick: (patch) => {
      applySettings(patch);
      showSettings();
    },
    muted: sfx.muted,
    onOpenLanguage: () => showLanguageSheet(showSettings),
    onToggleSound: () => {
      sfx.toggle();
      showSettings();
    },
    onExport: exportBackup,
    onImport: importBackup,
  });
}

// The one language control: the flag opens a sheet; `then` re-renders the
// screen that asked (start screen or Settings).
function showLanguageSheet(then) {
  openLanguageSheet($("#sheet-layer"), {
    current: settings.lang,
    t,
    onPick: (lang) => {
      sfx.spark();
      applySettings({ lang });
      then?.();
    },
  });
}

// ---------------------------------------------------------------- backup (this device only)

function exportBackup() {
  const backup = makeBackup({ collection, learning, settings, explorer }, nowIso());
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  link.download = `dexty-backup-${nowIso().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return t("backup.saved");
}

async function importBackup(file) {
  const result = parseBackup(await file.text(), STORIES.map((story) => story.card.id));
  if (!result.ok) return t("backup.bad");
  const persisted = store.replaceCollection(result.data.collection) && store.replaceLearning(result.data.learning) && store.replaceExplorer(result.data.explorer);
  explorer = result.data.explorer;
  applyOutfit();
  collection = result.data.collection;
  learning = result.data.learning;
  updateHud();
  if (!persisted) return t("storage.sessionOnly");
  if (result.data.settings) applySettings(normalizeSettings(result.data.settings, settings.lang));
  world.render(view(), stories, t);
  refreshCoins();
  const count = Object.values(result.data.collection.saved).reduce((n, cards) => n + Object.keys(cards).length, 0);
  return t("backup.restored", { n: count });
}

// ---------------------------------------------------------------- audience homes

// Adults get "Today's Discovery" instead of the game map; kids keep the map
// plus a labelled bar with direct Read / Watch buttons for the current story.
function renderHome() {
  const adults = settings.audience === "adults";
  document.body.classList.toggle("is-adults", adults);
  $("#adult-home").hidden = !adults;
  if (adults) {
    renderAdultHome($("#adult-home"), { stories, t, isSaved: (story) => isSaved(collection, "adults", story.card.id) });
    $("#kids-bar-host").innerHTML = "";
    return;
  }
  renderKidsBar($("#kids-bar-host"), { story: stories[currentHouseIndex(stories, view())], t });
}

function handleHomeAction(event) {
  const btn = event.target.closest("[data-home]");
  if (!btn) return;
  const story = stories.find((entry) => entry.id === btn.dataset.story);
  const action = btn.dataset.home;
  if (action === "collection") return showInventory();
  if (action === "mission") return showMission();
  if (!story) return;
  if (action === "read") return openBook(story);
  if (action === "watch") return watchStory(story);
  if (action === "save") saveDiscoveryCard(story).then(renderHome);
}

// ---------------------------------------------------------------- world

const world = createWorld($("#world"), {
  stories: STORIES,
  onHouse: (index) => handleHouse(index),
  onStep: () => sfx.step(),
  onCoin: (id) => {
    changeCollection((current) => withCoin(current, id));
    sfx.coin();
    bumpCoins();
  },
  onDaxterTap: () => {
    if (busy) return;
    sfx.spark();
    world.daxter.setState("cheer");
    setTimeout(() => world.daxter.setState("idle"), 900);
    world.daxter.say(quip("tap"), 6000);
    nudgeIdle();
  },
  onArrive: (index) => {
    daxterAt = index;
    const status = index >= 0 ? houseStatus(stories, view(), index) : "none";
    if (status === "current" || status === "done") world.daxter.say(t("walk.near"), 4000);
  },
  onEdge: () => world.daxter.say(quip("edge"), 4500),
});

// ---------------------------------------------------------------- Daxter chatter, coins, free walking

let lastQuip = "";
function quip(kind) {
  const lines = LOCALES[settings.lang]?.quips?.[kind] ?? LOCALES.en.quips[kind];
  const pool = lines.filter((line) => line !== lastQuip);
  lastQuip = pool[Math.floor(Math.random() * pool.length)] ?? lines[0];
  return lastQuip;
}

const IDLE_CHAT_MS = 16000;
let idleTimer = 0;
function nudgeIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const overlayOpen = book || !$("#panel-layer").hidden || !$("#start-layer").hidden || busy;
    if (!overlayOpen) world.daxter.say(quip("idle"), 6000);
    nudgeIdle();
  }, IDLE_CHAT_MS);
}

function refreshCoins() {
  world.setCoins(coinsOnRoad(stories, view().cards, collection.coins));
}

function bumpCoins() {
  const el = $("#hud-coins");
  el.textContent = `🪙 ${collection.coins.length}`;
  el.classList.remove("is-bumped");
  void el.offsetWidth;
  el.classList.add("is-bumped");
}

function walk(dir) {
  if (busy || book || !$("#start-layer").hidden) return;
  nudgeIdle();
  world.startMove(dir);
}

function enterNearestHouse() {
  const index = world.nearestHouse();
  if (index >= 0) handleHouse(index);
}

function nextStoryMessage(index) {
  const story = stories[index];
  if (story.comingSoon) {
    const link = `<a href="${CHANNEL_URL}" target="_blank" rel="noopener">${t("daxter.subscribe")}</a>`;
    return t("daxter.soon", { subscribe: link });
  }
  return t("daxter.glow", { title: story.title });
}

async function walkDaxter(index) {
  busy = true;
  await world.walkTo(index);
  daxterAt = index;
  busy = false;
}

async function handleHouse(index) {
  if (busy) return;
  const status = houseStatus(stories, view(), index);
  if (status === "locked") return world.daxter.say(t("daxter.locked"));
  if (status === "soon") {
    if (daxterAt !== index && index === currentHouseIndex(stories, view())) await walkDaxter(index);
    return world.daxter.say(nextStoryMessage(index), 7000);
  }
  if (daxterAt !== index) await walkDaxter(index);
  busy = true;
  world.daxter.setState("knock");
  world.daxter.hush();
  sfx.knock();
  world.houseEl(index)?.classList.add("is-opening");
  setTimeout(() => {
    world.daxter.setState("idle");
    busy = false;
    openBook(stories[index]);
  }, KNOCK_MS);
}

// ---------------------------------------------------------------- book

function faceContext(story, index) {
  const { sparkCount, max } = score(story);
  const s = session(story);
  return {
    story,
    session: s,
    index,
    t,
    sparkCount,
    maxSparks: max,
    rarity: cardStyle(story),
    playerName: settings.name,
    firstSeason: Boolean(view().cards[story.card.id]?.firstSeason),
    gate: { message: s.gateMessage },
  };
}

const visibleInstructions = () => book.visible().filter((i) => INSTRUCTION_FACES.has(currentFaces[i]?.type));

// On every level the narrator speaks each instruction page the first time it
// is shown (rules, mission, magic word, questions, card), even with Read aloud off.
function narrateInstructions() {
  if (reading || !book || !openStory) return;
  const fresh = visibleInstructions().filter((i) => !narratedFaces.has(i));
  if (fresh.length === 0) {
    if (visibleInstructions().length === 0) narrator.stop();
    return;
  }
  const ctx = { lang: settings.lang, audience: settings.audience, storyId: openStory.id };
  const chosen = narrator.available({ ...ctx, voice }) ? voice : voice === "male" ? "female" : "male";
  if (!narrator.available({ ...ctx, voice: chosen })) return;
  narratedFaces = new Set([...narratedFaces, ...fresh]);
  narrator.read(fresh.map((i) => narrationFor(currentFaces[i], openStory, session(openStory), t)), { ...ctx, voice: chosen });
}

function readVisiblePages() {
  narrateInstructions();
  if (!reading || !book || !openStory) return;
  const items = book.visible().map((i) => narrationFor(currentFaces[i], openStory, session(openStory), t));
  narrator.read(items, { lang: settings.lang, audience: settings.audience, storyId: openStory.id, voice });
}

function updateReadButtons() {
  const ctx = openStory && { lang: settings.lang, audience: settings.audience, storyId: openStory.id };
  const hasMale = ctx && narrator.available({ ...ctx, voice: "male" });
  const hasFemale = ctx && narrator.available({ ...ctx, voice: "female" });
  $("#book-read").hidden = !(hasMale || hasFemale);
  $("#book-voice").hidden = !(hasMale && hasFemale);
  if (!hasMale && hasFemale) voice = "female";
  if (hasMale && !hasFemale) voice = "male";
  // Icon + label; phones show the icon only, every button keeps a spoken name.
  const readLabel = reading ? t("book.stop") : t("book.read");
  $("#book-read").innerHTML = `<span class="ico" aria-hidden="true">${reading ? "🔊" : "🔈"}</span><span class="lbl">${readLabel.replace(/^\S+\s/, "")}</span>`;
  $("#book-read").setAttribute("aria-label", readLabel.replace(/^\S+\s/, ""));
  $("#book-read").setAttribute("aria-pressed", String(reading));
  const voiceName = voice === "female" ? "Jane" : "Brian";
  $("#book-voice").innerHTML = `<span class="ico" aria-hidden="true">🎙️</span><span class="lbl">${voiceName}</span>`;
  $("#book-voice").setAttribute("aria-label", `${t("book.voice")}: ${voiceName}`);
}

function openBook(story) {
  finishPendingClose();
  stopGreeting();
  openStory = story;
  narratedFaces = new Set();
  currentFaces = buildFaces(story);
  const layer = $("#book-layer");
  layer.hidden = false;
  requestAnimationFrame(() => layer.classList.add("is-open"));
  book = createBook($("#book-host"), {
    faces: currentFaces,
    renderFace: (face, i) => renderFace(face, faceContext(story, i)),
    isComplete: (face) => isFaceComplete(face, session(story)),
    onAction: (action, el) => handleBookAction(story, action, el),
    onBlocked: (face, faceEl) => {
      shake(faceEl);
      toast(t(BLOCKED_HINT[face.type] ?? "blocked.default"));
    },
    onFlip: () => sfx.flip(),
    onChange: () => {
      updateHud();
      readVisiblePages();
    },
  });
  updateHud();
  updateReadButtons();
  readVisiblePages();
}

// Closing animates for BOOK_CLOSE_MS, then tears the book down. The teardown
// is held in `pendingClose` so opening another book first finishes it: a
// book opened during the animation can never be destroyed by the old close.
const BOOK_CLOSE_MS = 400;
let pendingClose = null;

function finishPendingClose() {
  if (!pendingClose) return;
  clearTimeout(pendingClose.timer);
  pendingClose.run();
}

function closeBook({ advance = false } = {}) {
  finishPendingClose();
  narrator.stop();
  const layer = $("#book-layer");
  const closing = book;
  layer.classList.remove("is-open");
  const run = () => {
    pendingClose = null;
    layer.hidden = true;
    closing?.destroy();
    if (book === closing) {
      book = null;
      openStory = null;
    }
    world.render(view(), stories, t);
    refreshCoins();
    renderHome();
    if (advance) celebrateAndMoveOn();
  };
  pendingClose = { run, timer: setTimeout(run, BOOK_CLOSE_MS) };
}

async function celebrateAndMoveOn() {
  world.daxter.setState("cheer");
  world.daxter.say(withName(t("daxter.cheer")), CHEER_MS + 400);
  await new Promise((r) => setTimeout(r, CHEER_MS));
  world.daxter.setState("idle");
  const next = currentHouseIndex(stories, view());
  if (next !== daxterAt) await walkDaxter(next);
  world.daxter.say(nextStoryMessage(next), 8000);
}

function refreshBook() {
  book?.refresh();
  updateHud();
}

// The magic word is a bonus surprise: it breaks the seal for a celebration and
// a badge in the library, never for points or a card.
function unlockGate(story) {
  setSession(story, { gateOpen: true, gateMessage: "" });
  narratedFaces = new Set([...narratedFaces].filter((i) => currentFaces[i]?.type !== "gate"));
  changeLearning((current) => recordBonusWord(current, story.id, nowIso()));
  sfx.seal();
  toast(t("gate.toast"));
  refreshBook();
}

// Cards are saved freely: no playback, quiz or magic word is needed (master
// plan §3). Saving shows the card and drops coins on the road; it never
// starts the video.
let savingCard = false;
async function saveDiscoveryCard(story) {
  if (savingCard || isSaved(collection, settings.audience, story.card.id)) return;
  savingCard = true;
  try {
    await revealCard($("#reveal-layer"), story.card, cardStyle(story), sfx, { t });
    setSession(story, { cardClaimed: true });
    const persisted = await changeCollection((current) => saveCard(current, settings.audience, story.card.id, nowIso()));
    refreshBook();
    // Save only saves: watching stays a separate, explicit choice (audit stage 1).
    if (persisted) toast(t("coins.dropped", { n: COINS_PER_CARD }));
  } finally {
    savingCard = false;
  }
}

// Share a public, account-free discovery page (no personal state in the URL).
async function shareDiscovery(story) {
  const slug = story?.publication?.slug;
  if (!slug) return;
  const url = `${location.origin}/e/${slug}/`;
  try {
    if (navigator.share) {
      await navigator.share({ title: story.title, text: story.teaser, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast(t("share.copied"));
  } catch (error) {
    if (error?.name === "AbortError") return;
    toast(t("share.failed", { url }));
  }
}

async function handleBookAction(story, action, el) {
  const s = session(story);
  if (action === "spark") {
    const id = el.dataset.spark;
    if (s.sparks.has(id)) return;
    setSession(story, { sparks: new Set([...s.sparks, id]) });
    sfx.spark();
    return refreshBook();
  }
  if (action === "answer") return answerQuiz(story, el.dataset.quiz, Number(el.dataset.choice));
  if (action === "listen") return watchStory(story);
  if (action === "secret") {
    const word = new FormData(el).get("secret");
    // The magic word is a bonus: the word from either audience's episode works.
    const base = STORIES.find((entry) => entry.id === story.id);
    const accepted = typeof base?.secretHash === "object" ? Object.values(base.secretHash) : [story.secretHash];
    if (await verifySecret(word, accepted)) return unlockGate(story);
    setSession(story, { gateMessage: "gate.wrong" });
    sfx.wrong();
    refreshBook();
    return shake(document.querySelector(".gate-page"));
  }
  if (action === "reveal") return saveDiscoveryCard(story);
  if (action === "continue") return closeBook({ advance: true });
  if (action === "inventory") return showInventory();
}

// Every video plays inside the game, and watching is never measured or
// rewarded. The daily limit (kids 3, adults 5) applies to new episodes; a
// story whose card is already won (`replay`) can always be watched again.
function watchStory(story, { replay = false } = {}) {
  if (!replay && story.youtubeId && !mayWatch(story)) {
    toast(t("listen.limit"));
    return world.daxter.say(t("listen.limit"), 7000);
  }
  if (!replay && story.youtubeId) countVideo(story);
  openListening($("#listen-layer"), story, {
    channelUrl: CHANNEL_URL,
    t,
    left: leftToday(),
    replay,
  });
}

function answerQuiz(story, quizId, choice) {
  const page = story.pages.find((p) => p.id === quizId);
  const current = session(story).quiz[quizId] ?? { picked: [], solved: false };
  if (current.solved || current.picked.includes(choice)) return;
  const solved = choice === page.answer;
  setSession(story, { quiz: { ...session(story).quiz, [quizId]: { picked: [...current.picked, choice], solved } } });
  if (solved) sfx.right();
  else sfx.wrong();
  refreshBook();
  if (!solved) shake(document.querySelector(`[data-quiz="${quizId}"][data-choice="${choice}"]`));
  if (solved) recordQuizIfDone(story);
}

// Optional practice: once every question is solved, keep a private note of
// how many were right first time. Never ranked, never needed for a card.
function recordQuizIfDone(story) {
  const quizPages = story.pages.filter((p) => p.type === "quiz");
  const answers = session(story).quiz;
  if (!quizPages.every((p) => answers[p.id]?.solved)) return;
  const correct = quizPages.filter((p) => answers[p.id].picked.length === 1).length;
  changeLearning((current) => recordQuiz(current, `${story.id}:${settings.audience}`, { answered: quizPages.length, correct }, nowIso()));
}

// ---------------------------------------------------------------- start screen

function renderStartPickers() {
  $("#start-pickers").innerHTML = pickersMarkup(settings, t);
  const returning = Object.keys(view().cards).length > 0;
  $("#start-go").textContent = returning ? t("start.continue") : t("start.go");
}

// ---------------------------------------------------------------- the child's name
// Dexter uses the child's optional name in his words (kept on this device only).
const withName = (text) => personalize(text, settings.name, { words: t("name.explorerWords"), hello: t("name.hello") });

// ---------------------------------------------------------------- Daxter's greeting

const VISITS_KEY = "dyk-visits";
const GREETING_MAX_MS = 18000; // name clip + greeting
let greetingAudio = null;

function nextVisit() {
  let visits = 0;
  try {
    visits = Number(localStorage.getItem(VISITS_KEY)) || 0;
    localStorage.setItem(VISITS_KEY, String(visits + 1));
  } catch {
    /* storage blocked: Daxter just says the welcome */
  }
  return visits;
}

function stopGreeting() {
  greetingAudio?.pause();
  greetingAudio = null;
}

// Every time the game opens Daxter talks to the player in their language: a
// welcome the first time, a different "welcome back" after that. The tap on
// Start is what lets the phone play sound. Resolves when he has finished.
function greetPlayer() {
  const key = greetingKey(nextVisit());
  const text = withName(t(`daxter.${key}`));
  world.daxter.say(text, Math.min(GREETING_MAX_MS, 2500 + text.length * 70));
  if (sfx.muted) return new Promise((r) => setTimeout(r, 2500));
  stopGreeting();
  const voice = nameVoice[settings.lang];
  const clips = greetingClips({
    lang: settings.lang,
    key,
    name: settings.name,
    voiced: { [settings.lang]: voice?.names },
    hasBody: (lang, greeting) => Boolean(nameVoice[lang]?.bodies.has(greeting)),
  });
  return playInOrder(clips);
}

// Plays clips one after another ("Hi, Sienna!" then the greeting). The first
// starts inside the Start tap, which is what lets a phone play sound.
function playInOrder(paths) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, GREETING_MAX_MS);
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    const playAt = (index) => {
      if (index >= paths.length || (index > 0 && !greetingAudio)) return finish();
      const audio = new Audio(paths[index]);
      greetingAudio = audio;
      audio.addEventListener("ended", () => playAt(index + 1), { once: true });
      audio.addEventListener("error", () => playAt(index + 1), { once: true });
      audio.play().catch(() => playAt(index + 1));
    };
    playAt(0);
  });
}

// Which names Dexter can say, per language (generic recordings, see
// tools/make-name-voice.mjs). Loaded ahead of the Start tap.
const nameVoice = {};
async function loadNameVoice(lang) {
  if (nameVoice[lang]) return;
  try {
    const res = await fetch(nameIndexPath(lang));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const index = await res.json();
    nameVoice[lang] = { names: new Map(Object.entries(index.names ?? {})), bodies: new Set(index.bodies ?? []) };
  } catch {
    nameVoice[lang] = { names: new Map(), bodies: new Set() }; // no recordings yet: the normal greeting plays
  }
}

function startScreen() {
  $("#start-daxter").innerHTML = DAXTER_SVG;
  renderStartPickers();
  $("#start-pickers").addEventListener("click", (event) => {
    if (event.target.closest("[data-open-lang]")) return showLanguageSheet(renderStartPickers);
    if (event.target.closest("[data-name]")) return;
    const btn = event.target.closest("[data-audience]");
    if (!btn) return;
    sfx.spark();
    applySettings({ audience: btn.dataset.audience });
    renderStartPickers();
  });
  $("#start-pickers").addEventListener("change", (event) => {
    if (event.target.matches("[data-name]")) applySettings({ name: event.target.value });
  });
  $("#start-go").addEventListener(
    "click",
    async () => {
      const typed = $("#start-pickers [data-name]")?.value;
      if (typed !== undefined && cleanName(typed) !== settings.name) applySettings({ name: typed });
      sfx.right();
      applySettings({ chosen: true });
      $("#start-layer").classList.add("is-leaving");
      setTimeout(() => ($("#start-layer").hidden = true), 600);
      const target = currentHouseIndex(stories, view());
      const spoken = greetPlayer();
      await new Promise((r) => setTimeout(r, 1200));
      await walkDaxter(target);
      await spoken;
      world.daxter.say(nextStoryMessage(target), 8000);
      const linked = stories.find((story) => story.id === linkedStoryId && !story.comingSoon);
      if (linked) openBook(linked);
    },
    { once: true },
  );
}

$("#hud-inventory").addEventListener("click", showInventory);
// The leaderboard is retired from the core journey (master plan §14); records are kept server-side.
$("#hud-lang").addEventListener("click", () => showLanguageSheet());
$("#hud-settings").addEventListener("click", showSettings);
$("#book-close").addEventListener("click", () => closeBook());
// Bigger book text, remembered on this device (audit 05: ~13px on small phones).
const TEXT_KEY = "dexty-large-text";
function applyTextSize(large) {
  $("#book-layer").classList.toggle("is-large-text", large);
  $("#book-text").setAttribute("aria-pressed", String(large));
  try {
    localStorage.setItem(TEXT_KEY, large ? "1" : "0");
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}
applyTextSize((() => {
  try {
    return localStorage.getItem(TEXT_KEY) === "1";
  } catch {
    return false;
  }
})());
$("#book-text").addEventListener("click", () => applyTextSize(!$("#book-layer").classList.contains("is-large-text")));
$("#book-read").addEventListener("click", () => {
  reading = !reading;
  if (reading) readVisiblePages();
  else narrator.stop();
  updateReadButtons();
});
$("#book-voice").addEventListener("click", () => {
  voice = voice === "male" ? "female" : "male";
  try {
    localStorage.setItem(VOICE_KEY, voice);
  } catch {
    /* storage blocked: keep the choice for this session */
  }
  updateReadButtons();
  readVisiblePages();
});
$("#book-prev").addEventListener("click", () => book?.go(-1));
$("#book-next").addEventListener("click", () => book?.go(1));
[["#walk-left", -1], ["#walk-right", 1]].forEach(([sel, dir]) => {
  const btn = $(sel);
  btn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    btn.setPointerCapture?.(event.pointerId);
    walk(dir);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => btn.addEventListener(type, () => world.stopMove()));
});
$("#walk-enter").addEventListener("click", enterNearestHouse);
document.addEventListener("keydown", (event) => {
  if (book || event.target.closest?.("input") || event.repeat) return;
  if (event.key === "ArrowLeft" || event.key === "a") walk(-1);
  if (event.key === "ArrowRight" || event.key === "d") walk(1);
  if (event.key === "ArrowUp" || event.key === "Enter") enterNearestHouse();
});
document.addEventListener("keyup", (event) => {
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key)) world.stopMove();
});
document.addEventListener("keydown", (event) => {
  if (!book || event.target.closest?.("input")) return;
  if (event.key === "ArrowRight") book.go(1);
  if (event.key === "ArrowLeft") book.go(-1);
  if (event.key === "Escape") closeBook();
});

store.saveProfile(profile);
applyStaticText();
world.render(view(), stories, t);
  refreshCoins();
world.placeAtStart();
updateHud();
startScreen();
// Another tab (or a discovery page) saved something: show it here too.
window.addEventListener("storage", (event) => {
  if (event.key && !event.key.startsWith("dexty-")) return;
  ({ collection, learning } = store.loadCollection(nowIso()));
  explorer = store.loadExplorer();
  applyOutfit();
  world.render(view(), stories, t);
  refreshCoins();
  renderHome();
  updateHud();
});
applyOutfit();
loadNameVoice(settings.lang);
setupModalFocus();
$("#adult-home").addEventListener("click", handleHomeAction);
$("#kids-bar-host").addEventListener("click", handleHomeAction);
renderHome();
install = setupInstall($("#install-app"), $("#install-ios"), { t, toast });
nudgeIdle();
