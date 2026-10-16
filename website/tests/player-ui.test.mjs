import { test } from "node:test";
import assert from "node:assert/strict";

import { createSubtitles } from "../js/ui/player-subs.js";
import { createDub } from "../js/ui/player-dub.js";

const VTT = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nSalut\n\n00:00:03.000 --> 00:00:04.000\n<b>Hei</b>\n";
const fakeOverlay = () => ({ textContent: "", hidden: true, lang: "" });

test("subtitles: select fetches once per file, update shows the cue with textContent, gaps hide the box", async () => {
  // Arrange
  const overlay = fakeOverlay();
  const fetched = [];
  const subs = createSubtitles(overlay, { fetchText: async (url) => (fetched.push(url), VTT) });
  // Act
  const ok = await subs.select("ro", "/assets/captions/food/ro.vtt");
  subs.update(1.5);
  const during = { text: overlay.textContent, hidden: overlay.hidden };
  subs.update(2.5);
  const gap = { text: overlay.textContent, hidden: overlay.hidden };
  subs.update(3.5);
  await subs.select("ro", "/assets/captions/food/ro.vtt");
  // Assert
  assert.equal(ok, true);
  assert.equal(overlay.lang, "ro");
  assert.deepEqual(during, { text: "Salut", hidden: false });
  assert.deepEqual(gap, { text: "", hidden: true });
  assert.deepEqual(fetched, ["/assets/captions/food/ro.vtt"], "second selection reuses the parsed file");
});

test("subtitles: a failed fetch resolves false, hides the box, never throws, and can be retried", async () => {
  // Arrange
  const overlay = fakeOverlay();
  let fail = true;
  const subs = createSubtitles(overlay, { fetchText: async () => { if (fail) throw new Error("HTTP 404"); return VTT; } });
  // Act
  const first = await subs.select("fr", "/assets/captions/food/fr.vtt");
  subs.update(1.5);
  fail = false;
  const second = await subs.select("fr", "/assets/captions/food/fr.vtt");
  subs.update(1.5);
  // Assert
  assert.equal(first, false);
  assert.equal(second, true);
  assert.equal(overlay.textContent, "Salut");
});

test("subtitles: clear empties the box, and a superseded selection does not overwrite the newer one", async () => {
  // Arrange
  const overlay = fakeOverlay();
  const releases = {};
  const subs = createSubtitles(overlay, { fetchText: (url) => new Promise((resolve) => { releases[url] = () => resolve(url.includes("ro") ? VTT : VTT.replace("Salut", "Bonjour")); }) });
  // Act
  const slow = subs.select("ro", "/ro.vtt");
  const fast = subs.select("fr", "/fr.vtt");
  releases["/fr.vtt"]();
  await fast;
  releases["/ro.vtt"]();
  await slow;
  subs.update(1.5);
  const winner = overlay.textContent;
  subs.clear();
  // Assert
  assert.equal(winner, "Bonjour");
  assert.equal(overlay.textContent, "");
  assert.equal(overlay.hidden, true);
});

function fakeAudio({ rejectPlay = false } = {}) {
  const audio = {
    preload: "", src: "", currentTime: 0, paused: true, playbackRate: 1, readyState: 4, loads: 0, plays: 0,
    play() { audio.plays += 1; if (rejectPlay) return Promise.reject(new Error("NotAllowedError")); audio.paused = false; return Promise.resolve(); },
    pause() { audio.paused = true; },
    removeAttribute(name) { if (name === "src") audio.src = ""; },
    load() { audio.loads += 1; },
  };
  return audio;
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("dub: the audio element is created lazily, with preload none, only when a source is set", () => {
  // Arrange
  let created = 0;
  const audio = fakeAudio();
  const dub = createDub({ createAudio: () => (created += 1, audio) });
  // Act
  dub.setSource(null);
  const before = created;
  dub.setSource("https://a.public.blob.vercel-storage.com/x/food/ro.m4a");
  dub.setSource("https://a.public.blob.vercel-storage.com/x/food/ro.m4a");
  // Assert
  assert.equal(before, 0);
  assert.equal(created, 1);
  assert.equal(audio.preload, "none");
  assert.equal(audio.src, "https://a.public.blob.vercel-storage.com/x/food/ro.m4a");
});

test("dub: sync starts the audio at the video time while playing, follows drift and stops when paused", async () => {
  // Arrange
  const audio = fakeAudio();
  const dub = createDub({ createAudio: () => audio });
  dub.setSource("https://a.public.blob.vercel-storage.com/x/food/ro.m4a");
  // Act
  dub.sync({ ytState: 1, ytTime: 12, wantAudio: true, now: 1000 });
  await settle();
  const started = { time: audio.currentTime, paused: audio.paused };
  audio.currentTime = 12.2;
  dub.sync({ ytState: 1, ytTime: 12.3, wantAudio: true, now: 1100 });
  const nudged = audio.playbackRate;
  dub.sync({ ytState: 1, ytTime: 60, wantAudio: true, now: 1200 });
  const afterScrub = audio.currentTime;
  dub.sync({ ytState: 2, ytTime: 60, wantAudio: true, now: 1300 });
  // Assert
  assert.deepEqual(started, { time: 12, paused: false });
  assert.ok(nudged > 1 && nudged <= 1.03, `nudged to ${nudged}`);
  assert.equal(afterScrub, 60, "a scrub on the video re-syncs at once");
  assert.equal(audio.paused, true);
  assert.equal(audio.playbackRate, 1);
});

test("dub: a refused play() is reported once, not retried every tick, and the tap button resumes it", async () => {
  // Arrange
  const blocked = [];
  let reject = true;
  const audio = fakeAudio({ rejectPlay: true });
  const realPlay = audio.play;
  audio.play = () => (reject ? realPlay() : (audio.plays += 1, audio.paused = false, Promise.resolve()));
  const dub = createDub({ createAudio: () => audio, onBlocked: (value) => blocked.push(value) });
  dub.setSource("https://a.public.blob.vercel-storage.com/x/food/ro.m4a");
  // Act
  dub.sync({ ytState: 1, ytTime: 5, wantAudio: true, now: 1000 });
  await settle();
  dub.sync({ ytState: 1, ytTime: 5.1, wantAudio: true, now: 1100 });
  dub.sync({ ytState: 1, ytTime: 5.2, wantAudio: true, now: 1200 });
  await settle();
  const triesWhileBlocked = audio.plays;
  reject = false;
  dub.resume(7);
  await settle();
  // Assert
  assert.equal(triesWhileBlocked, 1);
  assert.deepEqual(blocked, [true, false]);
  assert.equal(audio.currentTime, 7);
  assert.equal(audio.paused, false);
});

test("dub: stop pauses, resets the speed and releases the file; sync without a source does nothing", () => {
  // Arrange
  const audio = fakeAudio();
  const dub = createDub({ createAudio: () => audio });
  dub.sync({ ytState: 1, ytTime: 1, wantAudio: true, now: 1 });
  dub.resume(3);
  dub.setSource("https://a.public.blob.vercel-storage.com/x/food/ro.m4a");
  audio.playbackRate = 1.02;
  audio.paused = false;
  // Act
  dub.stop();
  // Assert
  assert.equal(audio.paused, true);
  assert.equal(audio.playbackRate, 1);
  assert.equal(audio.src, "");
  assert.equal(audio.loads, 1);
  dub.sync({ ytState: 1, ytTime: 9, wantAudio: true, now: 2 });
  assert.equal(audio.plays, 0);
  createDub().stop();
});
