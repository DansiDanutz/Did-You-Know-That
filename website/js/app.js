import { STORIES, CHANNEL_URL } from "./data/stories.js";
import { LOCALES, createTranslator, detectLanguage } from "./i18n/index.js";
import { localizeStory } from "./lib/localize.js";
import { createStore, withCard, withGateUnlocked, cardsFor } from "./lib/storage.js";
import { quizPoints, maxSparks } from "./lib/scoring.js";
import { cardPoints, validateNickname } from "./lib/points.js";
import { verifySecret } from "./lib/secret.js";
import { emptyDays, todayKey, canWatch, registerVideo, videosLeft, slotFor, rarityForSlot, DAILY_VIDEOS, RARITY_LADDER } from "./lib/daily-limit.js";
import { currentHouseIndex, houseStatus } from "./lib/journey.js";
import { fetchLeaderboard, submitScore } from "./api.js";
import { createWorld } from "./ui/world.js";
import { createBook } from "./ui/book.js";
import { buildFaces, renderFace, isFaceComplete, BLOCKED_HINT } from "./ui/pages.js";
import { openListening } from "./ui/gate.js";
import { flagSvg } from "./ui/flags.js";
import { setupInstall } from "./ui/install.js";
import { greetingKey, greetingAudioPath } from "./lib/greeting.js";
import { revealCard } from "./ui/card.js";
import { pickersMarkup, openInventory, openLeaderboard, openSettings } from "./ui/panels.js";
import { DAXTER_SVG } from "./ui/character.js";
import { createSfx } from "./ui/sfx.js";
import { createNarrator } from "./ui/narrator.js";
import { coinsOnRoad, withCoinCollected, coinTotal, COINS_PER_RARITY } from "./lib/coins.js";
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
let profile = store.loadProfile(() => crypto.randomUUID());
let progress = store.load();
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

const view = () => ({ cards: cardsFor(progress, settings.audience) });

// ---------------------------------------------------------------- session state

const sessionKey = (story) => `${story.id}:${settings.audience}`;

function session(story) {
  return (
    sessions.get(sessionKey(story)) ?? {
      sparks: new Set(),
      quiz: {},
      gateOpen: Boolean(progress.gates[story.id]),
      cardClaimed: false,
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
  const slot = slotFor(watchDays, todayKey(), story.id, settings.audience);
  const rarity = rarityForSlot(watchDays, todayKey(), story.id, settings.audience);
  return { sparkCount, max, rarity, slot, points: cardPoints({ rarity, sparks: sparkCount, slot }, settings.audience) };
}

function save(next) {
  progress = next;
  store.save(progress);
  updateHud();
}

// ---------------------------------------------------------------- text + HUD

function applyStaticText() {
  document.documentElement.lang = settings.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
}

function updateHud() {
  const owned = Object.keys(cardsFor(progress, settings.audience)).length;
  $("#hud-cards").textContent = `${owned}/${STORIES.length}`;
  $("#hud-sound").textContent = sfx.muted ? "🔇" : "🔊";
  $("#hud-coins").textContent = `🪙 ${coinTotal(progress)}`;
  $("#hud-lang").innerHTML = `${flagSvg(settings.lang)} ${settings.lang.toUpperCase()} · ${settings.audience === "kids" ? "🧒" : "🎓"}`;
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

function nextRungMessage() {
  const { n } = leftToday();
  if (n === 0) return t("listen.limit");
  const rung = RARITY_LADDER[settings.audience][DAILY_VIDEOS[settings.audience] - n];
  return t("ladder.next", { rarity: t(`rarity.${rung}`) });
}

// ---------------------------------------------------------------- leaderboard

async function pushScore() {
  if (!profile.nickname) return null;
  const result = await submitScore({ ...profile, audience: settings.audience, cards: cardsFor(progress, settings.audience) });
  return result.ok ? result.data : null;
}

async function joinLeaderboard(raw) {
  const nick = validateNickname(raw);
  if (!nick.ok) return { ok: false, message: t("lb.badNick") };
  profile = { ...profile, nickname: nick.value };
  store.saveProfile(profile);
  const placed = await pushScore();
  if (!placed) return { ok: false, message: t("lb.offline") };
  return { ok: true, message: t("lb.climbed", { rank: placed.rank }) };
}

function showLeaderboard() {
  openLeaderboard($("#panel-layer"), {
    audience: settings.audience,
    profile,
    t,
    load: (board) => fetchLeaderboard(board, profile.playerId),
    join: joinLeaderboard,
  });
}

function showInventory() {
  const byId = (id) => stories.find((story) => story.id === id);
  openInventory($("#panel-layer"), {
    stories,
    cards: cardsFor(progress, settings.audience),
    audience: settings.audience,
    t,
    onWatch: (id) => watchStory(byId(id), { replay: true }),
    onSelect: () => sfx.unlock(),
    onRead: (id) => {
      if (book) closeBook();
      setTimeout(() => openBook(byId(id)), book ? 450 : 0);
    },
  });
}

// ---------------------------------------------------------------- settings

function applySettings(patch) {
  settings = { ...settings, ...patch };
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
  });
}

// ---------------------------------------------------------------- world

const world = createWorld($("#world"), {
  stories: STORIES,
  onHouse: (index) => handleHouse(index),
  onStep: () => sfx.step(),
  onCoin: (id) => {
    save(withCoinCollected(progress, id));
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
  world.setCoins(coinsOnRoad(stories, cardsFor(progress, settings.audience), progress.coins));
}

function bumpCoins() {
  const el = $("#hud-coins");
  el.textContent = `🪙 ${coinTotal(progress)}`;
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
  const { sparkCount, max, rarity, points } = score(story);
  const s = session(story);
  return {
    story,
    session: s,
    index,
    t,
    sparkCount,
    maxSparks: max,
    rarity,
    points,
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
  $("#book-read").textContent = reading ? t("book.stop") : t("book.read");
  $("#book-read").setAttribute("aria-pressed", String(reading));
  $("#book-voice").textContent = voice === "female" ? "🎙️ Jane" : "🎙️ Brian";
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
    if (advance) celebrateAndMoveOn();
  };
  pendingClose = { run, timer: setTimeout(run, BOOK_CLOSE_MS) };
}

async function celebrateAndMoveOn() {
  world.daxter.setState("cheer");
  world.daxter.say(t("daxter.cheer"), CHEER_MS + 400);
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
  save(withGateUnlocked(progress, story.id));
  sfx.seal();
  toast(t("gate.toast"));
  refreshBook();
}

async function claimCard(story) {
  if (!mayWatch(story)) return toast(t("listen.limit"));
  countVideo(story);
  const { rarity, sparkCount, slot, points } = score(story);
  await revealCard($("#reveal-layer"), story.card, rarity, sfx, { t, points });
  setSession(story, { cardClaimed: true });
  save(withCard(progress, settings.audience, story.card.id, { rarity, sparks: sparkCount, slot }, Date.now()));
  refreshBook();
  toast(`${nextRungMessage()}  ${t("coins.dropped", { n: COINS_PER_RARITY[rarity] })}`);
  const placed = await pushScore();
  if (placed) setTimeout(() => toast(t("lb.climbed", { rank: placed.rank })), 3000);
  // The card is won: now the episode plays right here as the celebration.
  if (story.youtubeId) watchStory(story, { replay: true });
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
  if (action === "reveal") return claimCard(story);
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
}

// ---------------------------------------------------------------- start screen

function renderStartPickers() {
  $("#start-pickers").innerHTML = pickersMarkup(settings, t);
  const returning = Object.keys(cardsFor(progress, settings.audience)).length > 0;
  $("#start-go").textContent = returning ? t("start.continue") : t("start.go");
}

// ---------------------------------------------------------------- Daxter's greeting

const VISITS_KEY = "dyk-visits";
const GREETING_MAX_MS = 16000;
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
  const text = t(`daxter.${key}`);
  world.daxter.say(text, Math.min(GREETING_MAX_MS, 2500 + text.length * 70));
  if (sfx.muted) return new Promise((r) => setTimeout(r, 2500));
  stopGreeting();
  const audio = new Audio(greetingAudioPath(settings.lang, key));
  greetingAudio = audio;
  return new Promise((resolve) => {
    const done = () => resolve();
    audio.addEventListener("ended", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    setTimeout(done, GREETING_MAX_MS);
    audio.play().catch(done);
  });
}

function startScreen() {
  $("#start-daxter").innerHTML = DAXTER_SVG;
  renderStartPickers();
  $("#start-pickers").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-lang], [data-audience]");
    if (!btn) return;
    sfx.spark();
    applySettings(btn.dataset.lang ? { lang: btn.dataset.lang } : { audience: btn.dataset.audience });
    renderStartPickers();
  });
  $("#start-go").addEventListener(
    "click",
    async () => {
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
    },
    { once: true },
  );
}

$("#hud-inventory").addEventListener("click", showInventory);
$("#hud-leaderboard").addEventListener("click", showLeaderboard);
$("#hud-lang").addEventListener("click", showSettings);
$("#hud-sound").addEventListener("click", () => {
  sfx.toggle();
  updateHud();
});
$("#book-close").addEventListener("click", () => closeBook());
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
install = setupInstall($("#install-app"), $("#install-ios"), { t, toast });
nudgeIdle();
